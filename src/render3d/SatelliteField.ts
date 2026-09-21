import { BufferAttribute, BufferGeometry, Group, Points, PointsMaterial, Vector3 } from "three"
import type { HorizontalPosition } from "../engine/astronomy/CelestialPositions.js"
import { PointSources } from "./PointSources.js"
import { horizontalToCartesian, magnitudeToBrightness, STAR_BRIGHTNESS_TIERS, starBrightnessTierIndex } from "./skyColors.js"

/**
 * One satellite as the renderer is told about it: where, how bright, and a name for the pointer.
 *
 * Worked out by SceneElement from dated element sets (see SatellitePasses), the same division of
 * labour as the planets and the comet: this renderer knows nothing about orbits.
 */
export interface SceneSatellite {
  norad: number
  name: string
  position: HorizontalPosition
  /** Apparent visual magnitude, penumbra included. */
  magnitude: number
  heightKm: number
}

/**
 * The satellites in the sky, drawn exactly as stars are.
 *
 * A satellite is a point source like a star, sunlit rather than self-luminous, and what a witness
 * sees of it is the same spread point: so the same round points, the same three size tiers and the
 * same brightness ramp against the same magnitude limit. What differs is only that it MOVES, a
 * degree a second at the zenith, which is why this is its own field restated at every frame instead
 * of part of the star field, which is restated only when the sky has turned a fraction of a pixel.
 *
 * No twinkle. A satellite is a point too and does scintillate a little, but a steady moving light is
 * what observers describe, and the stars' twinkle amplitude was tuned on stars, not on these.
 */
export class SatelliteField {
  readonly object = new Group()
  private readonly radius: number
  private readonly tiers: Points[]
  private drawn: { satellite: SceneSatellite; direction: Vector3 }[] = []

  constructor(radius: number) {
    this.radius = radius
    this.object.name = "satellites"
    this.tiers = STAR_BRIGHTNESS_TIERS.map(tier => {
      const points = new Points(new BufferGeometry(), PointSources.material(tier.size))
      PointSources.track(points)
      // Positions change every frame and the bounds with them: a stale bounding sphere would cull a
      // satellite that has moved out of it.
      points.frustumCulled = false
      this.object.add(points)
      return points
    })
  }

  /**
   * Draws these satellites against that magnitude limit.
   *
   * `transmission` is how much light the clouds let through in a direction, the same dimming every
   * body in this sky already takes; it is applied to the magnitude before the limit is, so a
   * satellite behind a deck is not drawn at all rather than drawn faint.
   *
   * `light` is what arrives at the eye of a light of that magnitude in that direction, relative, per
   * channel (see PointSources): the satellite is drawn from it.
   */
  set(satellites: ReadonlyArray<SceneSatellite>, magnitudeLimit: number, transmission: (position: HorizontalPosition) => number,
    light: (position: HorizontalPosition, magnitude: number) => readonly [number, number, number]): void {
    const byTier: { x: number; y: number; z: number; r: number; g: number; b: number }[][] = this.tiers.map(() => [])
    this.drawn = []
    for (const satellite of satellites) {
      const through = transmission(satellite.position)
      if (through <= 0) continue
      const magnitude = satellite.magnitude - 2.5 * Math.log10(through)
      if (magnitude > magnitudeLimit) continue
      const brightness = magnitudeToBrightness(magnitude, magnitudeLimit)
      const tier = starBrightnessTierIndex(brightness)
      const { x, y, z } = horizontalToCartesian(satellite.position.altitudeDeg, satellite.position.azimuthDeg, this.radius)
      const [r, g, b] = light(satellite.position, magnitude)
      byTier[tier].push({ x, y, z, r, g, b })
      this.drawn.push({ satellite, direction: new Vector3(x, y, z).normalize() })
    }
    this.tiers.forEach((points, index) => {
      const entries = byTier[index]
      const positions = new Float32Array(entries.length * 3)
      const colors = new Float32Array(entries.length * 3)
      entries.forEach((entry, i) => {
        positions.set([entry.x, entry.y, entry.z], i * 3)
        colors.set([entry.r, entry.g, entry.b], i * 3)
      })
      points.geometry.dispose()
      const geometry = new BufferGeometry()
      geometry.setAttribute("position", new BufferAttribute(positions, 3))
      geometry.setAttribute("color", new BufferAttribute(colors, 3))
      points.geometry = geometry
    })
  }

  get count(): number {
    return this.drawn.length
  }

  /** The drawn satellite nearest a direction, within `thresholdCos` of it. */
  nearest(aim: Vector3, thresholdCos: number): SceneSatellite | undefined {
    let best: SceneSatellite | undefined
    let bestCos = thresholdCos
    for (const candidate of this.drawn) {
      const cos = candidate.direction.dot(aim)
      if (cos > bestCos) {
        bestCos = cos
        best = candidate.satellite
      }
    }
    return best
  }

  dispose(): void {
    for (const points of this.tiers) {
      points.geometry.dispose()
      ;(points.material as PointsMaterial).dispose()
    }
    this.object.removeFromParent()
    this.drawn = []
  }
}
