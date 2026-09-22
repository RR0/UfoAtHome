import { BackSide, GLSL3, ShaderMaterial, Vector2, Vector4, type WebGLRenderer } from "three"
import { AtmosphereProfile, type AtmosphereConditions } from "../engine/atmosphere/AtmosphereProfile.js"
import { EyeAdaptation, type DisplayRgb } from "../engine/atmosphere/EyeAdaptation.js"
import { NightSkyBrightness } from "../engine/atmosphere/NightSkyBrightness.js"
import { AtmosphereTables } from "./AtmosphereTables.js"

export interface ScatteredSkyState {
  /** The observer's eye above sea level. */
  readonly altitudeM: number
  readonly sun: { readonly altitudeDeg: number; readonly azimuthDeg: number; readonly magnitude: number }
  readonly moon: { readonly altitudeDeg: number; readonly azimuthDeg: number; readonly magnitude: number; readonly phaseAngleDeg: number }
}

/** The colours the rest of the scene takes from the sky: its ambient light, and the air's — all of it
 * as light relative to the eye's semi-saturation (see EyeAdaptation.relativeOf), which is how
 * everything is drawn before the frame is finished. */
export interface SkyAmbient {
  readonly zenith: DisplayRgb
  readonly horizon: DisplayRgb
  /**
   * The horizon as the low air makes it: the Sun's and the Moon's light scattered into the line of
   * sight, without the upper atmosphere's own glow. What the air between an eye and a distant thing
   * lays over it (see AerialFog) — the same as the horizon by day, when scattering is all there is,
   * and far darker on a moonless night, when the horizon's glow is emitted ninety kilometres up and
   * the air a few kilometres off has nothing to send back.
   */
  readonly airlight: DisplayRgb
  /**
   * The sky's light falling on a level surface, ∫ L cos θ dω over the upper hemisphere, relative
   * like the rest: what a HemisphereLight's sky colour is, three.js dividing it by π on a white
   * Lambertian surface as the physics does.
   */
  readonly skyIrradiance: DisplayRgb
  /** What the eye's relative units are, in candela per square metre: σ over the exposure. */
  readonly scale: number
}

/**
 * The sky dome drawn from scattered light rather than from a table of colours.
 *
 * Three sources of light, added as light: the Sun's sky and the Moon's sky out of AtmosphereTables
 * (the same scattering, each laid out round its own source), and the airglow — the upper atmosphere
 * glowing on its own, the floor of every moonless night (NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2),
 * brighter toward the horizon because a low line of sight crosses more of the glowing layer (van
 * Rhijn's factor for a layer ninety kilometres up) and dimmed by the air in front of it. What an eye
 * adapted to that sky makes of the sum is EyeAdaptation's business, done here per pixel.
 *
 * The eye's adaptation is set by the sky itself: the log-average luminance of the upper hemisphere,
 * read back from the sky views after each redraw (asynchronously — a frame late costs nothing a
 * observer could see) and, until the first read-back, the zenith that NightSkyBrightness predicts.
 * The same read-back gives the scene its ambient colours, so fog, skylight and cloud shading take
 * their colour from the sky actually drawn.
 */
export class ScatteredSky {
  static readonly AIRGLOW_LAYER_ALTITUDE_M = 90e3
  /** Magnitude of the Sun, for scaling the Moon's sky against it. */
  static readonly SUN_MAGNITUDE = -26.74

  readonly tables: AtmosphereTables
  readonly material: ShaderMaterial
  private readonly onChange: () => void
  private state?: ScatteredSkyState
  private drawnKey = ""
  private hasViews = false
  private adaptingLuminance = 1

  /** The luminance the eye is adapted to, cd/m² — what decides how bright anything that glows
   * comes out, and so what a glow worked out ahead of time has to be worked out again for. */
  get adaptation(): number {
    return this.adaptingLuminance * this.exposureScale
  }
  private ambientColours?: SkyAmbient
  private reading = false
  /** How much more light the instrument gathers than an eye, as a factor (see setInstrument). */
  private exposureScale = 1
  /** Whether what is shown was seen by an eye — rods, Purkinje — or recorded by a camera. */
  private seenByEye = true
  private readAgain = false

  constructor(renderer: WebGLRenderer, onChange: () => void) {
    this.onChange = onChange
    this.tables = new AtmosphereTables(renderer)
    this.tables.setMedium(new AtmosphereProfile())
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uSunView: { value: this.tables.sunViewTexture },
        uMoonView: { value: this.tables.moonViewTexture },
        uSunAzimuth: { value: new Vector2(0, -1) },
        uMoonAzimuth: { value: new Vector2(0, -1) },
        uMoonScale: { value: 0 },
        uObserverRadius: { value: AtmosphereProfile.GROUND_RADIUS_M + 2 },
        uAirglow: { value: new Vector4(...ScatteredSky.airglowXyzs()) },
        uRodShare: { value: 0 },
        uInverseSemiSaturation: { value: 1 },
        uExposureScale: { value: 1 }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp sampler2D;
        layout(location = 0) out highp vec4 pc_fragColor;
        #define gl_FragColor pc_fragColor
        varying vec3 vDirection;
        uniform sampler2D uSunView;
        uniform sampler2D uMoonView;
        uniform vec2 uSunAzimuth;
        uniform vec2 uMoonAzimuth;
        uniform float uMoonScale;
        uniform float uObserverRadius;
        uniform vec4 uAirglow;
        uniform float uRodShare;
        uniform float uInverseSemiSaturation;
        uniform float uExposureScale;
        const float PI = 3.141592653589793;
        const float GROUND = ${AtmosphereProfile.GROUND_RADIUS_M.toFixed(1)};
        const float AIRGLOW_RATIO = ${(AtmosphereProfile.GROUND_RADIUS_M / (AtmosphereProfile.GROUND_RADIUS_M + ScatteredSky.AIRGLOW_LAYER_ALTITUDE_M)).toFixed(6)};
        const float EXTINCTION = ${NightSkyBrightness.EXTINCTION_PER_AIR_MASS.toFixed(4)};
        const vec2 VIEW_SIZE = vec2(${AtmosphereTables.SKY_VIEW_WIDTH}.0, ${AtmosphereTables.SKY_VIEW_HEIGHT}.0);
        const vec3 SCOTOPIC_TINT = vec3(${EyeAdaptation.SCOTOPIC_TINT.map(value => value.toFixed(4)).join(", ")});

        /** AtmosphereTables.skyViewUv, for a source standing at \`sourceAzimuth\` (a unit vector in x, z). */
        vec2 viewUv(vec3 dir, vec2 sourceAzimuth) {
          float r = uObserverRadius;
          float cosBeta = sqrt(max((r - GROUND) * (r + GROUND), 0.0)) / r;
          float beta = acos(clamp(cosBeta, -1.0, 1.0));
          float zenithHorizon = PI - beta;
          float zenithAngle = acos(clamp(dir.y, -1.0, 1.0));
          float v = zenithAngle < zenithHorizon
            ? 0.5 * (1.0 - sqrt(max(1.0 - zenithAngle / zenithHorizon, 0.0)))
            : 0.5 + 0.5 * sqrt(min((zenithAngle - zenithHorizon) / beta, 1.0));
          float across = length(dir.xz);
          float u = across > 1e-6 ? acos(clamp(dot(dir.xz / across, sourceAzimuth), -1.0, 1.0)) / PI : 0.0;
          return vec2(u, v);
        }

        /** By hand: float textures are not guaranteed a filter. */
        vec4 fetchView(sampler2D view, vec2 uv) {
          vec2 x = clamp(uv * VIEW_SIZE - 0.5, vec2(0.0), VIEW_SIZE - 1.0);
          vec2 x0 = floor(x);
          ivec2 a = ivec2(x0);
          ivec2 b = ivec2(min(x0 + 1.0, VIEW_SIZE - 1.0));
          vec2 f = x - x0;
          return mix(
            mix(texelFetch(view, a, 0), texelFetch(view, ivec2(b.x, a.y), 0), f.x),
            mix(texelFetch(view, ivec2(a.x, b.y), 0), texelFetch(view, b, 0), f.x),
            f.y
          );
        }

        /** EyeAdaptation.relativeOf. */
        vec3 relativeOf(vec3 xyz, float scotopic) {
          float luminance = (1.0 - uRodShare) * xyz.y + uRodShare * scotopic;
          float response = max(luminance, 0.0) * uInverseSemiSaturation;
          vec3 rgb = mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz;
          vec3 tint = SCOTOPIC_TINT / dot(SCOTOPIC_TINT, vec3(0.2126, 0.7152, 0.0722));
          return max(vec3(0.0), (1.0 - uRodShare) * rgb / max(xyz.y, 1e-12) + uRodShare * tint) * response;
        }

        void main() {
          vec3 dir = normalize(vDirection);
          vec4 light = fetchView(uSunView, viewUv(dir, uSunAzimuth)) + uMoonScale * fetchView(uMoonView, viewUv(dir, uMoonAzimuth));
          if (dir.y > 0.0) {
            float sinZenith2 = 1.0 - dir.y * dir.y;
            float vanRhijn = inversesqrt(max(1.0 - AIRGLOW_RATIO * AIRGLOW_RATIO * sinZenith2, 1e-4));
            float airMass = inversesqrt(max(1.0 - 0.96 * sinZenith2, 1e-3));
            light += uAirglow * vanRhijn * pow(10.0, -0.4 * EXTINCTION * (airMass - 1.0));
          }
          light *= uExposureScale;
          gl_FragColor = vec4(relativeOf(light.xyz, light.w), 1.0);
          #include <colorspace_fragment>
        }
      `
    })
  }

  get supported(): boolean {
    return this.tables.supported
  }

  /**
   * Whether the dome can be drawn from scattered light: once sky views exist, and still while tables
   * for different air are being built — the views drawn from the previous air stand until the new
   * ones replace them, rather than the scene falling back to the gradient for a second every time the
   * humidity crosses a step.
   */
  get ready(): boolean {
    return this.hasViews
  }

  /** The colours the rest of the scene should take from this sky, once it has been read back. */
  get ambient(): SkyAmbient | undefined {
    return this.ready ? this.ambientColours : undefined
  }

  /**
   * What the sky is shown through. An EYE (`recordsOnMedium` false) sees it as EyeAdaptation says,
   * rods and all. A CAMERA has no rods and keeps the colours an eye loses in the dark — a long
   * exposure of a moonlit sky really is blue — and gathers `gainMagnitudes` more than an eye
   * (LimitingMagnitude.gainFor): that light enters the same response, as if the sky were that much
   * brighter. Automatic exposure is not modelled apart from the response's own partial adaptation.
   */
  setInstrument(recordsOnMedium: boolean, gainMagnitudes: number): void {
    const scale = recordsOnMedium ? 10 ** (0.4 * gainMagnitudes) : 1
    if (scale === this.exposureScale && this.seenByEye === !recordsOnMedium) return
    this.exposureScale = scale
    this.seenByEye = !recordsOnMedium
    this.material.uniforms.uExposureScale.value = scale
    this.applyAdaptation(this.adaptingLuminance)
    this.onChange()
  }

  setConditions(conditions: AtmosphereConditions): void {
    this.tables.setMedium(new AtmosphereProfile(conditions))
    // New air, new views as soon as its tables exist; the old views stay on the dome until then.
    if (!this.tables.ready) this.drawnKey = ""
  }

  /** Builds at most `draws` more blocks of the tables; draws the views as soon as they exist. */
  advance(draws: number): void {
    if (!this.supported || this.tables.ready) return
    if (this.tables.advance(draws) && this.state) this.draw(this.state)
  }

  /** After a lost context: the tables' contents went with it. */
  invalidate(): void {
    this.tables.invalidate()
    this.drawnKey = ""
    this.hasViews = false
  }

  update(state: ScatteredSkyState): void {
    this.state = state
    if (this.tables.ready) this.draw(state)
    // Before any views, the photometry's zenith is the best guess at the eye's state; once there are
    // views, the eye stays adapted to them until the new air's arrive.
    else if (!this.hasViews) this.applyAdaptation(ScatteredSky.predictedZenithLuminance(state))
  }

  dispose(): void {
    this.tables.dispose()
    this.material.dispose()
  }

  private draw(state: ScatteredSkyState): void {
    const key = [state.altitudeM.toFixed(0), state.sun.altitudeDeg.toFixed(3), state.moon.altitudeDeg.toFixed(3)].join(":")
    const uniforms = this.material.uniforms
    uniforms.uSunAzimuth.value.copy(ScatteredSky.azimuthVector(state.sun.azimuthDeg))
    uniforms.uMoonAzimuth.value.copy(ScatteredSky.azimuthVector(state.moon.azimuthDeg))
    uniforms.uMoonScale.value = 10 ** (-0.4 * (state.moon.magnitude - ScatteredSky.SUN_MAGNITUDE))
    uniforms.uObserverRadius.value = AtmosphereProfile.GROUND_RADIUS_M + Math.max(state.altitudeM, 2)
    if (key !== this.drawnKey) {
      this.tables.renderSkyViews(state.altitudeM, state.sun.altitudeDeg, state.moon.altitudeDeg)
      const first = !this.hasViews
      this.hasViews = true
      this.drawnKey = key
      if (first && !this.ambientColours) this.adaptFromViews(this.tables.readSkyViewNow("sun"), this.tables.readSkyViewNow("moon"), state)
      // And the asynchronous read after it in every case: it is the one that cannot come back empty,
      // and it is cheap to have the first frame's adaptation confirmed a frame later.
      void this.readBack()
    }
    this.onChange()
  }

  /** Reads the views back for the eye's adaptation and the ambient colours; one read at a time. */
  private async readBack(): Promise<void> {
    if (this.reading) {
      this.readAgain = true
      return
    }
    this.reading = true
    try {
      const [sun, moon] = await Promise.all([this.tables.readSkyView("sun"), this.tables.readSkyView("moon")])
      const state = this.state
      if (state) this.adaptFromViews(sun, moon, state)
    } finally {
      this.reading = false
    }
    if (this.readAgain) {
      this.readAgain = false
      void this.readBack()
    }
  }

  /**
   * What an eye standing in the scene as DRAWN adapts to, cd/m² — the log-average of the upper
   * hemisphere measured on the eye's own photograph (see ProbeIrradiance), clouds and all. Kept as a
   * factor on the clear sky's, so that it follows the clear sky between two photographs as the Sun
   * moves. Returns whether the eye's state changed enough to be worth redrawing.
   */
  adaptToSurroundings(luminance: number): boolean {
    if (!(luminance > 0) || !(this.clearAdaptation > 0)) return false
    const factor = luminance / this.clearAdaptation
    if (Math.abs(Math.log(factor / this.surroundingsFactor)) < 0.05) return false
    this.surroundingsFactor = factor
    if (this.views && this.state) this.adaptFromViews(this.views.sun, this.views.moon, this.state)
    else this.applyAdaptation(this.clearAdaptation * factor)
    return true
  }

  /** Forgets the drawn scene's own adaptation — a different scene, or a jump in time. */
  resetSurroundings(): void {
    this.surroundingsFactor = 1
  }

  /** See adaptToSurroundings. */
  private surroundingsFactor = 1
  /** What the clear sky alone would adapt an eye to, cd/m². */
  private clearAdaptation = 0
  private views?: { sun: Float32Array, moon: Float32Array }

  private adaptFromViews(sun: Float32Array, moon: Float32Array, state: ScatteredSkyState): void {
    this.views = { sun, moon }
    const moonScale = 10 ** (-0.4 * (state.moon.magnitude - ScatteredSky.SUN_MAGNITUDE))
    const airglow = ScatteredSky.airglowXyzs()
    const lightAt = (altitudeDeg: number, azimuthDeg: number, withAirglow = true): [number, number, number, number] => {
      const zenith = ((90 - altitudeDeg) * Math.PI) / 180
      const sunUv = AtmosphereTables.skyViewUv(state.altitudeM, zenith, ScatteredSky.azimuthBetween(azimuthDeg, state.sun.azimuthDeg))
      const moonUv = AtmosphereTables.skyViewUv(state.altitudeM, zenith, ScatteredSky.azimuthBetween(azimuthDeg, state.moon.azimuthDeg))
      const s = ScatteredSky.bilinear(sun, sunUv.u, sunUv.v)
      const m = ScatteredSky.bilinear(moon, moonUv.u, moonUv.v)
      const glow = withAirglow && altitudeDeg > 0 ? ScatteredSky.airglowFactor(altitudeDeg) : 0
      return [0, 1, 2, 3].map(c => s[c] + moonScale * m[c] + airglow[c] * glow) as [number, number, number, number]
    }
    // The eye adapts to the upper hemisphere, weighted by solid angle, in log.
    let logSum = 0
    let weightSum = 0
    for (let altitude = 5; altitude < 90; altitude += 10) {
      const weight = Math.cos((altitude * Math.PI) / 180)
      for (let azimuth = 0; azimuth < 360; azimuth += 30) {
        logSum += weight * Math.log(Math.max(lightAt(altitude, azimuth)[1], 1e-9))
        weightSum += weight
      }
    }
    this.clearAdaptation = Math.exp(logSum / weightSum)
    this.applyAdaptation(this.clearAdaptation * this.surroundingsFactor)
    const relative = ([x, y, z, s]: readonly number[]) => {
      const scale = this.exposureScale
      const adapted = this.adaptingLuminance * scale
      // Photopic: the rods' shift is the finish's, on the whole picture (see EYE_RESPONSE_GLSL).
      return EyeAdaptation.relativeOf([x * scale, y * scale, z * scale], s * scale, adapted, 0)
    }
    const displayAt = (altitudeDeg: number, azimuthDeg: number, withAirglow = true) => relative(lightAt(altitudeDeg, azimuthDeg, withAirglow))
    // The sky on a level surface: every direction of the upper hemisphere, weighted by its solid
    // angle and by the cosine of its slant onto the surface.
    const irradiance = [0, 0, 0, 0]
    const step = (5 * Math.PI) / 180
    const azimuthStep = (20 * Math.PI) / 180
    for (let altitude = 2.5; altitude < 90; altitude += 5) {
      const radians = (altitude * Math.PI) / 180
      const weight = Math.sin(radians) * Math.cos(radians) * step * azimuthStep
      for (let azimuth = 10; azimuth < 360; azimuth += 20) {
        const light = lightAt(altitude, azimuth)
        for (let c = 0; c < 4; c++) irradiance[c] += light[c] * weight
      }
    }
    const horizon: DisplayRgb = [0, 0, 0]
    const airlight: DisplayRgb = [0, 0, 0]
    for (let azimuth = 0; azimuth < 360; azimuth += 20) {
      const colour = displayAt(2, azimuth)
      const scattered = displayAt(2, azimuth, false)
      for (let c = 0; c < 3; c++) {
        horizon[c] += colour[c] / 18
        airlight[c] += scattered[c] / 18
      }
    }
    this.ambientColours = { zenith: displayAt(90, 0), horizon, airlight, skyIrradiance: relative(irradiance), scale: this.relativeScale }
    this.onChange()
  }


  /**
   * A surface giving out `luminanceCdM2` of light of this colour, as the scene draws light: relative
   * to the same eye, adapted to the same sky, as the sky itself (see EyeAdaptation.relativeOf). What
   * lets something that glows (a flame, see BodySystem) be as bright as it would be against THIS sky:
   * a flame that reads white-hot at dusk is a pale smudge at noon, and so it should be.
   *
   * The colour sets the chromaticity only; the luminance sets how much of it there is. Scotopic
   * luminance is taken equal to photopic, which is what a warm-to-white source is near enough.
   */
  relativeOfLuminance(linearRgb: readonly [number, number, number], luminanceCdM2: number): DisplayRgb {
    const [r, g, b] = linearRgb
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const k = y > 0 ? luminanceCdM2 / y : 0
    const xyz: [number, number, number] = [
      k * (0.4124 * r + 0.3576 * g + 0.1805 * b),
      luminanceCdM2,
      k * (0.0193 * r + 0.1192 * g + 0.9505 * b)
    ]
    const scale = this.exposureScale
    const adapted = this.adaptingLuminance * scale
    return EyeAdaptation.relativeOf(
      [xyz[0] * scale, xyz[1] * scale, xyz[2] * scale], xyz[1] * scale, adapted, 0)
  }

  /** The share of the seeing the rods do, for the eye as adapted now; none for a camera. */
  get rodShare(): number {
    const adapted = this.adaptingLuminance * this.exposureScale
    return this.seenByEye ? EyeAdaptation.rodShare(adapted) : 0
  }

  /** What one relative unit of the scene's light is worth in lux or candela: the exposure over the
   * eye's semi-saturation. A light of the scene given in physical units is multiplied by this. */
  get relativeScale(): number {
    const adapted = this.adaptingLuminance * this.exposureScale
    return this.exposureScale / EyeAdaptation.semiSaturation(adapted)
  }

  /** `adaptingLuminance` is the sky's own; what the eye or the film adapts to is that times the exposure. */
  private applyAdaptation(adaptingLuminance: number): void {
    this.adaptingLuminance = adaptingLuminance
    const adapted = adaptingLuminance * this.exposureScale
    // The rods' shift is the finish's (see EYE_RESPONSE_GLSL): the dome writes photopic light.
    this.material.uniforms.uRodShare.value = 0
    this.material.uniforms.uInverseSemiSaturation.value = 1 / EyeAdaptation.semiSaturation(adapted)
  }

  /** Before anything has been read back: the zenith as the photometry has it, in cd/m². */
  private static predictedZenithLuminance(state: ScatteredSkyState): number {
    const separation = (from: { altitudeDeg: number; azimuthDeg: number }) => 90 - from.altitudeDeg
    const mag = NightSkyBrightness.magPerArcsec2(
      { altitudeDeg: state.sun.altitudeDeg, separationDeg: separation(state.sun) },
      { phaseAngleDeg: state.moon.phaseAngleDeg, altitudeDeg: state.moon.altitudeDeg, separationDeg: separation(state.moon) },
      90
    )
    return NightSkyBrightness.toNanolamberts(mag) * ScatteredSky.CANDELAS_PER_NANOLAMBERT
  }

  /** A nanolambert is 10⁻⁹ lambert, and a lambert is 10⁴/π cd/m². */
  static readonly CANDELAS_PER_NANOLAMBERT = 1e-5 / Math.PI

  /** The moonless night's floor as light: XYZ in cd/m² and scotopic luminance. No colour is claimed
   * for it (it is shown neutral), and its scotopic luminance is taken equal to its photopic one. */
  static airglowXyzs(): [number, number, number, number] {
    const y = NightSkyBrightness.toNanolamberts(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2) * ScatteredSky.CANDELAS_PER_NANOLAMBERT
    // D65 white: x 0.3127, y 0.3290.
    return [(y * 0.3127) / 0.329, y, (y * (1 - 0.3127 - 0.329)) / 0.329, y]
  }

  /** The zenith is where the airglow floor was measured, so it is 1 there. */
  static airglowFactor(altitudeDeg: number): number {
    const sinZenith2 = Math.cos((altitudeDeg * Math.PI) / 180) ** 2
    const ratio = AtmosphereProfile.GROUND_RADIUS_M / (AtmosphereProfile.GROUND_RADIUS_M + ScatteredSky.AIRGLOW_LAYER_ALTITUDE_M)
    const vanRhijn = 1 / Math.sqrt(Math.max(1 - ratio * ratio * sinZenith2, 1e-4))
    const airMass = 1 / Math.sqrt(Math.max(1 - 0.96 * sinZenith2, 1e-3))
    return vanRhijn * 10 ** (-0.4 * NightSkyBrightness.EXTINCTION_PER_AIR_MASS * (airMass - 1))
  }

  /** An azimuth as a unit vector in the scene's own x, z (north −z, east +x — see horizontalToCartesian). */
  private static azimuthVector(azimuthDeg: number): Vector2 {
    const azimuth = (azimuthDeg * Math.PI) / 180
    return new Vector2(Math.sin(azimuth), -Math.cos(azimuth))
  }

  private static azimuthBetween(a: number, b: number): number {
    const difference = Math.abs(a - b) % 360
    return ((difference > 180 ? 360 - difference : difference) * Math.PI) / 180
  }

  private static bilinear(view: Float32Array, u: number, v: number): number[] {
    const width = AtmosphereTables.SKY_VIEW_WIDTH
    const height = AtmosphereTables.SKY_VIEW_HEIGHT
    const x = Math.min(Math.max(u * width - 0.5, 0), width - 1)
    const y = Math.min(Math.max(v * height - 0.5, 0), height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = Math.min(x0 + 1, width - 1)
    const y1 = Math.min(y0 + 1, height - 1)
    const fx = x - x0
    const fy = y - y0
    const at = (row: number, column: number, c: number) => view[(row * width + column) * 4 + c]
    return [0, 1, 2, 3].map(
      c => (at(y0, x0, c) * (1 - fx) + at(y0, x1, c) * fx) * (1 - fy) + (at(y1, x0, c) * (1 - fx) + at(y1, x1, c) * fx) * fy
    )
  }
}
