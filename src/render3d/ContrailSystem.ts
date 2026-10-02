import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from "three"
import type { Vector3 } from "three"
import type { ContrailPoint, ContrailTrail } from "../engine/traffic/AircraftContrails.js"
import { ContrailGrowth } from "../engine/traffic/ContrailGrowth.js"

/** What a trail is drawn against, at one instant. */
export interface ContrailFrame {
  /** Where the scene's world is moved to under the eye, metres: east and (minus) north offsets the decor is placed by. */
  origin: { x: number; z: number }
  eye: Vector3
  /** The angle of one pixel of the picture, radians: nothing is drawn thinner. Zero for no limit. */
  pixelRad: number
}

/** A position along a trail at the instant shown, with the air's work on it. */
interface Sample {
  x: number
  y: number
  z: number
  age: number
  forms: boolean
  point: ContrailPoint
}

/**
 * Draws the trails the aircraft of a record leave: ribbons of ice in the sky, each from the engines of an aircraft back along the path it flew,
 * carried by the wind since it left each part (see AircraftContrails.plan), widening and thinning with age (see ContrailGrowth).
 *
 * In the scene proper, at the distance they are, and not on the celestial shell: they are as real as the aircraft that make them and are
 * dimmed and reddened by the air between as they are (the scene's AerialFog takes them as it takes any material), which is what makes a
 * trail a hundred kilometres off fade into the horizon's haze. A ribbon is turned to face the eye, as a meteor's is (WebGL ignores a
 * line's width), rebuilt at every instant it is asked for: its shape depends on the time shown, and a few thousand vertices are not
 * what a frame is spent on.
 *
 * A trail narrower than two pixels is drawn two wide and that much fainter, which is what the light of a thing too thin to resolve does:
 * the same ice, spread over more of the picture.
 */
export class ContrailSystem {
  private static readonly MAX_SEGMENTS = 4000
  /** The least a ribbon is drawn across, in pixels, edge to edge: its core is soft, so one pixel would be hit and missed by the rasteriser along its length and break into beads. */
  private static readonly MIN_PIXELS = 2
  /**
   * How much fainter a ribbon is drawn for being widened to the least it is drawn at: 1 would keep all the light of the trail, 0.5 keeps
   * the contrast of a thin line, which is what the eye (blurred by its own optics) still sees. Keeping all of it made the young part of
   * a distant trail, which is thin, as faint as its old part, which is wide, and no trail seemed to fade at all.
   */
  private static readonly UNRESOLVED_CONTRAST = 0.5
  private static readonly VERTICES_PER_SEGMENT = 12

  readonly object: Mesh
  readonly group = new Group()
  private trails: readonly ContrailTrail[] = []
  private readonly positions = new Float32Array(ContrailSystem.MAX_SEGMENTS * ContrailSystem.VERTICES_PER_SEGMENT * 3)
  private readonly colors = new Float32Array(ContrailSystem.MAX_SEGMENTS * ContrailSystem.VERTICES_PER_SEGMENT * 4)
  private segments = 0

  constructor() {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 4))
    geometry.setDrawRange(0, 0)
    this.object = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide }))
    this.object.frustumCulled = false
    this.object.name = "contrails"
    this.group.name = "contrails"
    this.group.add(this.object)
  }

  /** How many ribbon segments are drawn. */
  get segmentCount(): number {
    return this.segments
  }

  set(trails: readonly ContrailTrail[]): void {
    this.trails = trails
  }

  /** Builds the ribbons as they stand at `tMs` (from the recording's start); `tintOf` is the light of an aircraft's trail, per channel. */
  update(tMs: number, frame: ContrailFrame, tintOf: (id: string) => readonly [number, number, number]): void {
    let vertex = 0
    this.segments = 0
    for (const trail of this.trails) {
      const samples = this.samplesOf(trail, tMs, frame)
      const tint = tintOf(trail.id)
      for (let i = 0; i + 1 < samples.length; i++) {
        const a = samples[i]
        const b = samples[i + 1]
        if (!a.forms || !b.forms) continue
        if (this.segments >= ContrailSystem.MAX_SEGMENTS) break
        const next = this.pushSegment(vertex, a, b, trail.spanM, tint, frame)
        if (next > vertex) this.segments++
        vertex = next
      }
    }
    const geometry = this.object.geometry
    geometry.setDrawRange(0, vertex)
    // Only what was written is sent to the graphics card: the buffers are sized for the most that can be drawn, and a few hundred segments are
    // a tenth of that.
    for (const [name, size] of [["position", 3], ["color", 4]] as const) {
      const attribute = geometry.getAttribute(name) as BufferAttribute
      attribute.clearUpdateRanges()
      if (vertex > 0) attribute.addUpdateRange(0, vertex * size)
      attribute.needsUpdate = true
    }
  }

  /** Where each position the aircraft has left a trail at is now, oldest first, and the head of the trail just behind the aircraft. */
  private samplesOf(trail: ContrailTrail, tMs: number, frame: ContrailFrame): Sample[] {
    const headMs = tMs - ContrailGrowth.FORMATION_S * 1000
    const samples: Sample[] = []
    const places = (point: ContrailPoint, eastM: number, northM: number, upM: number, age: number, forms: boolean): Sample => ({
      x: eastM + point.driftEastMs * age + frame.origin.x,
      y: upM,
      z: -(northM + point.driftNorthMs * age) + frame.origin.z,
      age,
      forms,
      point
    })
    let last = -1
    trail.points.forEach((point, i) => {
      if (point.tMs > headMs) return
      last = i
      samples.push(places(point, point.eastM, point.northM, point.upM, (tMs - point.tMs) / 1000, point.forms))
    })
    const from = trail.points[last]
    const to = trail.points[last + 1]
    if (from && to) {
      const share = (headMs - from.tMs) / (to.tMs - from.tMs)
      const at = (a: number, b: number) => a + (b - a) * share
      samples.push(places(from, at(from.eastM, to.eastM), at(from.northM, to.northM), at(from.upM, to.upM), ContrailGrowth.FORMATION_S, from.forms && to.forms))
    }
    return samples
  }

  private pushSegment(vertex: number, a: Sample, b: Sample, spanM: number, tint: readonly [number, number, number], frame: ContrailFrame): number {
    const kind = { persistent: a.point.persistent, lifetimeS: a.point.lifetimeS, spanM, shearPerS: a.point.shearPerS }
    const opacityA = ContrailGrowth.opacity(a.age, kind)
    const opacityB = ContrailGrowth.opacity(b.age, kind)
    if (opacityA <= 0 && opacityB <= 0) return vertex
    const along = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
    if (Math.hypot(along.x, along.y, along.z) < 1e-6) return vertex
    const toMid = { x: (a.x + b.x) / 2 - frame.eye.x, y: (a.y + b.y) / 2 - frame.eye.y, z: (a.z + b.z) / 2 - frame.eye.z }
    const across = this.normalise(this.cross(along, toMid))
    const endOf = (sample: Sample, opacity: number) => {
      const distance = Math.hypot(sample.x - frame.eye.x, sample.y - frame.eye.y, sample.z - frame.eye.z)
      const width = ContrailGrowth.widthM(spanM, sample.age, sample.point.shearPerS)
      const shown = Math.max(width, ContrailSystem.MIN_PIXELS * frame.pixelRad * distance)
      return { half: shown / 2, alpha: opacity * (width / shown) ** ContrailSystem.UNRESOLVED_CONTRAST }
    }
    // Alpha is nil at the edges of the ribbon, so that a trail has no hard side.
    const ends = [{ sample: a, ...endOf(a, opacityA) }, { sample: b, ...endOf(b, opacityB) }]
    const corner = (e: (typeof ends)[number], edge: number): void => {
      const i = vertex * 3
      this.positions[i] = e.sample.x + across.x * e.half * edge
      this.positions[i + 1] = e.sample.y + across.y * e.half * edge
      this.positions[i + 2] = e.sample.z + across.z * e.half * edge
      const j = vertex * 4
      this.colors[j] = tint[0]
      this.colors[j + 1] = tint[1]
      this.colors[j + 2] = tint[2]
      this.colors[j + 3] = edge === 0 ? e.alpha : 0
      vertex++
    }
    // Two strips, left and right of the core, two triangles each.
    const [start, end] = ends
    for (const [outer, inner] of [[-1, 0], [1, 0]] as const) {
      corner(start, outer)
      corner(start, inner)
      corner(end, outer)
      corner(start, inner)
      corner(end, inner)
      corner(end, outer)
    }
    return vertex
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
    ;(this.object.material as MeshBasicMaterial).dispose()
    this.group.removeFromParent()
  }
}
