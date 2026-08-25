import { AdditiveBlending, BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from "three"
import { MeteorFall } from "../engine/astronomy/MeteorFall.js"
import type { Meteor } from "../engine/astronomy/MeteorFall.js"
import { horizontalToCartesian } from "./skyColors.js"

/**
 * Draws a shower's meteors: short streaks that all run away from one point of the sky.
 *
 * The radiating is the whole signature. A meteor shower does not look like scattered streaks — every
 * one of them, traced backwards, meets at the radiant, and that is exactly what tells a witness (and
 * a reader) that a streak belonged to the shower rather than to something else. Rendering them any
 * other way would lose the one feature worth reproducing.
 *
 * WHICH meteors fall, and when, is not decided here: MeteorFall works that out once from the rate,
 * deterministically, so a paused recording freezes and a long exposure can integrate the same sky
 * without it shifting underneath (see its own doc comment). This class only puts them on the sphere.
 */
export class MeteorSystem {
  /** How many can be in the air at once. A rate high enough to exceed this would be a storm, which
   * is well outside what MeteorFall's averaged rates ever produce. */
  private static readonly MAX_CONCURRENT = 24
  /** Points along each streak. Enough to curve visibly along a great circle, few enough that the
   * whole system is one small buffer. */
  private static readonly POINTS = 8
  private static readonly SEGMENTS = MeteorSystem.POINTS - 1
  /** Drawn just inside the star sphere: a meteor burns at about 100 km, far nearer than anything
   * else in this sky, and must never be occluded by a star drawn at the same radius. */
  private static readonly RADIUS = 840

  readonly object: LineSegments
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private meteors: Meteor[] = []
  private radiantAltitudeDeg = 0
  private radiantAzimuthDeg = 0

  constructor() {
    const vertices = MeteorSystem.MAX_CONCURRENT * MeteorSystem.SEGMENTS * 2
    this.positions = new Float32Array(vertices * 3)
    this.colors = new Float32Array(vertices * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.object = new LineSegments(
      geometry,
      // Additive and unlit, like every other real light source in this scene: a meteor emits, it is
      // not lit by anything. Fog off — it burns above every atmosphere this scene models.
      new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false })
    )
    this.object.frustumCulled = false
  }

  /** The shower now falling, and where its radiant stands. An empty list is a sky with no shower in
   * it, which is most skies. */
  setShower(meteors: Meteor[], radiantAltitudeDeg: number, radiantAzimuthDeg: number): void {
    this.meteors = meteors
    this.radiantAltitudeDeg = radiantAltitudeDeg
    this.radiantAzimuthDeg = radiantAzimuthDeg
  }

  /**
   * Places whatever is falling at the recording's instant `t`.
   *
   * A radiant below the horizon draws nothing at all — the same statement MeteorShowers makes in
   * words, made here in pixels.
   */
  update(t: number): void {
    const geometry = this.object.geometry
    if (this.meteors.length === 0 || this.radiantAltitudeDeg <= 0) {
      geometry.setDrawRange(0, 0)
      return
    }
    const radiant = horizontalToCartesian(this.radiantAltitudeDeg, this.radiantAzimuthDeg, 1)
    const [right, up] = this.basisAround(radiant)
    const alive = MeteorFall.aliveAt(this.meteors, t).slice(0, MeteorSystem.MAX_CONCURRENT)
    let vertex = 0
    for (const { meteor, progress } of alive) {
      // Head runs outward from where it appeared; the trail lags behind it, back toward the radiant.
      const head = meteor.fromRadiantDeg + progress * meteor.lengthDeg
      const tail = Math.max(meteor.fromRadiantDeg, head - meteor.lengthDeg * 0.6)
      // Bright as it strikes, gone as it ends — the asymmetry a real trail has.
      const fade = Math.min(1, (1 - progress) * 2.5)
      const bearing = (meteor.bearingDeg * Math.PI) / 180
      const along = { x: right.x * Math.cos(bearing) + up.x * Math.sin(bearing), y: right.y * Math.cos(bearing) + up.y * Math.sin(bearing), z: right.z * Math.cos(bearing) + up.z * Math.sin(bearing) }
      // Dark at the tail, full at the head: `share` runs 0 to 1 along the streak, and the 1.6 power
      // makes the wake die away rather than fade evenly, which is what a trail actually does.
      const peak = (0.15 + 0.85 * meteor.brightness) * fade
      const brightnessAt = (share: number): number => peak * share ** 1.6
      const pointAt = (share: number) => this.onSphere(radiant, along, tail + (head - tail) * share)
      for (let i = 1; i < MeteorSystem.POINTS; i++) {
        // Each segment is its own pair of vertices — LineSegments, not a strip, so one buffer holds
        // every streak without any of them joining up to the next.
        const from = (i - 1) / MeteorSystem.SEGMENTS
        const to = i / MeteorSystem.SEGMENTS
        vertex = this.push(vertex, pointAt(from), brightnessAt(from))
        vertex = this.push(vertex, pointAt(to), brightnessAt(to))
      }
    }
    geometry.setDrawRange(0, vertex)
    ;(geometry.getAttribute("position") as BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute("color") as BufferAttribute).needsUpdate = true
  }

  private push(vertex: number, point: { x: number; y: number; z: number }, brightness: number): number {
    const i = vertex * 3
    this.positions[i] = point.x
    this.positions[i + 1] = point.y
    this.positions[i + 2] = point.z
    const value = Math.max(0, Math.min(1, brightness))
    // Faintly blue-white, which is what most of them are: the colours that mark a fireball's own
    // chemistry are not something an averaged rate can claim.
    this.colors[i] = value * 0.9
    this.colors[i + 1] = value * 0.95
    this.colors[i + 2] = value
    return vertex + 1
  }

  /** A point `deg` away from the radiant, along the direction `along`. The standard spherical
   * offset: stay on the great circle through both. */
  private onSphere(radiant: { x: number; y: number; z: number }, along: { x: number; y: number; z: number }, deg: number) {
    const rad = (deg * Math.PI) / 180
    const c = Math.cos(rad)
    const s = Math.sin(rad)
    return {
      x: (radiant.x * c + along.x * s) * MeteorSystem.RADIUS,
      y: (radiant.y * c + along.y * s) * MeteorSystem.RADIUS,
      z: (radiant.z * c + along.z * s) * MeteorSystem.RADIUS
    }
  }

  /** Two unit vectors perpendicular to the radiant and to each other — the plane a bearing turns
   * within. Seeded from whichever world axis the radiant leans on least, so the cross product never
   * collapses for a radiant at the zenith. */
  private basisAround(radiant: { x: number; y: number; z: number }) {
    const seed = Math.abs(radiant.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
    const right = this.normalise(this.cross(radiant, seed))
    return [right, this.normalise(this.cross(radiant, right))] as const
  }

  private cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  }

  private normalise(v: { x: number; y: number; z: number }) {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  dispose(): void {
    this.object.geometry.dispose()
    ;(this.object.material as LineBasicMaterial).dispose()
  }
}
