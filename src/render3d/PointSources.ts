import { AdditiveBlending, PointsMaterial, Vector4, type Object3D, type WebGLRenderer } from "three"
import { RoundPoints } from "./RoundPoints.js"

/**
 * Lights too small to be seen for their size — a star, a planet, a comet's head — drawn from the
 * light they SEND, their illuminance at the eye, rather than from a brightness chosen for them.
 *
 * A point source has no luminance of its own to draw: what an eye gets from it is an illuminance,
 * lux, spread over what the eye cannot resolve it from — its acuity cell, a minute of arc for the
 * cones, several for the rods (see acuitySolidAngle). A reader looking at the screen resolves one
 * pixel much as the witness resolved that cell, so ONE pixel's worth of the drawn disc carries the
 * contrast the witness had against the sky, and the rest of the disc shares that light rather than
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
    uViewportHeight: { value: 1 }
  }
  private static readonly viewport = new Vector4()

  /** Has `object` tell the shared uniforms which viewport it is being drawn into: the frame's
   * pixel is what the drawn disc's solid angle comes from, and it differs on every path (the canvas,
   * a widened camera, the faces of a cube, a reflection probe). */
  static track(object: Object3D): void {
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
  static material(size: number): PointsMaterial {
    const material = new PointsMaterial({ vertexColors: true, size, sizeAttenuation: false, fog: false })
    RoundPoints.apply(material)
    material.blending = AdditiveBlending
    const round = material.onBeforeCompile
    material.onBeforeCompile = (shader, renderer) => {
      round.call(material, shader, renderer)
      shader.uniforms.uRodSolidAngle = PointSources.shared.uRodSolidAngle
      shader.uniforms.uConeThreshold = PointSources.shared.uConeThreshold
      shader.uniforms.uViewportHeight = PointSources.shared.uViewportHeight
      shader.vertexShader = PointSources.patch(shader.vertexShader)
    }
    material.customProgramCacheKey = () => "point-sources"
    return material
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
  static patch(vertexShader: string): string {
    return vertexShader
      .replace("void main() {", `uniform float uRodSolidAngle;\nuniform float uConeThreshold;\nuniform float uViewportHeight;\nvoid main() {`)
      .replace(
        "gl_PointSize = size;",
        `gl_PointSize = size;
        float light = max(max(vColor.r, vColor.g), vColor.b);
        float foveal = smoothstep(0.25 * uConeThreshold, uConeThreshold, light);
        float uAcuitySolidAngle = mix(uRodSolidAngle, ${PointSources.CONE_SOLID_ANGLE.toExponential(6)}, foveal);
        float pixelAngle = 2.0 / (projectionMatrix[1][1] * uViewportHeight);
        float drawn = ${PointSources.COVERAGE.toFixed(6)} * gl_PointSize * gl_PointSize * pixelAngle * pixelAngle;
        // The eye's contrast on one pixel, the light conserved over the rest of the disc: a reader
        // resolves a pixel as the witness resolved his acuity cell, and a disc wider than a pixel
        // is there to show a brighter point as a larger one, not to add light to it.
        float pixels = max(1.0, ${PointSources.COVERAGE.toFixed(6)} * gl_PointSize * gl_PointSize);
        float pixel = pixelAngle * pixelAngle;
        vColor.rgb /= pixel >= uAcuitySolidAngle ? uAcuitySolidAngle * pixels : max(drawn, uAcuitySolidAngle);`
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
