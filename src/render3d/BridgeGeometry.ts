import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from "three"
import type { BridgeStructure, MeasuredDecorSize } from "../engine/model/Decor.js"

/** The geometries one bridge is drawn with, one per material. */
export interface BridgeParts {
  /** The deck slab and the abutments: concrete. */
  concrete: BufferGeometry
  /** The road on the deck and on the embankments. */
  road: BufferGeometry
  /** The two banks of earth either side of the span. */
  earth: BufferGeometry
  /** Posts and rails. */
  railing: BufferGeometry
}

/**
 * Builds a road bridge at its own measurements — see the "bridge" decor kind.
 *
 * In the object's own frame: x across the road, y up from the ground, z along the road, centred on
 * the middle of the span. The road surface is at `heightM` over the span and comes down linearly
 * to the ground at both ends of the length. Each part is merged into ONE geometry per material:
 * a railing is hundreds of posts, and a draw call each would cost more than the whole scene.
 */
export class BridgeGeometry {
  static readonly DEFAULT_DECK_THICKNESS_M = 1.2
  static readonly DEFAULT_RAILING_HEIGHT_M = 1.05
  static readonly DEFAULT_POST_SPACING_M = 1.5
  static readonly DEFAULT_RAILS = 2
  /** Horizontal for vertical on the embankments' sides: 3 to 2, what a road bank holds at. */
  static readonly BANK_SLOPE = 1.5
  static readonly ABUTMENT_THICKNESS_M = 1
  static readonly POST_SIDE_M = 0.08
  static readonly RAIL_HEIGHT_M = 0.08
  static readonly RAIL_DEPTH_M = 0.06
  /** Stations along each embankment: its slope is straight, but the railing and road follow it. */
  static readonly BANK_STATIONS = 12

  /** The size a bridge is drawn at when nothing is stated: an overpass over a dual carriageway. */
  static readonly NATURAL_SIZE: MeasuredDecorSize = Object.freeze({ widthM: 9, lengthM: 40, heightM: 6.5 })

  private readonly span: number
  private readonly bank: number
  private readonly deck: number
  private readonly railHeight: number
  private readonly postSpacing: number
  private readonly rails: number

  constructor(private readonly size: MeasuredDecorSize, structure: BridgeStructure = {}) {
    this.span = Math.min(size.lengthM, Math.max(0, structure.spanM ?? size.lengthM))
    this.bank = (size.lengthM - this.span) / 2
    this.deck = Math.min(size.heightM, structure.deckThicknessM ?? BridgeGeometry.DEFAULT_DECK_THICKNESS_M)
    this.railHeight = structure.railing?.heightM ?? BridgeGeometry.DEFAULT_RAILING_HEIGHT_M
    this.postSpacing = Math.max(0.3, structure.railing?.postSpacingM ?? BridgeGeometry.DEFAULT_POST_SPACING_M)
    this.rails = Math.max(0, Math.round(structure.railing?.rails ?? BridgeGeometry.DEFAULT_RAILS))
  }

  /** Height of the road surface at `z` along the bridge. */
  roadAt(z: number): number {
    const beyond = Math.abs(z) - this.span / 2
    if (beyond <= 0) return this.size.heightM
    if (this.bank <= 0) return 0
    return Math.max(0, this.size.heightM * (1 - beyond / this.bank))
  }

  build(): BridgeParts {
    const { widthM: width, heightM: height } = this.size
    const halfSpan = this.span / 2
    const concrete: BufferGeometry[] = []
    if (this.span > 0) {
      concrete.push(BridgeGeometry.box(width, this.deck, this.span, 0, height - this.deck / 2, 0))
      // The abutments: a wall across each end of the span, from the ground up to the deck.
      for (const side of [-1, 1]) {
        const wallHeight = height - this.deck
        if (wallHeight > 0 && this.bank > 0) {
          concrete.push(BridgeGeometry.box(width + 1, wallHeight, BridgeGeometry.ABUTMENT_THICKNESS_M,
            0, wallHeight / 2, side * (halfSpan - BridgeGeometry.ABUTMENT_THICKNESS_M / 2)))
        }
      }
    }
    const road: BufferGeometry[] = []
    if (this.span > 0) road.push(BridgeGeometry.box(width, 0.04, this.span, 0, height + 0.02, 0))
    const earth: BufferGeometry[] = []
    for (const side of [-1, 1]) {
      if (this.bank <= 0) continue
      earth.push(this.embankment(side))
      road.push(this.bankRoad(side))
    }
    const railing: BufferGeometry[] = []
    for (const edge of [-1, 1]) railing.push(...this.railing(edge * (width / 2 - BridgeGeometry.POST_SIDE_M)))
    return {
      concrete: BridgeGeometry.merge(concrete),
      road: BridgeGeometry.merge(road),
      earth: BridgeGeometry.merge(earth),
      railing: BridgeGeometry.merge(railing)
    }
  }

  /** A bank of earth: a trapezoid in section, the road's width on top, sloping sides, from the
   * abutment down to the ground at the end of the length. */
  private embankment(side: number): BufferGeometry {
    const halfWidth = this.size.widthM / 2
    const stations = this.stations(side)
    const positions: number[] = []
    const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
    }
    const section = (z: number) => {
      const top = this.roadAt(z)
      const foot = halfWidth + BridgeGeometry.BANK_SLOPE * top
      return {
        leftFoot: new Vector3(-foot, 0, z), leftTop: new Vector3(-halfWidth, top, z),
        rightTop: new Vector3(halfWidth, top, z), rightFoot: new Vector3(foot, 0, z)
      }
    }
    for (let index = 1; index < stations.length; index++) {
      const a = section(stations[index - 1])
      const b = section(stations[index])
      // Wound so that each face looks outwards whichever side of the span it is on.
      const flip = side > 0
      const face = (p: Vector3, q: Vector3, r: Vector3, t: Vector3) => (flip ? quad(p, q, r, t) : quad(t, r, q, p))
      face(a.leftFoot, a.leftTop, b.leftTop, b.leftFoot)
      face(a.leftTop, a.rightTop, b.rightTop, b.leftTop)
      face(a.rightTop, a.rightFoot, b.rightFoot, b.rightTop)
    }
    // The face towards the span, behind the abutment.
    const end = section(stations[0])
    if (side > 0) quad(end.leftFoot, end.rightFoot, end.rightTop, end.leftTop)
    else quad(end.leftTop, end.rightTop, end.rightFoot, end.leftFoot)
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    return geometry
  }

  /** The road surface on one embankment, a strip a hair above the bank's own top. */
  private bankRoad(side: number): BufferGeometry {
    const halfWidth = this.size.widthM / 2
    const stations = this.stations(side)
    const positions: number[] = []
    for (let index = 1; index < stations.length; index++) {
      const z0 = stations[index - 1]
      const z1 = stations[index]
      const y0 = this.roadAt(z0) + 0.02
      const y1 = this.roadAt(z1) + 0.02
      const pts = side > 0
        ? [[-halfWidth, y0, z0], [halfWidth, y0, z0], [halfWidth, y1, z1], [-halfWidth, y1, z1]]
        : [[-halfWidth, y1, z1], [halfWidth, y1, z1], [halfWidth, y0, z0], [-halfWidth, y0, z0]]
      for (const at of [0, 2, 1, 0, 3, 2]) positions.push(...pts[at])
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    return geometry
  }

  /** From the abutment out to the end of the length, on one side (+1 or -1). */
  private stations(side: number): number[] {
    const out: number[] = []
    for (let index = 0; index <= BridgeGeometry.BANK_STATIONS; index++) {
      out.push(side * (this.span / 2 + (this.bank * index) / BridgeGeometry.BANK_STATIONS))
    }
    return out
  }

  /**
   * Posts every `postSpacing` along the whole length, and `rails` rails between each pair — the top
   * one at the railing's height, the others evenly below it — following the road up and down the
   * banks. What is left between two posts and two rails is an opening: a rectangle of whatever is
   * behind.
   */
  private railing(x: number): BufferGeometry[] {
    const half = this.size.lengthM / 2
    const count = Math.max(1, Math.round(this.size.lengthM / this.postSpacing))
    const zs: number[] = []
    for (let index = 0; index <= count; index++) zs.push(-half + (this.size.lengthM * index) / count)
    const parts: BufferGeometry[] = []
    const side = BridgeGeometry.POST_SIDE_M
    for (const z of zs) {
      parts.push(BridgeGeometry.box(side, this.railHeight, side, x, this.roadAt(z) + this.railHeight / 2, z))
    }
    for (let level = 1; level <= this.rails; level++) {
      const above = (this.railHeight * level) / this.rails - BridgeGeometry.RAIL_HEIGHT_M / 2
      for (let index = 1; index < zs.length; index++) {
        const from = new Vector3(x, this.roadAt(zs[index - 1]) + above, zs[index - 1])
        const to = new Vector3(x, this.roadAt(zs[index]) + above, zs[index])
        parts.push(BridgeGeometry.beam(from, to))
      }
    }
    return parts
  }

  private static box(width: number, height: number, length: number, x: number, y: number, z: number): BufferGeometry {
    return new BoxGeometry(width, height, length).translate(x, y, z)
  }

  /** A rail from one post to the next, tilted with the road. */
  private static beam(from: Vector3, to: Vector3): BufferGeometry {
    const direction = new Vector3().subVectors(to, from)
    const geometry = new BoxGeometry(BridgeGeometry.RAIL_DEPTH_M, BridgeGeometry.RAIL_HEIGHT_M, direction.length())
    const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction.clone().normalize())
    const middle = new Vector3().addVectors(from, to).multiplyScalar(0.5)
    return geometry.applyMatrix4(new Matrix4().compose(middle, turn, new Vector3(1, 1, 1)))
  }

  /**
   * One geometry out of several, positions and normals only. By hand, for the reason
   * DecorSystem.repeatOnGrid gives: three's own merge utility lives under three/examples.
   */
  static merge(parts: BufferGeometry[]): BufferGeometry {
    const flat = parts.map(part => (part.getIndex() ? part.toNonIndexed() : part))
    const total = flat.reduce((sum, part) => sum + part.getAttribute("position").count, 0)
    const positions = new Float32Array(total * 3)
    const normals = new Float32Array(total * 3)
    let offset = 0
    for (const part of flat) {
      const position = part.getAttribute("position")
      const normal = part.getAttribute("normal")
      positions.set(position.array as Float32Array, offset * 3)
      if (normal) normals.set(normal.array as Float32Array, offset * 3)
      offset += position.count
    }
    const merged = new BufferGeometry()
    merged.setAttribute("position", new Float32BufferAttribute(positions, 3))
    merged.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    for (const part of parts) part.dispose()
    for (const part of flat) part.dispose()
    return merged
  }
}
