import {
  DataUtils,
  FloatType,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  Vector4,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer
} from "three"
import { AtmosphereProfile } from "../engine/atmosphere/AtmosphereProfile.js"
import { VisibleSpectrum } from "../engine/atmosphere/Spectrum.js"

/**
 * The tables a physically scattered sky is drawn from, computed on the GPU — the same formulas as
 * SkyScattering, which is the reference they are checked against, in GLSL.
 *
 * Three tables, and they change at three very different rates:
 *
 * - TRANSMITTANCE (256 × 64) and MULTIPLE SCATTERING (64 × 64) depend on the air alone: its haze and
 *   its ozone. Built once per atmosphere, which is to say once per recording or weather change. The
 *   second is the expensive one — 1 024 directions marched from every texel — so it is built a few
 *   rows per frame against a time budget, the way the Milky Way's maps are.
 * - The SKY VIEW (192 × 108) is the whole sky seen from the witness, for the Sun where it stands and
 *   separately for the Moon. Rebuilt whenever either moves or the witness climbs: a single cheap draw.
 *
 * Sixty-four rows and columns are not a matter of taste: measured on the reference, with 32 the zenith
 * of a Sun ten degrees down came out more than half a magnitude too dark. Sixteen directions a side
 * against thirty-two changed it by a tenth, and cost four times as much.
 *
 * Fifteen wavelengths travel in four RGBA targets, the sixteenth channel empty. The transmittance is
 * kept as OPTICAL DEPTH in half floats, read through the hardware's own bilinear filter: smooth, so it
 * interpolates well, and a single lookup where fetching four float texels by hand cost a sixteenth of
 * every step (the first version took 67 seconds to build). The multiple scattering must stay FLOAT:
 * in deep twilight it is a billionth of the day's, below what a half float can hold, so it is fetched
 * by hand — float textures have no guaranteed filtering. A device without float render targets gets
 * no tables at all, and the scene keeps its old gradient (see `supported`).
 */
export class AtmosphereTables {
  static readonly TRANSMITTANCE_WIDTH = 256
  static readonly TRANSMITTANCE_HEIGHT = 64
  static readonly MULTIPLE_SIZE = 64
  static readonly MULTIPLE_DIRECTIONS = 16
  static readonly SKY_VIEW_WIDTH = 192
  static readonly SKY_VIEW_HEIGHT = 108
  static readonly STEPS = 40
  static readonly MULTIPLE_STEPS = 20
  static readonly GROUND_ALBEDO = 0.3

  readonly supported: boolean
  private readonly renderer: WebGLRenderer
  private readonly transmittance: WebGLRenderTarget
  private readonly multiple: WebGLRenderTarget
  private readonly sunView: WebGLRenderTarget
  private readonly moonView: WebGLRenderTarget
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly quad: Mesh
  private readonly transmittanceMaterial: RawShaderMaterial
  private readonly multipleMaterial: RawShaderMaterial
  private readonly skyViewMaterial: RawShaderMaterial
  private transmittanceReady = false
  private multipleRows = 0
  private multipleColumn = 0
  private mediumKey = ""
  /** Texels of the multiple-scattering table per draw. */
  static readonly MULTIPLE_BLOCK = 16

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
    this.supported = renderer.capabilities.isWebGL2 && renderer.extensions.has("EXT_color_buffer_float")
    this.transmittance = new WebGLRenderTarget(AtmosphereTables.TRANSMITTANCE_WIDTH, AtmosphereTables.TRANSMITTANCE_HEIGHT, {
      count: 4,
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false
    })
    this.multiple = new WebGLRenderTarget(AtmosphereTables.MULTIPLE_SIZE, AtmosphereTables.MULTIPLE_SIZE, {
      count: 4,
      type: FloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false
    })
    const view = () =>
      new WebGLRenderTarget(AtmosphereTables.SKY_VIEW_WIDTH, AtmosphereTables.SKY_VIEW_HEIGHT, {
        type: FloatType,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false
      })
    this.sunView = view()
    this.moonView = view()
    const uniforms = AtmosphereTables.mediumUniforms()
    const tables = {
      uT0: { value: this.transmittance.textures[0] },
      uT1: { value: this.transmittance.textures[1] },
      uT2: { value: this.transmittance.textures[2] },
      uT3: { value: this.transmittance.textures[3] },
      uM0: { value: this.multiple.textures[0] },
      uM1: { value: this.multiple.textures[1] },
      uM2: { value: this.multiple.textures[2] },
      uM3: { value: this.multiple.textures[3] }
    }
    const material = (fragmentShader: string, extra: Record<string, { value: unknown }> = {}) =>
      new RawShaderMaterial({
        glslVersion: GLSL3,
        uniforms: { ...uniforms, ...tables, ...extra },
        vertexShader: AtmosphereTables.VERTEX,
        fragmentShader,
        depthTest: false,
        depthWrite: false
      })
    this.transmittanceMaterial = material(AtmosphereTables.TRANSMITTANCE_FRAGMENT)
    this.multipleMaterial = material(AtmosphereTables.MULTIPLE_FRAGMENT)
    this.skyViewMaterial = material(AtmosphereTables.SKY_VIEW_FRAGMENT, {
      uObserverRadius: { value: AtmosphereProfile.GROUND_RADIUS_M + 2 },
      uSourceMu: { value: 1 }
    })
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.transmittanceMaterial)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  get transmittanceTextures(): Texture[] {
    return this.transmittance.textures
  }

  /** The sky as seen from the witness for a Sun of the real solar spectrum and irradiance: rgb = CIE
   * XYZ in cd/m², alpha = scotopic luminance in scotopic cd/m². */
  get sunViewTexture(): Texture {
    return this.sunView.texture
  }

  /** The same for a source in the Moon's direction, still per unit of the SOLAR irradiance: scale
   * by how much fainter the Moon is. */
  get moonViewTexture(): Texture {
    return this.moonView.texture
  }

  /** Whether both air-only tables are complete and the sky views can be drawn from them. */
  get ready(): boolean {
    return this.supported && this.transmittanceReady && this.multipleRows >= AtmosphereTables.MULTIPLE_SIZE
  }

  /** Changes the air. Only a real change starts the tables over. */
  setMedium(profile: AtmosphereProfile): void {
    const key = [profile.rayleighScattering, profile.aerosolScattering, profile.aerosolExtinction, profile.ozoneAbsorption]
      .map(values => Array.from(values, value => value.toPrecision(6)).join(","))
      .join("|")
    if (key === this.mediumKey) return
    this.mediumKey = key
    const pack = (name: string, values: Float64Array) => {
      const packed = this.transmittanceMaterial.uniforms[name].value as Vector4[]
      for (let group = 0; group < 4; group++) {
        packed[group].set(values[group * 4] ?? 0, values[group * 4 + 1] ?? 0, values[group * 4 + 2] ?? 0, values[group * 4 + 3] ?? 0)
      }
    }
    // One set of uniform objects shared by the three materials, so this writes all of them.
    pack("uRayleigh", profile.rayleighScattering)
    pack("uAerosolScattering", profile.aerosolScattering)
    pack("uAerosolExtinction", profile.aerosolExtinction)
    pack("uOzone", profile.ozoneAbsorption)
    this.transmittanceReady = false
    this.multipleRows = 0
    this.multipleColumn = 0
  }

  /**
   * Builds what is left of the air-only tables, for at most `budgetMs` of this frame — though at least
   * one row, so it always finishes. Returns whether the tables are ready.
   */
  advance(budgetMs: number): boolean {
    if (!this.supported || !this.mediumKey) return false
    if (this.ready) return true
    const started = performance.now()
    const previousTarget = this.renderer.getRenderTarget()
    const previousScissorTest = this.renderer.getScissorTest()
    if (!this.transmittanceReady) {
      this.draw(this.transmittanceMaterial, this.transmittance)
      this.transmittanceReady = true
    }
    const size = AtmosphereTables.MULTIPLE_SIZE
    // Blocks of a quarter of a row, not the whole table: a thousand directions from each of four
    // thousand texels in one draw is a stall a browser will kill the context for.
    const block = AtmosphereTables.MULTIPLE_BLOCK
    do {
      this.multiple.scissor.set(this.multipleColumn, this.multipleRows, block, 1)
      this.multiple.scissorTest = true
      this.draw(this.multipleMaterial, this.multiple)
      this.multipleColumn += block
      if (this.multipleColumn >= size) {
        this.multipleColumn = 0
        this.multipleRows++
      }
    } while (this.multipleRows < size && performance.now() - started < budgetMs)
    this.multiple.scissorTest = false
    this.renderer.setRenderTarget(previousTarget)
    this.renderer.setScissorTest(previousScissorTest)
    return this.ready
  }

  /**
   * Redraws the two sky views, for a witness `altitudeM` above the ground and the Sun and Moon at
   * those altitudes. Each view is laid out round its own source's azimuth, so only altitudes matter.
   */
  renderSkyViews(altitudeM: number, sunAltitudeDeg: number, moonAltitudeDeg: number): void {
    if (!this.ready) return
    const previousTarget = this.renderer.getRenderTarget()
    const uniforms = this.skyViewMaterial.uniforms
    uniforms.uObserverRadius.value = AtmosphereProfile.GROUND_RADIUS_M + Math.max(altitudeM, 2)
    uniforms.uSourceMu.value = Math.sin((sunAltitudeDeg * Math.PI) / 180)
    this.draw(this.skyViewMaterial, this.sunView)
    uniforms.uSourceMu.value = Math.sin((moonAltitudeDeg * Math.PI) / 180)
    this.draw(this.skyViewMaterial, this.moonView)
    this.renderer.setRenderTarget(previousTarget)
  }

  /**
   * Where in a sky view a line of sight lives: `zenithAngleRad` from straight up, `azimuthRad` round
   * from the source's own azimuth (0 to π). The inverse of the layout SKY_VIEW_FRAGMENT draws, and the
   * twin of the lookup the sky dome's shader does.
   */
  static skyViewUv(altitudeM: number, zenithAngleRad: number, azimuthRad: number): { u: number; v: number } {
    const r = AtmosphereProfile.GROUND_RADIUS_M + Math.max(altitudeM, 2)
    const ground = AtmosphereProfile.GROUND_RADIUS_M
    const beta = Math.acos(Math.min(Math.sqrt(Math.max(r * r - ground * ground, 0)) / r, 1))
    const zenithHorizon = Math.PI - beta
    const v =
      zenithAngleRad < zenithHorizon
        ? 0.5 * (1 - Math.sqrt(Math.max(1 - zenithAngleRad / zenithHorizon, 0)))
        : 0.5 + 0.5 * Math.sqrt(Math.min((zenithAngleRad - zenithHorizon) / beta, 1))
    return { u: Math.min(Math.max(Math.abs(azimuthRad) / Math.PI, 0), 1), v }
  }

  /** Reads a table back as a flat array, for checking it against SkyScattering. */
  async readTable(table: "transmittance" | "multiple", attachment: number): Promise<Float32Array> {
    if (table === "multiple") {
      const buffer = new Float32Array(this.multiple.width * this.multiple.height * 4)
      await this.renderer.readRenderTargetPixelsAsync(this.multiple, 0, 0, this.multiple.width, this.multiple.height, buffer, undefined, attachment)
      return buffer
    }
    // Half floats come back as their sixteen bits, and have to be decoded.
    const target = this.transmittance
    const halves = new Uint16Array(target.width * target.height * 4)
    await this.renderer.readRenderTargetPixelsAsync(target, 0, 0, target.width, target.height, halves, undefined, attachment)
    return Float32Array.from(halves, half => DataUtils.fromHalfFloat(half))
  }

  async readSkyView(source: "sun" | "moon"): Promise<Float32Array> {
    const target = source === "sun" ? this.sunView : this.moonView
    const buffer = new Float32Array(target.width * target.height * 4)
    await this.renderer.readRenderTargetPixelsAsync(target, 0, 0, target.width, target.height, buffer)
    return buffer
  }

  dispose(): void {
    this.transmittance.dispose()
    this.multiple.dispose()
    this.sunView.dispose()
    this.moonView.dispose()
    this.transmittanceMaterial.dispose()
    this.multipleMaterial.dispose()
    this.skyViewMaterial.dispose()
    this.quad.geometry.dispose()
  }

  private draw(material: RawShaderMaterial, target: WebGLRenderTarget): void {
    this.quad.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * The uniforms every pass shares: the medium, and the per-wavelength weights that turn a spectrum
   * into what an eye makes of it. The weights fold in the Sun's spectrum and the width of a sample,
   * so a pass sums radiance × weight and gets candelas per square metre directly.
   */
  private static mediumUniforms(): Record<string, { value: unknown }> {
    const groups = () => [new Vector4(), new Vector4(), new Vector4(), new Vector4()]
    const weights = (response: (wavelengthNm: number) => number, efficacy: number) => {
      const packed = groups()
      AtmosphereProfile.WAVELENGTHS_NM.forEach((wavelengthNm, index) => {
        packed[Math.floor(index / 4)].setComponent(
          index % 4,
          response(wavelengthNm) * efficacy * AtmosphereProfile.WAVELENGTH_STEP_NM * AtmosphereProfile.SOLAR_IRRADIANCE[index]
        )
      })
      return packed
    }
    return {
      uRayleigh: { value: groups() },
      uAerosolScattering: { value: groups() },
      uAerosolExtinction: { value: groups() },
      uOzone: { value: groups() },
      uCieX: { value: weights(nm => VisibleSpectrum.colourMatching(nm)[0], 683) },
      uCieY: { value: weights(nm => VisibleSpectrum.colourMatching(nm)[1], 683) },
      uCieZ: { value: weights(nm => VisibleSpectrum.colourMatching(nm)[2], 683) },
      uScotopic: { value: weights(nm => VisibleSpectrum.scotopic(nm), 1700) }
    }
  }

  private static readonly VERTEX = `
    in vec3 position;
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `

  /** Geometry, the medium, and table lookups — the GLSL twin of SkyScattering and AtmosphereProfile. */
  static readonly COMMON = `
    precision highp float;
    precision highp int;
    precision highp sampler2D;

    const float PI = 3.141592653589793;
    const float GROUND = ${AtmosphereProfile.GROUND_RADIUS_M.toFixed(1)};
    const float TOP = ${AtmosphereProfile.TOP_RADIUS_M.toFixed(1)};
    const float RAYLEIGH_HEIGHT = ${AtmosphereProfile.RAYLEIGH_SCALE_HEIGHT_M.toFixed(1)};
    const float AEROSOL_HEIGHT = ${AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M.toFixed(1)};
    const float OZONE_PEAK = ${AtmosphereProfile.OZONE_PEAK_ALTITUDE_M.toFixed(1)};
    const float OZONE_HALF_WIDTH = ${AtmosphereProfile.OZONE_HALF_WIDTH_M.toFixed(1)};
    const float AEROSOL_G = ${AtmosphereProfile.AEROSOL_ASYMMETRY.toFixed(4)};
    const float GROUND_ALBEDO = ${AtmosphereTables.GROUND_ALBEDO.toFixed(4)};
    const int STEPS = ${AtmosphereTables.STEPS};
    const int MULTIPLE_STEPS = ${AtmosphereTables.MULTIPLE_STEPS};
    const vec2 T_SIZE = vec2(${AtmosphereTables.TRANSMITTANCE_WIDTH}.0, ${AtmosphereTables.TRANSMITTANCE_HEIGHT}.0);
    const float M_SIZE = ${AtmosphereTables.MULTIPLE_SIZE}.0;

    uniform vec4 uRayleigh[4];
    uniform vec4 uAerosolScattering[4];
    uniform vec4 uAerosolExtinction[4];
    uniform vec4 uOzone[4];
    uniform sampler2D uT0;
    uniform sampler2D uT1;
    uniform sampler2D uT2;
    uniform sampler2D uT3;
    #ifndef BUILDING_MULTIPLE
    uniform sampler2D uM0;
    uniform sampler2D uM1;
    uniform sampler2D uM2;
    uniform sampler2D uM3;
    #endif

    float distanceToTop(float r, float mu) {
      float discriminant = r * r * (mu * mu - 1.0) + TOP * TOP;
      return max(0.0, -r * mu + sqrt(max(discriminant, 0.0)));
    }

    /** Negative when the ray misses the planet. */
    float distanceToGround(float r, float mu) {
      float discriminant = r * r * (mu * mu - 1.0) + GROUND * GROUND;
      if (mu >= 0.0 || discriminant < 0.0) return -1.0;
      return -r * mu - sqrt(discriminant);
    }

    float rayleighDensity(float altitude) { return exp(-max(altitude, 0.0) / RAYLEIGH_HEIGHT); }
    float aerosolDensity(float altitude) { return exp(-max(altitude, 0.0) / AEROSOL_HEIGHT); }
    float ozoneDensity(float altitude) { return max(0.0, 1.0 - abs(altitude - OZONE_PEAK) / OZONE_HALF_WIDTH); }

    float rayleighPhase(float c) { return 3.0 / (16.0 * PI) * (1.0 + c * c); }
    float aerosolPhase(float c) {
      float g2 = AEROSOL_G * AEROSOL_G;
      return 3.0 / (8.0 * PI) * (1.0 - g2) * (1.0 + c * c) /
        ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * AEROSOL_G * c, 1e-6), 1.5));
    }

    vec2 transmittanceUv(float r, float mu) {
      float horizon = sqrt(TOP * TOP - GROUND * GROUND);
      float rho = sqrt(max(r * r - GROUND * GROUND, 0.0));
      float d = distanceToTop(r, mu);
      float dMin = TOP - r;
      float dMax = rho + horizon;
      return vec2(dMax > dMin ? (d - dMin) / (dMax - dMin) : 0.0, rho / horizon);
    }

    vec4 fetchBilinear(sampler2D table, vec2 uv, vec2 size) {
      vec2 x = clamp(uv * size - 0.5, vec2(0.0), size - 1.0);
      vec2 x0 = floor(x);
      ivec2 a = ivec2(x0);
      ivec2 b = ivec2(min(x0 + 1.0, size - 1.0));
      vec2 f = x - x0;
      return mix(
        mix(texelFetch(table, a, 0), texelFetch(table, ivec2(b.x, a.y), 0), f.x),
        mix(texelFetch(table, ivec2(a.x, b.y), 0), texelFetch(table, b, 0), f.x),
        f.y
      );
    }

    void transmittanceToTop(float r, float mu, out vec4 t[4]) {
      vec2 uv = transmittanceUv(r, mu);
      t[0] = exp(-texture(uT0, uv));
      t[1] = exp(-texture(uT1, uv));
      t[2] = exp(-texture(uT2, uv));
      t[3] = exp(-texture(uT3, uv));
    }

    /** Not while that table is being built: a pass may not read the target it writes to, even from a
     * branch it never takes — WebGL refuses the draw outright as a feedback loop. */
    void multipleAt(float r, float muSun, out vec4 m[4]) {
      #ifdef BUILDING_MULTIPLE
      for (int k = 0; k < 4; k++) m[k] = vec4(0.0);
      #else
      vec2 uv = vec2((muSun + 1.0) * 0.5, (r - GROUND) / (TOP - GROUND));
      vec2 size = vec2(M_SIZE);
      m[0] = fetchBilinear(uM0, uv, size);
      m[1] = fetchBilinear(uM1, uv, size);
      m[2] = fetchBilinear(uM2, uv, size);
      m[3] = fetchBilinear(uM3, uv, size);
      #endif
    }

    /**
     * One march, as SkyScattering.march: \`view\` true uses the real phase functions and adds the
     * multiple-scattering table; false scatters isotropically, single scattering only, and fills
     * \`scattered\` with the share of light the ray scatters before it leaves.
     */
    void march(vec3 origin, vec3 dir, vec3 sun, bool view, int steps, out vec4 radiance[4], out vec4 scattered[4]) {
      for (int k = 0; k < 4; k++) { radiance[k] = vec4(0.0); scattered[k] = vec4(0.0); }
      float r = length(origin);
      float mu = dot(origin, dir) / r;
      float toGround = distanceToGround(r, mu);
      bool hitsGround = toGround >= 0.0;
      float len = hitsGround ? toGround : distanceToTop(r, mu);
      float cosAngle = dot(dir, sun);
      float pr = view ? rayleighPhase(cosAngle) : 1.0 / (4.0 * PI);
      float pa = view ? aerosolPhase(cosAngle) : 1.0 / (4.0 * PI);
      vec4 throughput[4] = vec4[4](vec4(1.0), vec4(1.0), vec4(1.0), vec4(1.0));
      vec4 toSun[4];
      vec4 multiple[4];
      for (int i = 0; i < steps; i++) {
        float s0 = float(i) / float(steps);
        float s1 = float(i + 1) / float(steps);
        float t0 = len * s0 * s0;
        float t1 = len * s1 * s1;
        float t = 0.5 * (t0 + t1);
        float dt = t1 - t0;
        vec3 p = origin + dir * t;
        float pr2 = length(p);
        float altitude = pr2 - GROUND;
        float muSun = dot(p, sun) / pr2;
        float dr = rayleighDensity(altitude);
        float da = aerosolDensity(altitude);
        float dozone = ozoneDensity(altitude);
        float lit = distanceToGround(pr2, muSun) >= 0.0 ? 0.0 : 1.0;
        transmittanceToTop(pr2, muSun, toSun);
        if (view) multipleAt(pr2, muSun, multiple);
        for (int k = 0; k < 4; k++) {
          vec4 rs = uRayleigh[k] * dr;
          vec4 as = uAerosolScattering[k] * da;
          vec4 extinction = rs + uAerosolExtinction[k] * da + uOzone[k] * dozone;
          vec4 source = lit * toSun[k] * (rs * pr + as * pa) + (view ? multiple[k] * (rs + as) : vec4(0.0));
          vec4 sampleT = exp(-extinction * dt);
          vec4 integrated = mix(source * dt, source * (1.0 - sampleT) / max(extinction, vec4(1e-30)), step(vec4(1e-30), extinction));
          radiance[k] += throughput[k] * integrated;
          scattered[k] += throughput[k] * (rs + as) * dt;
          throughput[k] *= sampleT;
        }
      }
      if (hitsGround) {
        vec3 p = origin + dir * len;
        float pr2 = length(p);
        float muSun = dot(p, sun) / pr2;
        if (muSun > 0.0) {
          transmittanceToTop(pr2, muSun, toSun);
          for (int k = 0; k < 4; k++) radiance[k] += throughput[k] * toSun[k] * muSun * GROUND_ALBEDO / PI;
        }
      }
    }
  `

  private static readonly TRANSMITTANCE_FRAGMENT = `
    ${AtmosphereTables.COMMON}
    layout(location = 0) out vec4 out0;
    layout(location = 1) out vec4 out1;
    layout(location = 2) out vec4 out2;
    layout(location = 3) out vec4 out3;

    void main() {
      vec2 uv = gl_FragCoord.xy / T_SIZE;
      float horizon = sqrt(TOP * TOP - GROUND * GROUND);
      float rho = horizon * uv.y;
      float r = sqrt(rho * rho + GROUND * GROUND);
      float dMin = TOP - r;
      float dMax = rho + horizon;
      float d = dMin + uv.x * (dMax - dMin);
      float mu = d == 0.0 ? 1.0 : clamp((horizon * horizon - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
      float len = distanceToTop(r, mu);
      const int SAMPLES = 64;
      float dt = len / float(SAMPLES);
      vec4 depth[4] = vec4[4](vec4(0.0), vec4(0.0), vec4(0.0), vec4(0.0));
      for (int i = 0; i < SAMPLES; i++) {
        float t = (float(i) + 0.5) * dt;
        float altitude = sqrt(t * t + 2.0 * r * mu * t + r * r) - GROUND;
        float dr = rayleighDensity(altitude) * dt;
        float da = aerosolDensity(altitude) * dt;
        float dozone = ozoneDensity(altitude) * dt;
        for (int k = 0; k < 4; k++) depth[k] += uRayleigh[k] * dr + uAerosolExtinction[k] * da + uOzone[k] * dozone;
      }
      out0 = depth[0];
      out1 = depth[1];
      out2 = depth[2];
      out3 = depth[3];
    }
  `

  private static readonly MULTIPLE_FRAGMENT = `
    #define BUILDING_MULTIPLE
    ${AtmosphereTables.COMMON}
    layout(location = 0) out vec4 out0;
    layout(location = 1) out vec4 out1;
    layout(location = 2) out vec4 out2;
    layout(location = 3) out vec4 out3;
    const int DIRECTIONS = ${AtmosphereTables.MULTIPLE_DIRECTIONS};

    void main() {
      vec2 uv = gl_FragCoord.xy / vec2(M_SIZE);
      float r = clamp(GROUND + uv.y * (TOP - GROUND), GROUND + 1.0, TOP - 1.0);
      float muSun = uv.x * 2.0 - 1.0;
      vec3 origin = vec3(0.0, r, 0.0);
      vec3 sun = vec3(0.0, muSun, sqrt(max(1.0 - muSun * muSun, 0.0)));
      vec4 secondOrder[4] = vec4[4](vec4(0.0), vec4(0.0), vec4(0.0), vec4(0.0));
      vec4 transfer[4] = vec4[4](vec4(0.0), vec4(0.0), vec4(0.0), vec4(0.0));
      vec4 radiance[4];
      vec4 scattered[4];
      for (int i = 0; i < DIRECTIONS; i++) {
        for (int j = 0; j < DIRECTIONS; j++) {
          float theta = 2.0 * PI * (float(i) + 0.5) / float(DIRECTIONS);
          float cosPhi = 1.0 - 2.0 * (float(j) + 0.5) / float(DIRECTIONS);
          float sinPhi = sqrt(max(1.0 - cosPhi * cosPhi, 0.0));
          vec3 dir = vec3(cos(theta) * sinPhi, cosPhi, sin(theta) * sinPhi);
          march(origin, dir, sun, false, MULTIPLE_STEPS, radiance, scattered);
          for (int k = 0; k < 4; k++) {
            secondOrder[k] += radiance[k];
            transfer[k] += scattered[k];
          }
        }
      }
      float samples = float(DIRECTIONS * DIRECTIONS);
      vec4 result[4];
      for (int k = 0; k < 4; k++) {
        vec4 share = min(transfer[k] / samples, vec4(0.99));
        result[k] = secondOrder[k] / samples / (1.0 - share);
      }
      out0 = result[0];
      out1 = result[1];
      out2 = result[2];
      out3 = result[3];
    }
  `

  /**
   * The sky view, laid out as Hillaire's: across, the azimuth away from the source, 0 to 180° (a
   * clear sky is symmetric about the source's vertical); up, the angle from the zenith, with the rows
   * crowded quadratically on the horizon — which here is where it really is for the witness's height,
   * below level for an aircraft.
   */
  private static readonly SKY_VIEW_FRAGMENT = `
    ${AtmosphereTables.COMMON}
    uniform float uObserverRadius;
    uniform float uSourceMu;
    uniform vec4 uCieX[4];
    uniform vec4 uCieY[4];
    uniform vec4 uCieZ[4];
    uniform vec4 uScotopic[4];
    out vec4 outColor;

    void main() {
      vec2 uv = gl_FragCoord.xy / vec2(${AtmosphereTables.SKY_VIEW_WIDTH}.0, ${AtmosphereTables.SKY_VIEW_HEIGHT}.0);
      float r = uObserverRadius;
      float beta = acos(clamp(sqrt(max(r * r - GROUND * GROUND, 0.0)) / r, -1.0, 1.0));
      float zenithHorizon = PI - beta;
      float zenithAngle;
      if (uv.y < 0.5) {
        float c = 1.0 - 2.0 * uv.y;
        zenithAngle = zenithHorizon * (1.0 - c * c);
      } else {
        float c = 2.0 * uv.y - 1.0;
        zenithAngle = zenithHorizon + beta * c * c;
      }
      float azimuth = uv.x * PI;
      vec3 dir = vec3(sin(zenithAngle) * sin(azimuth), cos(zenithAngle), sin(zenithAngle) * cos(azimuth));
      vec3 source = vec3(0.0, uSourceMu, sqrt(max(1.0 - uSourceMu * uSourceMu, 0.0)));
      vec4 radiance[4];
      vec4 unused[4];
      march(vec3(0.0, r, 0.0), dir, source, true, STEPS, radiance, unused);
      vec4 xyzs = vec4(0.0);
      for (int k = 0; k < 4; k++) {
        xyzs += vec4(dot(radiance[k], uCieX[k]), dot(radiance[k], uCieY[k]), dot(radiance[k], uCieZ[k]), dot(radiance[k], uScotopic[k]));
      }
      outColor = xyzs;
    }
  `
}
