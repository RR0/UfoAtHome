import { AdditiveBlending, PointsMaterial, Texture, Vector4, type Object3D, type WebGLRenderer } from "three"
import { RoundPoints } from "./RoundPoints.js"

/**
 * Lights too small to be seen for their size — a star, a planet, a comet's head — drawn from the
 * light they SEND, their illuminance at the eye, rather than from a brightness chosen for them.
 *
 * A point source has no luminance of its own to draw: what an eye gets from it is an illuminance,
 * lux, spread over what the eye cannot resolve it from — its acuity cell, a minute of arc for the
 * cones, several for the rods (see acuitySolidAngle). A reader looking at the screen resolves one
 * pixel much as the observer resolved that cell, so ONE pixel's worth of the drawn disc carries the
 * contrast the observer had against the sky, and the rest of the disc shares that light rather than
 * adding to it: the tiers' larger discs show a brighter point larger, at the same total light. Where
 * the frame's pixels are finer than the eye's cell (a long focal length), the light is conserved over
 * the whole disc.
 *
 * Two versions were tried first. Every point at its light over the acuity cell, whatever its disc:
 * stars and planets came out too big and too bright, a comet's head a lamp in front of its tail.
 * Every point's light conserved over its disc in the scene's own angles: most stars faded under the
 * sky, the screen's pixel being five times the eye's cell.
 *
 * Added to what is behind it, as light is: a star seen through the sky's own glow is both.
 *
 * Spread as a Gaussian of at least half a pixel, normalised to that same light (see patchFragment).
 * The round disc it replaces, a pixel or two wide for most points, lit one pixel, then two, then
 * four as a point crossed the grid: stars came out coarse, square and almost black and white, and
 * anything moving — a satellite, the sky turning — flickered.

 */
export class PointSources {
  /** What one of RoundPoints' discs actually fills, as a share of its square: its glare falloff
   * integrated over the inscribed circle. */
  static readonly COVERAGE = PointSources.integrateCoverage()

  /** A cone's acuity cell, a minute of arc square: what the fovea resolves a point to. */
  static readonly CONE_SOLID_ANGLE = PointSources.acuitySolidAngle(0)
  /**
   * The illuminance, lux, above which a point is bright enough for the fovea — seen straight on, by
   * cones, at their acuity — rather than only by averted vision, by rods. The fovea's limit on a
   * dark night is about two and a half magnitudes above the rods' 6.5: magnitude 4.
   */
  static readonly CONE_THRESHOLD_LUX = 10 ** ((-14.18 - 4) / 2.5)

  /** Shared by every point source: the dim-light eye's acuity cell (sr), and the illuminance the
   * fovea takes over at (relative). */
  private static readonly shared = {
    uRodSolidAngle: { value: 1e-7 },
    uConeThreshold: { value: 0 },
    uViewportHeight: { value: 1 },
    uScintillationTime: { value: 0 }
  }

  /** The clock scintillation runs on, seconds — the scene's own animation clock. */
  static setTime(seconds: number): void {
    PointSources.shared.uScintillationTime.value = seconds
  }
  private static readonly viewport = new Vector4()

  /** Has `object` tell the shared uniforms which viewport it is being drawn into: the frame's
   * pixel is what the drawn disc's solid angle comes from, and it differs on every path (the canvas,
   * a widened camera, the faces of a cube, a reflection probe). */
  static track(object: Object3D): void {
    // Marked too, so that a renderer can find every point source of a scene without being told of
    // each (see PointLayerPass): they are what the eye's picture draws at the picture's own pixels.
    object.userData.pointSource = true
    object.onBeforeRender = (renderer: WebGLRenderer) => {
      PointSources.shared.uViewportHeight.value = Math.max(1, renderer.getCurrentViewport(PointSources.viewport).w)
    }
  }

  /**
   * The eye as it is adapted now: the acuity cell of its dim-light seeing (see acuitySolidAngle),
   * and what the scene's relative units are worth (see ScatteredSky.relativeScale), which places the
   * fovea's threshold among them.
   */
  static setEye(rodShare: number, relativeScale: number): void {
    PointSources.shared.uRodSolidAngle.value = PointSources.acuitySolidAngle(rodShare)
    PointSources.shared.uConeThreshold.value = PointSources.CONE_THRESHOLD_LUX * relativeScale
  }

  /**
   * A points material whose vertex colours are ILLUMINANCES, relative like the rest of the scene
   * (see ScatteredSky.relativeScale), drawn round, added.
   */
  static material(size: number, scintillates = true): PointsMaterial {
    const material = new PointsMaterial({ vertexColors: true, size, sizeAttenuation: false, fog: false })
    // Drawn with its own falloff (see patchFragment), not RoundPoints': same reasons to be round, and
    // additive light must not write depth either.
    material.transparent = true
    material.depthWrite = false
    material.blending = AdditiveBlending
    material.onBeforeCompile = shader => {
      shader.uniforms.uRodSolidAngle = PointSources.shared.uRodSolidAngle
      shader.uniforms.uConeThreshold = PointSources.shared.uConeThreshold
      shader.uniforms.uViewportHeight = PointSources.shared.uViewportHeight
      shader.uniforms.uScintillationTime = PointSources.shared.uScintillationTime
      shader.vertexShader = PointSources.patch(shader.vertexShader, scintillates)
      shader.fragmentShader = PointSources.patchFragment(shader.fragmentShader)
    }
    material.customProgramCacheKey = () => (scintillates ? "point-sources" : "point-sources-steady")
    return material
  }

  /**
   * What the points drawn at the picture's own resolution are told each frame (see PointLayerPass):
   * the mapping of the eye's picture, and what stands in front of the sky.
   */
  static readonly output = {
    uOutputHalfFovRad: { value: 0.5236 },
    uOutputAspect: { value: 1 },
    /** The angle one pixel of the picture covers at its centre, radians. */
    uOutputPixelAngle: { value: 0.003 },
    /** `tan` of half the SOURCE render's vertical field: where a direction is found in it. */
    uSrcTanHalfFovY: { value: 1 },
    /** What stands between the eye and the sky, as the alpha of a small picture of the source's view. */
    uOcclusion: { value: null as Texture | null }
  }

  private static readonly twins = new WeakMap<PointsMaterial, PointsMaterial>()

  /**
   * The same points material, to be drawn into the picture itself rather than into the render the
   * picture is resampled from.
   *
   * The eye's picture is resampled from a render that carries fewer pixels per radian than the
   * picture does (a 70 degree field gives it about two fifths of them), so a point source drawn
   * there is a point magnified two and a half times, and a bright one, clipped by the eye's response,
   * comes out a flat block with a stair at its rim as wide as a source pixel. Drawn here, in the
   * picture's own pixels, it is as fine as the picture is. Its light and its shape are the same
   * (patchOutput only changes WHERE the point lands and what a pixel is); it is the light of the
   * point alone, which the clouds and the ground still have to be allowed to hide — read off the
   * small picture of them that PointLayerPass draws.
   */
  static outputMaterial(material: PointsMaterial): PointsMaterial {
    let twin = PointSources.twins.get(material)
    if (twin) return twin
    const scintillates = material.customProgramCacheKey() === "point-sources"
    twin = new PointsMaterial({ vertexColors: true, size: material.size, sizeAttenuation: false, fog: false })
    twin.transparent = true
    twin.depthWrite = false
    twin.depthTest = false
    twin.blending = AdditiveBlending
    twin.onBeforeCompile = shader => {
      shader.uniforms.uRodSolidAngle = PointSources.shared.uRodSolidAngle
      shader.uniforms.uConeThreshold = PointSources.shared.uConeThreshold
      shader.uniforms.uViewportHeight = PointSources.shared.uViewportHeight
      shader.uniforms.uScintillationTime = PointSources.shared.uScintillationTime
      Object.assign(shader.uniforms, PointSources.output)
      shader.vertexShader = PointSources.patchOutput(shader.vertexShader, scintillates)
      shader.fragmentShader = PointSources.patchFragment(shader.fragmentShader)
    }
    twin.customProgramCacheKey = () => (scintillates ? "point-sources-output" : "point-sources-output-steady")
    PointSources.twins.set(material, twin)
    return twin
  }

  /** The anchor in three.js's own points vertex shader the output mapping hooks into. */
  static readonly PROJECT_ANCHOR = "#include <project_vertex>"

  /**
   * The vertex shader of a point drawn into the eye's picture: the same light and the same disc as
   * patch() gives it, put where `r = f·θ` puts its direction (see EquidistantProjectionPass), and
   * lit by the pixel the picture has rather than the pixel of a pinhole render.
   */
  static patchOutput(vertexShader: string, scintillates = true): string {
    return PointSources.patch(vertexShader, scintillates)
      .replace("uniform float uRodSolidAngle;", `uniform float uOutputHalfFovRad;
uniform float uOutputAspect;
uniform float uOutputPixelAngle;
uniform float uSrcTanHalfFovY;
uniform sampler2D uOcclusion;
uniform float uRodSolidAngle;`)
      .replace(PointSources.PROJECT_ANCHOR, `${PointSources.PROJECT_ANCHOR}
  {
    // The eye is at the origin of view space: the point's direction is its position, and the picture
    // puts it at an angle from the axis proportional to that angle, whichever way it lies.
    vec3 viewDirection = normalize(mvPosition.xyz);
    float lateral = length(viewDirection.xy);
    float theta = acos(clamp(-viewDirection.z, -1.0, 1.0));
    vec2 angle = lateral < 1e-6 ? vec2(0.0) : viewDirection.xy / lateral * theta;
    // Behind the eye there is no picture: left outside it, where nothing is drawn.
    gl_Position = viewDirection.z > 0.0 ? vec4(2.0, 2.0, 2.0, 1.0)
      : vec4(angle.x / (uOutputHalfFovRad * uOutputAspect), angle.y / uOutputHalfFovRad, 0.0, 1.0);
    // What is in front of the sky along that direction: found in the small picture of the source's
    // view, where the ground and the clouds were drawn (alpha is their cover).
    vec2 seenAt = vec2(viewDirection.x / -viewDirection.z / (uSrcTanHalfFovY * uOutputAspect), viewDirection.y / -viewDirection.z / uSrcTanHalfFovY) * 0.5 + 0.5;
    float covered = viewDirection.z < 0.0 && all(lessThan(abs(seenAt - 0.5), vec2(0.5))) ? texture2D(uOcclusion, seenAt).a : 0.0;
    vColor.rgb *= 1.0 - covered;
  }`)
      .replace("float pixelAngle = 2.0 / (projectionMatrix[1][1] * uViewportHeight);", "float pixelAngle = uOutputPixelAngle;")
  }

  /**
   * The eye's acuity cell for a given share of the seeing done by the rods: a minute of arc for the
   * cones, towards ten for the rods alone — scotopic acuity is about a tenth of photopic.
   */
  static acuitySolidAngle(rodShare: number): number {
    const arcminutes = 1 + 9 * Math.min(Math.max(rodShare, 0), 1)
    const radians = (arcminutes / 60) * (Math.PI / 180)
    return radians * radians
  }

  /**
   * The patched vertex shader: each point drawn at its tier's size, its illuminance spread over
   * what that disc covers on this frame, or over the eye's acuity cell where the disc is finer. The
   * cell is the cones' for a point bright enough for the fovea and the dim-light eye's for one too
   * faint for it, from one to the other over the factor of four under the fovea's threshold.
   */
  static patch(vertexShader: string, scintillates = true): string {
    return vertexShader
      .replace("void main() {", `uniform float uRodSolidAngle;\nuniform float uConeThreshold;\nuniform float uViewportHeight;\nuniform float uScintillationTime;\nattribute float seed;\nvarying float vSize;\nvarying float vRaster;\nvarying float vTotal;\nvoid main() {`)
      .replace(
        "gl_PointSize = size;",
        `gl_PointSize = size;
        float light = max(max(vColor.r, vColor.g), vColor.b);
        float foveal = smoothstep(0.25 * uConeThreshold, uConeThreshold, light);
        float uAcuitySolidAngle = mix(uRodSolidAngle, ${PointSources.CONE_SOLID_ANGLE.toExponential(6)}, foveal);
        float pixelAngle = 2.0 / (projectionMatrix[1][1] * uViewportHeight);
        float drawn = ${PointSources.COVERAGE.toFixed(6)} * gl_PointSize * gl_PointSize * pixelAngle * pixelAngle;
        // The eye's contrast on one pixel, the light conserved over the rest of the disc: a reader
        // resolves a pixel as the observer resolved his acuity cell, and a disc wider than a pixel
        // is there to show a brighter point as a larger one, not to add light to it.
        float pixels = max(1.0, ${PointSources.COVERAGE.toFixed(6)} * gl_PointSize * gl_PointSize);
        float pixel = pixelAngle * pixelAngle;
        vColor.rgb /= pixel >= uAcuitySolidAngle ? uAcuitySolidAngle * pixels : max(drawn, uAcuitySolidAngle);
        // How many pixels' worth of that light the disc carries in all — see patchFragment, which
        // spreads exactly this much, wherever the point falls between pixels.
        vTotal = pixel >= uAcuitySolidAngle ? pixels : ${PointSources.COVERAGE.toFixed(6)} * gl_PointSize * gl_PointSize;
        vSize = gl_PointSize;
        // The square drawn wide enough to hold the whole of the falloff, whatever its tier.
        gl_PointSize = max(gl_PointSize, 2.0 * ceil(${PointSources.EDGE_SIGMAS.toFixed(1)} * max(${PointSources.MIN_SIGMA_PX.toFixed(2)}, ${PointSources.SIGMA_PER_SIZE.toFixed(2)} * gl_PointSize)) + 1.0);
        vRaster = gl_PointSize;${scintillates ? PointSources.SCINTILLATION_GLSL : ""}`
      )
  }

  /**
   * Scintillation: the flickering of a point seen through a turbulent atmosphere, which is what
   * makes a star twinkle — and a satellite too, a point source as much as a star.
   *
   * How much follows how much air the light crosses (Young's law, amplitude ∝ airmass^1.75 — the
   * air mass after Kasten and Young), scaled for an eye's 7 mm pupil and its tenth of a second of
   * integration: two or three per cent at the zenith, a plain twinkle towards the horizon, capped at a
   * third of the light (twice that was judged too strong, 2026-09-27). How fast is a few hertz, irregular: three unrelated waves per point, from its own
   * seed so that no two twinkle together. Low down the colours part too, the atmosphere's
   * dispersion sending the red and the blue through different turbulence: a low bright star flashes
   * red and blue.
   *
   * On the GPU, from the point's own direction: nothing is rewritten per point on the CPU.
   */
  private static readonly SCINTILLATION_GLSL = `
        vec3 toPoint = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        float sinAltitude = clamp(toPoint.y, 0.0, 1.0);
        float altitudeDeg = degrees(asin(sinAltitude));
        float airmass = 1.0 / (sinAltitude + 0.50572 * pow(altitudeDeg + 6.07995, -1.6364));
        float amplitude = min(0.35, 0.025 * pow(airmass, 1.75));
        float t = uScintillationTime;
        float s1 = fract(seed * 7.131 + 0.13);
        float s2 = fract(seed * 3.713 + 0.57);
        float wave = (sin(t * (18.0 + 9.0 * seed) + seed * 6.2832)
          + 0.7 * sin(t * (31.0 + 13.0 * s1) + s1 * 17.0)
          + 0.5 * sin(t * (47.0 + 19.0 * s2) + s2 * 29.0)) / 0.93;
        float colourWave = sin(t * (23.0 + 11.0 * s2) + seed * 41.0);
        float parting = 0.6 * (1.0 - smoothstep(5.0, 25.0, altitudeDeg));
        vColor.r *= max(0.0, 1.0 + amplitude * (wave + parting * colourWave));
        vColor.g *= max(0.0, 1.0 + amplitude * wave);
        vColor.b *= max(0.0, 1.0 + amplitude * (wave - parting * colourWave));`

  /**
   * The narrowest spread a point is drawn with, pixels (a Gaussian's standard deviation), and the
   * share of its tier's size it widens to above that. Narrower than half a pixel, a point sampled at
   * the pixels' centres gives more or less light depending on where it falls between them — one
   * pixel lit, then two, then four — and a star moving across the sky, or a satellite, flickered from
   * frame to frame as it crossed the grid. At half a pixel the sum over the pixels is the same to a
   * few per cent wherever it falls.
   */
  static readonly MIN_SIGMA_PX = 0.5
  static readonly SIGMA_PER_SIZE = 0.25
  /** How far out the falloff is drawn before it is cut, in standard deviations. */
  static readonly EDGE_SIGMAS = 2.5

  /**
   * The patched fragment shader: each pixel takes its share of the point's light from a Gaussian
   * centred on the point's EXACT position, normalised so that the pixels together carry the disc's
   * total (see patch). The same light as the round disc it replaces, spread smoothly enough that it
   * does not depend on the pixel grid. Returns the source untouched when the anchor is absent.
   */
  static patchFragment(fragmentShader: string): string {
    return fragmentShader
      .replace("void main() {", "varying float vSize;\nvarying float vRaster;\nvarying float vTotal;\nvoid main() {")
      .replace(
        RoundPoints.ANCHOR,
        `float sigma = max(${PointSources.MIN_SIGMA_PX.toFixed(2)}, ${PointSources.SIGMA_PER_SIZE.toFixed(2)} * vSize);
         float fromCentre = length( gl_PointCoord - vec2( 0.5 ) ) * vRaster;
         if ( fromCentre > ${PointSources.EDGE_SIGMAS.toFixed(1)} * sigma ) discard;
         float share = exp( -0.5 * fromCentre * fromCentre / ( sigma * sigma ) ) * vTotal / ( 6.2831853 * sigma * sigma );
         vec4 diffuseColor = vec4( diffuse, opacity * share );`
      )
  }

  private static integrateCoverage(): number {
    const steps = 2000
    const { core, rim } = RoundPoints.FALLOFF
    let sum = 0
    for (let i = 0; i < steps; i++) {
      const r = ((i + 0.5) / steps) * rim
      const t = Math.min(Math.max((r - core) / (rim - core), 0), 1)
      const glare = 1 - t * t * (3 - 2 * t)
      sum += glare * 2 * Math.PI * r * (rim / steps)
    }
    return sum
  }
}
