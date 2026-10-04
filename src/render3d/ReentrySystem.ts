import { BufferAttribute, BufferGeometry, Color, Group, Mesh, Points, type MeshBasicMaterial, type PointsMaterial } from "three"
import { EyeAdaptation } from "../engine/atmosphere/EyeAdaptation.js"
import type { HorizontalPosition } from "../engine/astronomy/CelestialPositions.js"
import type { ReentryFragmentView, SkyPoint } from "../engine/interpretation/Reentry.js"
import { PointSources } from "./PointSources.js"
import { SkyRibbons } from "./SkyRibbons.js"
import { horizontalToCartesian, magnitudeToBrightness, STAR_BRIGHTNESS_TIERS, starBrightnessTierIndex } from "./skyColors.js"

interface Vector {
  x: number
  y: number
  z: number
}

/**
 * Draws the burning pieces of a re-entry: each a bright point with its glowing tail along the path
 * it has just flown.
 *
 * The head is a point source, drawn as stars and satellites are — the same tiers, the same ramp
 * against the same magnitude limit — because at a hundred kilometres and more a piece metres
 * across is a point, and what an eye sees of it is that point's glare. The tail is a ribbon, as a
 * meteor's is, for the reason MeteorSystem gives: WebGL ignores a line's width. Unlike a meteor's,
 * it does not run along a great circle drawn from a radiant: it is the piece's own past positions,
 * each seen from the observer, so its curve and its foreshortening are those of the real path.
 *
 * In the celestial group, at the radius meteors burn at: a re-entry is no nearer, and shows no
 * parallax against a few metres of eye height.
 */
export class ReentrySystem {
  /** Drawn where meteors are, just inside the star sphere, for the same reason. */
  private static readonly RADIUS = 840
  private static readonly MAX_SEGMENTS = 256
  private static readonly VERTICES_PER_SEGMENT = 12
  /** The glare of the tail, degrees — the meteors' own, see MeteorSystem. */
  private static readonly MIN_HALF_WIDTH_DEG = 0.05
  private static readonly BRIGHT_HALF_WIDTH_DEG = 0.22
  /** How bright the tail starts, as a share of its head: the train glows, it does not outshine. */
  private static readonly TRAIN_SHARE = 0.6

  readonly object = new Group()
  private readonly tiers: Points[]
  private readonly trains: Mesh
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private shown = 0

  constructor() {
    this.object.name = "reentries"
    this.tiers = STAR_BRIGHTNESS_TIERS.map(tier => {
      const points = new Points(new BufferGeometry(), PointSources.material(tier.size, false))
      PointSources.track(points)
      points.frustumCulled = false
      this.object.add(points)
      return points
    })
    const vertices = ReentrySystem.MAX_SEGMENTS * ReentrySystem.VERTICES_PER_SEGMENT
    this.positions = new Float32Array(vertices * 3)
    this.colors = new Float32Array(vertices * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.trains = new Mesh(geometry,
      SkyRibbons.material())
    this.trains.frustumCulled = false
    SkyRibbons.track(this.trains)
    this.object.add(this.trains)
  }

  /** How many pieces are drawn — read by tests and by whatever has to know one is showing. */
  get count(): number {
    return this.shown
  }

  /**
   * Draws these pieces against that magnitude limit, through the clouds' `transmission` and the
   * air's `light` (see SatelliteField.set, the same two).
   */
  set(views: ReadonlyArray<ReentryFragmentView>, magnitudeLimit: number, transmission: (position: HorizontalPosition) => number,
    light: (position: HorizontalPosition, magnitude: number) => readonly [number, number, number]): void {
    const byTier: { x: number; y: number; z: number; r: number; g: number; b: number }[][] = this.tiers.map(() => [])
    let vertex = 0
    let shown = 0
    const tint = new Color()
    for (const view of views) {
      const through = transmission(view.head)
      if (through <= 0) continue
      const magnitude = view.magnitude - 2.5 * Math.log10(through)
      if (magnitude > magnitudeLimit) continue
      shown++
      tint.set(view.color)
      const brightness = magnitudeToBrightness(magnitude, magnitudeLimit)
      const { x, y, z } = horizontalToCartesian(view.head.altitudeDeg, view.head.azimuthDeg, ReentrySystem.RADIUS)
      const [r, g, b] = light(view.head, magnitude)
      // The hue of its own fire on the light that arrives: a share per channel, the brightest kept.
      const peak = Math.max(tint.r, tint.g, tint.b) || 1
      byTier[starBrightnessTierIndex(brightness)].push({ x, y, z, r: (r * tint.r) / peak, g: (g * tint.g) / peak, b: (b * tint.b) / peak })
      vertex = this.pushTrain(vertex, view.train, brightness, tint)
    }
    this.shown = shown
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
    const geometry = this.trains.geometry
    geometry.setDrawRange(0, vertex)
    ;(geometry.getAttribute("position") as BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute("color") as BufferAttribute).needsUpdate = true
  }

  /** A piece's tail: bright at the head, dying away along the path behind it, the meteors' 1.6 power. */
  private pushTrain(vertex: number, train: readonly SkyPoint[], brightness: number, tint: Color): number {
    const segments = train.length - 1
    for (let i = 0; i < segments; i++) {
      if (vertex + ReentrySystem.VERTICES_PER_SEGMENT > ReentrySystem.MAX_SEGMENTS * ReentrySystem.VERTICES_PER_SEGMENT) return vertex
      const near = 1 - i / segments
      const far = 1 - (i + 1) / segments
      const from = horizontalToCartesian(train[i].altitudeDeg, train[i].azimuthDeg, ReentrySystem.RADIUS)
      const to = horizontalToCartesian(train[i + 1].altitudeDeg, train[i + 1].azimuthDeg, ReentrySystem.RADIUS)
      const width = (share: number) =>
        ReentrySystem.RADIUS * (((ReentrySystem.MIN_HALF_WIDTH_DEG + ReentrySystem.BRIGHT_HALF_WIDTH_DEG * brightness * share) * Math.PI) / 180)
      const glow = (share: number) => ReentrySystem.TRAIN_SHARE * brightness * share ** 1.6
      vertex = this.pushRibbon(vertex, from, to, width(near), width(far), glow(near), glow(far), tint)
    }
    return vertex
  }

  /** One segment of a tail as two quads sharing a bright core — see MeteorSystem.pushRibbon. */
  private pushRibbon(vertex: number, from: Vector, to: Vector, halfFrom: number, halfTo: number, brightFrom: number, brightTo: number, tint: Color): number {
    const along = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }
    if (Math.hypot(along.x, along.y, along.z) < 1e-9) return vertex
    const perp = this.normalise(this.cross(this.normalise(from), this.normalise(along)))
    for (const [inner, outer] of [[-1, 0], [0, 1]] as const) {
      const a = this.across(from, perp, halfFrom, inner)
      const b = this.across(to, perp, halfTo, inner)
      const c = this.across(from, perp, halfFrom, outer)
      const d = this.across(to, perp, halfTo, outer)
      const dim = (offset: number, brightness: number) => (offset === 0 ? brightness : 0)
      vertex = this.push(vertex, a, dim(inner, brightFrom), tint)
      vertex = this.push(vertex, b, dim(inner, brightTo), tint)
      vertex = this.push(vertex, c, dim(outer, brightFrom), tint)
      vertex = this.push(vertex, b, dim(inner, brightTo), tint)
      vertex = this.push(vertex, d, dim(outer, brightTo), tint)
      vertex = this.push(vertex, c, dim(outer, brightFrom), tint)
    }
    return vertex
  }

  private across(point: Vector, perp: Vector, halfWidth: number, offset: number): Vector {
    return { x: point.x + perp.x * halfWidth * offset, y: point.y + perp.y * halfWidth * offset, z: point.z + perp.z * halfWidth * offset }
  }

  private push(vertex: number, point: Vector, brightness: number, tint: Color): number {
    const i = vertex * 3
    this.positions[i] = point.x
    this.positions[i + 1] = point.y
    this.positions[i + 2] = point.z
    // A share of white for a streak on a dark sky, as a meteor's (see MeteorSystem.push), in the
    // colour of this piece's own fire.
    const value = EyeAdaptation.relativeOfResponse(Math.max(0, Math.min(1, brightness)))
    this.colors[i] = value * tint.r
    this.colors[i + 1] = value * tint.g
    this.colors[i + 2] = value * tint.b
    return vertex + 1
  }

  private cross(a: Vector, b: Vector): Vector {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  }

  private normalise(v: Vector): Vector {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  dispose(): void {
    for (const points of this.tiers) {
      points.geometry.dispose()
      ;(points.material as PointsMaterial).dispose()
    }
    this.trains.geometry.dispose()
    ;(this.trains.material as MeshBasicMaterial).dispose()
    this.object.removeFromParent()
  }
}
