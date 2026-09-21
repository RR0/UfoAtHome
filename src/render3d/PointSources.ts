import { AdditiveBlending, PointsMaterial } from "three"
import { RoundPoints } from "./RoundPoints.js"

/**
 * Lights too small to be seen for their size — a star, a planet, a comet's head — drawn from the
 * light they SEND, their illuminance at the eye, rather than from a brightness chosen for them.
 *
 * A point source has no luminance of its own to draw: what an eye gets from it is an illuminance,
 * lux, spread over whatever the eye cannot resolve it from. The eye's own acuity decides that — a
 * minute of arc in daylight, several at night when the rods do the seeing. So a point is drawn at
 * its illuminance over the eye's acuity cell (see acuitySolidAngle), on a disc of its tier's size
 * (a first version widened faint stars to the rods' ten-minute cell, and the sky filled with
 * blobs): it keeps the contrast the eye gave it against the sky, which is what
 * decides whether it was seen at all — a sixth-magnitude star by night stands a quarter above the
 * sky behind it, Venus by day half again. Where a pixel is coarser than the cell, which is nearly
 * always by day, the disc is a pixel or so wide and carries more light than the star sent: the
 * contrast is kept, not the flux, because the contrast is what the witness saw.
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
    uConeThreshold: { value: 0 }
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
   * The patched vertex shader: each point drawn at its tier's size, at its illuminance over the
   * eye's acuity cell — the luminance the eye gives it. The cell is the
   * cones' for a point bright enough for the fovea and the dim-light eye's for one too faint for it,
   * from one to the other over the factor of four under the fovea's threshold.
   */
  static patch(vertexShader: string): string {
    return vertexShader
      .replace("void main() {", `uniform float uRodSolidAngle;\nuniform float uConeThreshold;\nvoid main() {`)
      .replace(
        "gl_PointSize = size;",
        `gl_PointSize = size;
        float light = max(max(vColor.r, vColor.g), vColor.b);
        float foveal = smoothstep(0.25 * uConeThreshold, uConeThreshold, light);
        float uAcuitySolidAngle = mix(uRodSolidAngle, ${PointSources.CONE_SOLID_ANGLE.toExponential(6)}, foveal);
        vColor.rgb /= uAcuitySolidAngle;`
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
