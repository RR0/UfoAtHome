import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three"
import { MeteorFall } from "../engine/astronomy/MeteorFall.js"
import type { Meteor } from "../engine/astronomy/MeteorFall.js"
import { horizontalToCartesian } from "./skyColors.js"

interface Vector {
  x: number
  y: number
  z: number
}

/**
 * Draws a shower's meteors: short streaks that all run away from one point of the sky.
 *
 * The radiating is the whole signature. A meteor shower does not look like scattered streaks — every
 * one of them, traced backwards, meets at the radiant, and that is exactly what tells a witness (and
 * a reader) that a streak belonged to the shower rather than to something else. Rendering them any
 * other way would lose the one feature worth reproducing.
 *
 * They are ribbons rather than lines, and that is not a cosmetic choice. WebGL ignores a line's
 * requested width on every desktop driver, so an earlier LineSegments version drew every meteor as
 * a hairline one DEVICE pixel across — half a CSS pixel on a retina display, lit for half a second.
 * It measured as present (228 pixels changed out of 3.7 million) and read, to anyone actually
 * watching the sky, as nothing at all. A width the renderer will honour is the only way to draw a
 * meteor that can be seen.
 *
 * The width itself is glare, and is claimed as such. A meteor is metres wide at a hundred
 * kilometres — a few arcseconds, far under one pixel — so its apparent thickness in any eye or lens
 * is entirely the spreading of a bright point source, the same physics this scene already renders
 * for the Sun. That is why the width follows brightness: a fireball glares wide, a magnitude-four
 * streak stays a thread. It is not the streak drawn fatter so it can be found.
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
  /** Three vertices across the ribbon — dark edge, bright core, dark edge — so the glare falls off
   * to either side instead of ending at a hard rectangle. Two quads per segment, six vertices each. */
  private static readonly ACROSS = 3
  private static readonly VERTICES_PER_SEGMENT = (MeteorSystem.ACROSS - 1) * 6
  /** Drawn just inside the star sphere: a meteor burns at about 100 km, far nearer than anything
   * else in this sky, and must never be occluded by a star drawn at the same radius. */
  private static readonly RADIUS = 840
  /** Half-widths of the glare, in degrees: what the faintest streak spreads to, and what the extra
   * spreading of a brilliant one adds. A twentieth of a degree is about a pixel across a 60-degree
   * field — a thread, which is what a faint meteor looks like — and the brightest reach some five
   * times that, as a fireball does. */
  private static readonly MIN_HALF_WIDTH_DEG = 0.05
  private static readonly BRIGHT_HALF_WIDTH_DEG = 0.22

  readonly object: Mesh
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private meteors: Meteor[] = []
  private radiantAltitudeDeg = 0
  private radiantAzimuthDeg = 0

  constructor() {
    const vertices = MeteorSystem.MAX_CONCURRENT * MeteorSystem.SEGMENTS * MeteorSystem.VERTICES_PER_SEGMENT
    this.positions = new Float32Array(vertices * 3)
    this.colors = new Float32Array(vertices * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.object = new Mesh(
      geometry,
      // Additive and unlit, like every other real light source in this scene: a meteor emits, it is
      // not lit by anything. Fog off — it burns above every atmosphere this scene models. Both
      // sides, because a ribbon built from a cross product faces whichever way the geometry took it.
      new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, side: DoubleSide })
    )
    this.object.frustumCulled = false
  }

  /** What is falling — read by anything that needs to find a meteor rather than draw one. */
  get schedule(): readonly Meteor[] {
    return this.meteors
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
      const along = this.turn(right, up, meteor.bearingDeg)
      // Dark at the tail, full at the head: `share` runs 0 to 1 along the streak, and the 1.6 power
      // makes the wake die away rather than fade evenly, which is what a trail actually does.
      const peak = (0.15 + 0.85 * meteor.brightness) * fade
      const brightnessAt = (share: number): number => peak * share ** 1.6
      const pointAt = (share: number) => this.onSphere(radiant, along, tail + (head - tail) * share)
      // The glare spreads with the source: only the head of a bright meteor is wide, and it narrows
      // back to a thread along the dying wake.
      const halfWidthAt = (share: number): number =>
        MeteorSystem.RADIUS *
        (((MeteorSystem.MIN_HALF_WIDTH_DEG + MeteorSystem.BRIGHT_HALF_WIDTH_DEG * meteor.brightness * share) * Math.PI) / 180)
      for (let i = 1; i < MeteorSystem.POINTS; i++) {
        const from = (i - 1) / MeteorSystem.SEGMENTS
        const to = i / MeteorSystem.SEGMENTS
        vertex = this.pushRibbon(vertex, pointAt(from), pointAt(to), halfWidthAt(from), halfWidthAt(to), brightnessAt(from), brightnessAt(to))
      }
    }
    geometry.setDrawRange(0, vertex)
    ;(geometry.getAttribute("position") as BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute("color") as BufferAttribute).needsUpdate = true
  }

  /**
   * Where a meteor's own midpoint sits in the observer's sky — what a "show me one" control has to
   * aim at.
   *
   * Finding a streak that lasts a second, somewhere in sixty degrees of sky, is not something
   * anybody does by hand. Stating that a shower was running and leaving the reader to hunt for it
   * is half a feature; this is the other half, and the same reasoning as the decor's own aim
   * button.
   */
  midpointOf(meteor: Meteor): { altitudeDeg: number; azimuthDeg: number } | undefined {
    if (this.radiantAltitudeDeg <= 0) return undefined
    const radiant = horizontalToCartesian(this.radiantAltitudeDeg, this.radiantAzimuthDeg, 1)
    const [right, up] = this.basisAround(radiant)
    const along = this.turn(right, up, meteor.bearingDeg)
    const point = this.onSphere(radiant, along, meteor.fromRadiantDeg + meteor.lengthDeg / 2)
    const length = Math.hypot(point.x, point.y, point.z) || 1
    return {
      altitudeDeg: (Math.asin(point.y / length) * 180) / Math.PI,
      // The inverse of horizontalToCartesian: north is -z, east is +x.
      azimuthDeg: ((Math.atan2(point.x, -point.z) * 180) / Math.PI + 360) % 360
    }
  }

  /** One segment of the streak, as a pair of quads sharing a bright core line. The offset is taken
   * perpendicular to both the streak and the line of sight, which is what keeps a ribbon facing the
   * observer wherever on the sphere it falls. */
  private pushRibbon(vertex: number, from: Vector, to: Vector, halfFrom: number, halfTo: number, brightFrom: number, brightTo: number): number {
    const perp = this.normalise(this.cross(this.normalise(from), this.normalise(this.subtract(to, from))))
    // -1, 0, +1 across the ribbon: the core carries the whole brightness and the edges carry none,
    // so the glare falls away to either side rather than ending at a visible border.
    for (let side = 0; side < MeteorSystem.ACROSS - 1; side++) {
      const inner = side - 1
      const outer = side
      const a = this.across(from, perp, halfFrom, inner)
      const b = this.across(to, perp, halfTo, inner)
      const c = this.across(from, perp, halfFrom, outer)
      const d = this.across(to, perp, halfTo, outer)
      const dim = (offset: number, brightness: number) => (offset === 0 ? brightness : 0)
      vertex = this.push(vertex, a, dim(inner, brightFrom))
      vertex = this.push(vertex, b, dim(inner, brightTo))
      vertex = this.push(vertex, c, dim(outer, brightFrom))
      vertex = this.push(vertex, b, dim(inner, brightTo))
      vertex = this.push(vertex, d, dim(outer, brightTo))
      vertex = this.push(vertex, c, dim(outer, brightFrom))
    }
    return vertex
  }

  private across(point: Vector, perp: Vector, halfWidth: number, offset: number): Vector {
    return { x: point.x + perp.x * halfWidth * offset, y: point.y + perp.y * halfWidth * offset, z: point.z + perp.z * halfWidth * offset }
  }

  private push(vertex: number, point: Vector, brightness: number): number {
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

  /** The direction a bearing points, within the plane perpendicular to the radiant. */
  private turn(right: Vector, up: Vector, bearingDeg: number): Vector {
    const bearing = (bearingDeg * Math.PI) / 180
    const c = Math.cos(bearing)
    const s = Math.sin(bearing)
    return { x: right.x * c + up.x * s, y: right.y * c + up.y * s, z: right.z * c + up.z * s }
  }

  /** A point `deg` away from the radiant, along the direction `along`. The standard spherical
   * offset: stay on the great circle through both. */
  private onSphere(radiant: Vector, along: Vector, deg: number): Vector {
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
  private basisAround(radiant: Vector) {
    const seed = Math.abs(radiant.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
    const right = this.normalise(this.cross(radiant, seed))
    return [right, this.normalise(this.cross(radiant, right))] as const
  }

  private subtract(a: Vector, b: Vector): Vector {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  }

  private cross(a: Vector, b: Vector): Vector {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  }

  private normalise(v: Vector): Vector {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  dispose(): void {
    this.object.geometry.dispose()
    ;(this.object.material as MeshBasicMaterial).dispose()
  }
}
