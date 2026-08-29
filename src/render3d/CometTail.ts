import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three"
import { horizontalToCartesian } from "./skyColors.js"

interface Vector {
  x: number
  y: number
  z: number
}

/**
 * Draws a comet's tail: a band running out of the head, away from the Sun.
 *
 * The head itself is not drawn here. It goes through the same path as every other bright point in
 * this sky (SceneRenderer.setBodyMesh, with the glare its real magnitude earns), because that is
 * what it is — a naked-eye comet's coma is minutes of arc across, and no figure for it is on record
 * in the catalog, so drawing a disc of some invented size would be illustration rather than
 * reconstruction. The tail is the whole difference between a comet and a bright star, and the tail
 * is the part that has a source.
 *
 * WHERE it points and HOW FAR it reaches are not decided here: Comets works both out from the real
 * geometry, projecting a physical length in space rather than pasting on a stored number of degrees
 * (see Comets.tailEndAt). This class only puts the band on the sphere between the two directions it
 * is given.
 *
 * The straight band is the ION tail, which is the one that genuinely points along the Sun's line
 * and the one whose colour is a real observable rather than a choice: it glows blue because carbon
 * monoxide ions fluoresce in the blue, and every photograph of every comet in this catalog shows
 * it. The DUST tail is the other thing people saw — broader, yellower, curved, trailing behind the
 * comet along its own orbit instead of along the Sun's line — and it is not modelled. A real bright
 * comet therefore looked wider and warmer than this draws it.
 */
export class CometTail {
  /** Points along the band. Enough that a tail spanning tens of degrees follows its great circle
   * rather than cutting the corner. */
  private static readonly POINTS = 24
  private static readonly SEGMENTS = CometTail.POINTS - 1
  /** Three vertices across — faint edge, bright spine, faint edge — so the band fades sideways
   * instead of ending at a drawn border, the same construction the meteors use. */
  private static readonly ACROSS = 3
  private static readonly VERTICES_PER_SEGMENT = (CometTail.ACROSS - 1) * 6
  /** Half-width at the head, in degrees, and how much of its own length the band has spread to by
   * the far end. A real tail does widen away from the nucleus — it is material leaving it and
   * dispersing — and a twentieth of the length is at the narrow end of what the photographs show,
   * which is the right direction to err in for a straight ion tail drawn without its dust. */
  private static readonly HEAD_HALF_WIDTH_DEG = 0.15
  private static readonly SPREAD_FRACTION = 0.05
  /** How the brightness falls from the head to the tip. A tail's surface brightness drops steeply
   * with distance from the nucleus — most of what anybody sees is the first third of it. */
  private static readonly FADE_POWER = 1.8

  readonly object: Mesh
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private head?: Vector
  private tip?: Vector
  private brightness = 0

  constructor(private readonly radius: number) {
    const vertices = CometTail.SEGMENTS * CometTail.VERTICES_PER_SEGMENT
    this.positions = new Float32Array(vertices * 3)
    this.colors = new Float32Array(vertices * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.object = new Mesh(
      geometry,
      // Additive and unlit, like every other emitting thing in this sky. Fog off: it is at the
      // distance of the planets, not inside the weather. Both sides, since a band built from a
      // cross product faces whichever way the geometry took it.
      new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, side: DoubleSide })
    )
    this.object.frustumCulled = false
  }

  /**
   * The tail now in the sky: where its head is, where its far end is, and how brightly to draw it.
   *
   * `brightness` is 0 to 1 and comes from the comet's own magnitude through the same conversion the
   * stars go through, so a tail never outshines the head it belongs to. Passing no tail end — which
   * is what happens for the apparitions with no recorded tail length, half the catalog — clears it.
   */
  set(head: { altitudeDeg: number; azimuthDeg: number } | undefined, tailEnd: { altitudeDeg: number; azimuthDeg: number } | undefined, brightness: number): void {
    this.head = head && horizontalToCartesian(head.altitudeDeg, head.azimuthDeg, 1)
    this.tip = tailEnd && horizontalToCartesian(tailEnd.altitudeDeg, tailEnd.azimuthDeg, 1)
    this.brightness = brightness
    this.rebuild()
  }

  private rebuild(): void {
    const geometry = this.object.geometry
    const head = this.head
    const tip = this.tip
    if (!head || !tip || this.brightness <= 0) {
      geometry.setDrawRange(0, 0)
      return
    }
    const separation = this.angleBetween(head, tip)
    if (separation <= 0) {
      geometry.setDrawRange(0, 0)
      return
    }
    const spread = (separation * CometTail.SPREAD_FRACTION * Math.PI) / 180
    const pointAt = (share: number): Vector => this.scale(this.slerp(head, tip, share), this.radius)
    // Widening away from the nucleus, and dimming faster than it widens.
    const halfWidthAt = (share: number): number => this.radius * ((CometTail.HEAD_HALF_WIDTH_DEG * Math.PI) / 180 + spread * share)
    const brightnessAt = (share: number): number => this.brightness * (1 - share) ** CometTail.FADE_POWER
    let vertex = 0
    for (let i = 1; i < CometTail.POINTS; i++) {
      const from = (i - 1) / CometTail.SEGMENTS
      const to = i / CometTail.SEGMENTS
      vertex = this.pushBand(vertex, pointAt(from), pointAt(to), halfWidthAt(from), halfWidthAt(to), brightnessAt(from), brightnessAt(to))
    }
    geometry.setDrawRange(0, vertex)
    ;(geometry.getAttribute("position") as BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute("color") as BufferAttribute).needsUpdate = true
  }

  /** One segment, as a pair of quads sharing a bright spine. The sideways offset is perpendicular
   * to both the band and the line of sight, which is what keeps it facing the observer wherever on
   * the sphere it falls. */
  private pushBand(vertex: number, from: Vector, to: Vector, halfFrom: number, halfTo: number, brightFrom: number, brightTo: number): number {
    const perpendicular = this.normalise(this.cross(this.normalise(from), this.normalise(this.subtract(to, from))))
    for (let side = 0; side < CometTail.ACROSS - 1; side++) {
      const inner = side - 1
      const outer = side
      const a = this.across(from, perpendicular, halfFrom, inner)
      const b = this.across(to, perpendicular, halfTo, inner)
      const c = this.across(from, perpendicular, halfFrom, outer)
      const d = this.across(to, perpendicular, halfTo, outer)
      const dim = (offset: number, brightness: number): number => (offset === 0 ? brightness : 0)
      vertex = this.push(vertex, a, dim(inner, brightFrom))
      vertex = this.push(vertex, b, dim(inner, brightTo))
      vertex = this.push(vertex, c, dim(outer, brightFrom))
      vertex = this.push(vertex, b, dim(inner, brightTo))
      vertex = this.push(vertex, d, dim(outer, brightTo))
      vertex = this.push(vertex, c, dim(outer, brightFrom))
    }
    return vertex
  }

  private across(point: Vector, perpendicular: Vector, halfWidth: number, offset: number): Vector {
    return {
      x: point.x + perpendicular.x * halfWidth * offset,
      y: point.y + perpendicular.y * halfWidth * offset,
      z: point.z + perpendicular.z * halfWidth * offset
    }
  }

  private push(vertex: number, point: Vector, brightness: number): number {
    const i = vertex * 3
    this.positions[i] = point.x
    this.positions[i + 1] = point.y
    this.positions[i + 2] = point.z
    const value = Math.max(0, Math.min(1, brightness))
    // Blue, and for a real reason: an ion tail's light is fluorescence from carbon monoxide ions in
    // the blue, which is why it photographs blue against a dust tail's warm white.
    this.colors[i] = value * 0.55
    this.colors[i + 1] = value * 0.75
    this.colors[i + 2] = value
    return vertex + 1
  }

  /** A point `share` of the way from one direction to the other, along the great circle between
   * them — the path a straight tail really traces across the sky. A straight line through the
   * sphere would cut inside it, which for a tail tens of degrees long is visibly wrong. */
  private slerp(from: Vector, to: Vector, share: number): Vector {
    const angle = this.angleBetweenRadians(from, to)
    if (angle < 1e-9) return from
    const sine = Math.sin(angle)
    const a = Math.sin((1 - share) * angle) / sine
    const b = Math.sin(share * angle) / sine
    return { x: from.x * a + to.x * b, y: from.y * a + to.y * b, z: from.z * a + to.z * b }
  }

  private angleBetween(a: Vector, b: Vector): number {
    return (this.angleBetweenRadians(a, b) * 180) / Math.PI
  }

  private angleBetweenRadians(a: Vector, b: Vector): number {
    const dot = a.x * b.x + a.y * b.y + a.z * b.z
    return Math.acos(Math.min(1, Math.max(-1, dot)))
  }

  private scale(v: Vector, factor: number): Vector {
    return { x: v.x * factor, y: v.y * factor, z: v.z * factor }
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
