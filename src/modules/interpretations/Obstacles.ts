import type { DecorKind, DecorObject } from "../../engine/model/Decor.js"

/** One solid thing of the decor, as a box standing on the ground: its middle, which way it is turned, its half sizes and its top. */
export interface ObstacleBox {
  eastM: number
  northM: number
  /** Its heading's cosine and sine, so that a point is brought into its own axes without a trigonometric call. */
  cos: number
  sin: number
  /** Half its width (across its heading) and half its length (along it), metres. */
  halfWidthM: number
  halfLengthM: number
  /** Its top, metres above the ground at the recording's origin. */
  topM: number
}

/** Where a point inside a box gets out of it nearest: through a side (`nx`, `ny` the way out, `depthM` how far), or over the top. */
export interface ObstacleExit {
  box: ObstacleBox
  /** Out through a side, horizontally: the unit way out, east and north. */
  nx: number
  ny: number
  /** How far it is from that side, metres. */
  depthM: number
  /** How far below the top it is, metres. */
  belowTopM: number
}

/**
 * The solid things of a recording's decor that what an interpretation computes moves among (see InterpretationKind.compute): the buildings,
 * the trees, the walls, as boxes standing on the ground at the recording's origin. So that a lantern carried by the wind slides along the
 * wall it meets rather than through it, and comes to rest on the roof it comes down on, and a flock goes round or over a tower.
 *
 * Kept cheap, since few readings meet anything: the boxes are filed in a grid of cells, and a point asks only the boxes of its own cell;
 * with no decor nothing is asked at all. The ground under each is the recording's origin's, not the relief's: on a hillside a box stands
 * too high or too low by the difference (a few metres in a town; ignored).
 */
export class Obstacles {
  /** No decor: nothing to meet. */
  static readonly NONE = new Obstacles([])
  /** The kinds of decor a lantern or a bird cannot go through. */
  private static readonly SOLID: ReadonlySet<DecorKind> = new Set<DecorKind>(["building", "tree", "wall", "mound", "terrace", "shrub"])
  private static readonly CELL_M = 16
  /** The last set built, by what it was built from, so that the same decor makes the same set (and the same computed bodies). */
  private static last?: { signature: string, obstacles: Obstacles }

  /** A short digest of the boxes: what a cache of computed bodies tells two sets of decor apart by. "" for none. */
  readonly signature: string
  private readonly cells = new Map<number, ObstacleBox[]>()

  private constructor(readonly boxes: readonly ObstacleBox[]) {
    for (const box of boxes) {
      const reach = Math.hypot(box.halfWidthM, box.halfLengthM)
      const [x0, x1] = [Obstacles.cell(box.eastM - reach), Obstacles.cell(box.eastM + reach)]
      const [y0, y1] = [Obstacles.cell(box.northM - reach), Obstacles.cell(box.northM + reach)]
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const key = Obstacles.key(x, y)
        const list = this.cells.get(key)
        if (list) list.push(box)
        else this.cells.set(key, [box])
      }
    }
    let hash = 0x811c9dc5
    for (const box of boxes) {
      for (const value of [box.eastM, box.northM, box.cos, box.halfWidthM, box.halfLengthM, box.topM]) {
        hash = Math.imul(hash ^ Math.round(value * 10), 0x01000193)
      }
    }
    this.signature = boxes.length === 0 ? "" : `${boxes.length}:${(hash >>> 0).toString(36)}`
  }

  /**
   * The solid decor of a recording that stays where it is (what moves, a vehicle driven, is left out), each sized by `sizeOf` (see
   * DecorSystem.sizeOf). The same set for the same decor, which a cache of computed bodies keys on.
   */
  static of(decor: readonly DecorObject[], sizeOf: (object: DecorObject) => { widthM: number, lengthM: number, heightM: number }): Obstacles {
    const boxes: ObstacleBox[] = []
    for (const object of decor) {
      if (!Obstacles.SOLID.has(object.kind) || (object.track?.length ?? 0) > 0) continue
      const size = sizeOf(object)
      if (!(size.heightM > 0) || !(size.widthM > 0) || !(size.lengthM > 0)) continue
      const heading = (object.headingDeg ?? 0) * Math.PI / 180
      boxes.push({
        eastM: object.eastM, northM: object.northM, cos: Math.cos(heading), sin: Math.sin(heading),
        halfWidthM: size.widthM / 2, halfLengthM: size.lengthM / 2, topM: size.heightM
      })
    }
    const built = new Obstacles(boxes)
    if (Obstacles.last?.signature === built.signature) return Obstacles.last.obstacles
    Obstacles.last = { signature: built.signature, obstacles: built }
    return built
  }

  get empty(): boolean {
    return this.boxes.length === 0
  }

  /**
   * The box `x`, `y`, `z` is in, grown by `marginM` on every side but the bottom, and the nearest way out of it; undefined when it is in
   * none. One cell's boxes are asked.
   */
  inside(x: number, y: number, z: number, marginM = 0): ObstacleExit | undefined {
    const list = this.cells.get(Obstacles.key(Obstacles.cell(x), Obstacles.cell(y)))
    if (!list) return undefined
    for (const box of list) {
      if (z > box.topM + marginM) continue
      // Into the box's own axes: `along` its heading, `across` to its right.
      const dx = x - box.eastM, dy = y - box.northM
      const along = dx * box.sin + dy * box.cos
      const across = dx * box.cos - dy * box.sin
      const outAlong = box.halfLengthM + marginM - Math.abs(along)
      const outAcross = box.halfWidthM + marginM - Math.abs(across)
      if (outAlong <= 0 || outAcross <= 0) continue
      const belowTopM = box.topM + marginM - z
      if (outAlong < outAcross) {
        const s = Math.sign(along) || 1
        return { box, nx: box.sin * s, ny: box.cos * s, depthM: outAlong, belowTopM }
      }
      const s = Math.sign(across) || 1
      return { box, nx: box.cos * s, ny: -box.sin * s, depthM: outAcross, belowTopM }
    }
    return undefined
  }

  private static cell(value: number): number {
    return Math.floor(value / Obstacles.CELL_M)
  }

  private static key(x: number, y: number): number {
    return (x + 32768) * 65536 + (y + 32768)
  }
}

/** What the code of a kind computes its bodies among (see InterpretationKind.compute): nothing but the decor, so far. */
export interface ComputeContext {
  obstacles: Obstacles
}
