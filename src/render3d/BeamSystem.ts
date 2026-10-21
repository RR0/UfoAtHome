import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from "three"
import type { Vector3 } from "three"
import type { AerialPerspective, Rgb } from "../engine/atmosphere/AerialPerspective.js"
import { LaserBeamSighting } from "../engine/interpretation/LaserBeam.js"
import type { BeamJson, BeamView } from "../engine/interpretation/LaserBeam.js"

/** What the beams are drawn against, at one instant. */
export interface BeamFrame {
  /** The latitude and longitude the scene's frame is laid out from (the decor's reference pose). */
  reference: { lat: number; lng: number }
  /** Where that place stands in the scene, metres, and how much a metre east of it is in the scene now (see SceneRenderer.bodyEastScale). */
  origin: { x: number; z: number }
  eastScale: number
  /** The altitude above the sea the scene's y = 0 stands for. */
  siteElevationM: number
  eye: Vector3
  /** The angle of one pixel of the picture, radians: nothing is drawn thinner. */
  pixelRad: number
  /** What a candela per square metre is in the scene's own light (see ScatteredSky.relativeScale). */
  relativeScale: number
  air: AerialPerspective
  /** How much of a light at a point of the scene reaches the eye, per channel. */
  transmittanceTo: (x: number, y: number, z: number) => Rgb
  /** The ground under a point of the scene: a beam stops where it meets it. */
  groundYAt: (x: number, z: number) => number
}

interface Placed {
  x: number
  y: number
  z: number
  altitudeM: number
  widthM: number
  powerW: number
}

/**
 * Draws the beams an interpretation claims (see BeamJson): each a ribbon in the scene proper, where its light really is, turned to face the eye
 * and lit, metre by metre, by what the air there scatters of it towards the eye (see LaserBeamSighting).
 *
 * In the scene and not on the celestial shell: a beam crosses the scene a few metres over the heads of the people watching it, passes behind
 * the buildings and the trees, and goes off to a point on the horizon. Additive, since it is light; depth-tested against what stands in front
 * of it, not writing any depth of its own. The air between it and the eye dims it as it does a lamp (see SceneRenderer.transmittanceTo).
 *
 * A beam narrower than two pixels is drawn two pixels wide with the same light, spread: a laser beam a centimetre across, ten metres off, is
 * far below what the eye resolves, and is seen as a line as wide as its acuity, as bright as all its light shared over that.
 */
export class BeamSystem {
  private static readonly MAX_SEGMENTS = 6000
  /** The least a ribbon is drawn across, in pixels, edge to edge (see ContrailSystem.MIN_PIXELS). */
  private static readonly MIN_PIXELS = 2
  /** Two ribbons, the line and its halo, of two strips of two triangles each. */
  private static readonly VERTICES_PER_SEGMENT = 24
  /**
   * How far round the beam its halo spreads, metres, and the share of its light the halo carries: the light the haze sends off the beam a
   * second time, close round it, which the photographs of the Meudon shot show as a faint glow beside the line near the building. A width in
   * metres and not in degrees: a few metres off the halo is a band beside the line, a kilometre off it is narrower than a pixel and part of the
   * line. Both are judged on the photographs, not computed: multiple scattering is not modelled.
   */
  static readonly HALO_RADIUS_M = 0.3
  static readonly HALO_SHARE = 0.15
  /** The most a pixel is ever given, relative: under a half float's largest (see PlumeSystem.BRIGHTEST_RELATIVE). */
  private static readonly BRIGHTEST_RELATIVE = 60000

  readonly group = new Group()
  private readonly mesh: Mesh
  private readonly positions = new Float32Array(BeamSystem.MAX_SEGMENTS * BeamSystem.VERTICES_PER_SEGMENT * 3)
  private readonly colors = new Float32Array(BeamSystem.MAX_SEGMENTS * BeamSystem.VERTICES_PER_SEGMENT * 3)
  private segments = 0
  /** The points of each beam as last drawn, in the scene, for what is under the pointer (see pickAt). */
  private drawn: { id: string; points: Placed[] }[] = []
  /** The beams cut into points, for a place and an air: cutting them again is only needed when one of those changes. */
  private cut?: { lat: number; lng: number; air: AerialPerspective; views: Map<BeamJson, BeamView> }

  constructor() {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, side: DoubleSide }))
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 8
    this.mesh.name = "beams"
    this.group.name = "beams"
    this.group.add(this.mesh)
  }

  /** How many stretches of beam are drawn. */
  get segmentCount(): number {
    return this.segments
  }

  /** Draws `beams` as they are at `t` (ms of the recording). */
  update(beams: readonly BeamJson[], t: number, frame: BeamFrame): void {
    const views = this.viewsOf(beams, t, frame)
    let vertex = 0
    this.segments = 0
    this.drawn = []
    for (const view of views) {
      const colour = LaserBeamSighting.colourOf(view.wavelengthNm)
      const placed = this.place(view, frame)
      this.drawn.push({ id: view.id, points: placed })
      for (let i = 0; i + 1 < placed.length; i++) {
        if (this.segments >= BeamSystem.MAX_SEGMENTS) break
        const next = this.pushSegment(vertex, placed[i], placed[i + 1], view.wavelengthNm, colour, frame)
        if (next > vertex) this.segments++
        vertex = next
      }
    }
    const geometry = this.mesh.geometry
    geometry.setDrawRange(0, vertex)
    for (const name of ["position", "color"] as const) {
      const attribute = geometry.getAttribute(name) as BufferAttribute
      attribute.clearUpdateRanges()
      if (vertex > 0) attribute.addUpdateRange(0, vertex * 3)
      attribute.needsUpdate = true
    }
  }

  private viewsOf(beams: readonly BeamJson[], t: number, frame: BeamFrame): BeamView[] {
    const { lat, lng } = frame.reference
    if (!this.cut || this.cut.lat !== lat || this.cut.lng !== lng || this.cut.air !== frame.air) this.cut = { lat, lng, air: frame.air, views: new Map() }
    const views = this.cut.views
    // A beam's points do not depend on the instant, only whether it is on does.
    return LaserBeamSighting.onAt(beams, t).map(beam => {
      let view = views.get(beam)
      if (!view) views.set(beam, view = { id: beam.id, wavelengthNm: beam.wavelengthNm, samples: LaserBeamSighting.samplesOf(beam, frame.reference, frame.air) })
      return view
    })
  }

  /** The points of a beam in the scene, up to where it first meets the ground. */
  private place(view: BeamView, frame: BeamFrame): Placed[] {
    const placed: Placed[] = []
    for (const sample of view.samples) {
      const x = frame.origin.x + sample.eastM * frame.eastScale
      const z = frame.origin.z - sample.northM
      const y = sample.upM - frame.siteElevationM
      // The first point is where it leaves the emitter, which may stand on the ground: only what comes after is stopped by it.
      if (placed.length > 0 && y < frame.groundYAt(x, z)) break
      placed.push({ x, y, z, altitudeM: sample.altitudeM, widthM: sample.widthM, powerW: sample.powerW })
    }
    return placed
  }

  private pushSegment(vertex: number, a: Placed, b: Placed, wavelengthNm: number, colour: readonly [number, number, number], frame: BeamFrame): number {
    const along = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
    const length = Math.hypot(along.x, along.y, along.z)
    if (length < 1e-6) return vertex
    const direction = { x: along.x / length, y: along.y / length, z: along.z / length }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
    const toEye = { x: frame.eye.x - mid.x, y: frame.eye.y - mid.y, z: frame.eye.z - mid.z }
    const distance = Math.hypot(toEye.x, toEye.y, toEye.z)
    if (distance < 1e-3) return vertex
    // The angle the light has to turn by, from the way the beam goes to the way to the eye.
    const cosTurn = (direction.x * toEye.x + direction.y * toEye.y + direction.z * toEye.z) / distance
    const sinTurn = Math.sqrt(Math.max(0, 1 - cosTurn * cosTurn))
    const coefficients = LaserBeamSighting.coefficientsAt(frame.air, wavelengthNm, (a.altitudeM + b.altitudeM) / 2)
    const scattered = LaserBeamSighting.phasedScattering(coefficients, cosTurn)
    const through = frame.transmittanceTo(mid.x, mid.y, mid.z)
    const minShownAt = (point: Placed): number => BeamSystem.MIN_PIXELS * frame.pixelRad * Math.hypot(point.x - frame.eye.x, point.y - frame.eye.y, point.z - frame.eye.z)
    // The halo, which a picture shows only where it is wider than the line: farther off, its light is the line's.
    const haloShare = (point: Placed): number => point.widthM + 2 * BeamSystem.HALO_RADIUS_M > minShownAt(point) ? BeamSystem.HALO_SHARE : 0
    const endOf = (point: Placed, widthM: number, share: number) => {
      const shown = Math.max(widthM, minShownAt(point))
      // A ribbon that fades from its middle to nothing at its edges carries half the light of a flat one as wide: its middle is twice as bright.
      const luminance = 2 * share * LaserBeamSighting.luminanceCdM2(point.powerW, wavelengthNm, scattered, shown, sinTurn)
      const level = colour.map((channel, c) => Math.min(BeamSystem.BRIGHTEST_RELATIVE, luminance * frame.relativeScale * channel * through[c])) as [number, number, number]
      const toPoint = { x: frame.eye.x - point.x, y: frame.eye.y - point.y, z: frame.eye.z - point.z }
      const across = this.normalise(this.cross(along, toPoint))
      return { point, half: shown / 2, level, across }
    }
    const ribbons = [
      [endOf(a, a.widthM, 1 - haloShare(a)), endOf(b, b.widthM, 1 - haloShare(b))],
      [endOf(a, a.widthM + 2 * BeamSystem.HALO_RADIUS_M, haloShare(a)), endOf(b, b.widthM + 2 * BeamSystem.HALO_RADIUS_M, haloShare(b))]
    ]
    for (const ends of ribbons) {
      if (ends.every(end => Math.max(...end.level) <= 0)) continue
      const corner = (end: (typeof ends)[number], edge: number): void => {
        const i = vertex * 3
        this.positions[i] = end.point.x + end.across.x * end.half * edge
        this.positions[i + 1] = end.point.y + end.across.y * end.half * edge
        this.positions[i + 2] = end.point.z + end.across.z * end.half * edge
        const lit = edge === 0 ? 1 : 0
        this.colors[i] = end.level[0] * lit
        this.colors[i + 1] = end.level[1] * lit
        this.colors[i + 2] = end.level[2] * lit
        vertex++
      }
      const [start, finish] = ends
      for (const outer of [-1, 1] as const) {
        corner(start, outer)
        corner(start, 0)
        corner(finish, outer)
        corner(start, 0)
        corner(finish, 0)
        corner(finish, outer)
      }
    }
    return vertex
  }

  /**
   * The beam a ray from the eye passes nearest, if it passes within `toleranceRad` of one, and how far along the ray: the angle a stretch of
   * beam is missed by, measured from the eye, so that a beam a centimetre wide is found a few pixels round its line wherever it is.
   */
  pickAt(origin: Vector3, direction: Vector3, toleranceRad: number): { id: string; distanceM: number } | undefined {
    let best: { id: string; distanceM: number; angle: number } | undefined
    for (const beam of this.drawn) {
      for (let i = 0; i + 1 < beam.points.length; i++) {
        const a = beam.points[i]
        const b = beam.points[i + 1]
        // The closest points of the ray and the stretch, along each (see Eberly's segment-to-line distance).
        const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
        const w = { x: a.x - origin.x, y: a.y - origin.y, z: a.z - origin.z }
        const uu = u.x * u.x + u.y * u.y + u.z * u.z
        const ud = u.x * direction.x + u.y * direction.y + u.z * direction.z
        const uw = u.x * w.x + u.y * w.y + u.z * w.z
        const dw = direction.x * w.x + direction.y * w.y + direction.z * w.z
        const denominator = uu - ud * ud
        const s = denominator > 1e-9 ? Math.min(1, Math.max(0, (ud * dw - uw) / denominator)) : 0
        const point = { x: a.x + u.x * s, y: a.y + u.y * s, z: a.z + u.z * s }
        const along = (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y + (point.z - origin.z) * direction.z
        if (along <= 0) continue
        const off = Math.hypot(point.x - origin.x - direction.x * along, point.y - origin.y - direction.y * along, point.z - origin.z - direction.z * along)
        const angle = Math.atan2(off, along)
        if (angle <= toleranceRad && (!best || angle < best.angle)) best = { id: beam.id, distanceM: Math.hypot(point.x - origin.x, point.y - origin.y, point.z - origin.z), angle }
      }
    }
    return best && { id: best.id, distanceM: best.distanceM }
  }

  private cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  }

  private normalise(v: { x: number; y: number; z: number }) {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as MeshBasicMaterial).dispose()
    this.group.removeFromParent()
  }
}
