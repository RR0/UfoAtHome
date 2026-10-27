/** A building's footprint on the ground plane, in the frame of the roads laid by it (see RoadSystem): a rectangle about its centre. */
export interface Footprint {
  x: number
  z: number
  /** Unit direction of one pair of its sides, on the ground plane. */
  alongX: number
  alongZ: number
  /** Half its extent along that direction, and across it. */
  halfAlongM: number
  halfAcrossM: number
}

/**
 * How far the walls of a street stand from the line a survey draws down it.
 *
 * A survey states the width of a carriageway, and a carriageway is not a street: Rue Maurice Thorez in Nanterre is three metres of one-way lane
 * in the IGN's map, between façades eleven metres apart, and drawn at its three metres it was a footpath between houses, off to one side of
 * them. What stands between the walls (parked cars, the pavements) no map of roads says, but the walls themselves are in the scene: the
 * buildings the survey of the surroundings planted. So the street is measured across, from its line to the nearest wall on each side.
 */
export class StreetFacades {
  /** No farther than this from a street's line is a wall taken for its façade: past it, it is a square, a car park, a building set back. */
  static readonly REACH_M = 16
  /** A wall closer to the line than this is a map and a survey that disagree, not a façade: the line runs into the building. */
  static readonly NEAREST_M = 1
  /** Where the façades are read along a street, about the point asked: one reading falls in the gap between two houses, three agree. */
  private static readonly SAMPLES_M = [-3, 0, 3]
  private static readonly CELL_M = 32
  private readonly cells = new Map<number, Footprint[]>()

  /**
   * `lamps` are the public lamps surveyed in the scene, each where it stands (not the ones supposed along a lit street: see StreetLampSpec.supposed).
   * A lamp stands on a pavement or on a wall, never in the carriageway, so where one is the street's lane is not (see RoadSystem).
   */
  constructor(footprints: readonly Footprint[], readonly lamps: readonly { x: number, z: number }[] = []) {
    for (const footprint of footprints) {
      const reach = Math.hypot(footprint.halfAlongM, footprint.halfAcrossM)
      const x0 = Math.floor((footprint.x - reach) / StreetFacades.CELL_M)
      const x1 = Math.floor((footprint.x + reach) / StreetFacades.CELL_M)
      const z0 = Math.floor((footprint.z - reach) / StreetFacades.CELL_M)
      const z1 = Math.floor((footprint.z + reach) / StreetFacades.CELL_M)
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const key = StreetFacades.key(cx, cz)
          const list = this.cells.get(key)
          if (list) list.push(footprint)
          else this.cells.set(key, [footprint])
        }
      }
    }
  }

  /**
   * The façades either side of a street at a point of its line going (dirX, dirZ), unit: metres to the nearest wall on the left of the direction
   * of travel and on its right, each where at least two of the readings along the street found one, and the middle one of them.
   */
  across(x: number, z: number, dirX: number, dirZ: number): { leftM?: number, rightM?: number } {
    const left: number[] = []
    const right: number[] = []
    for (const along of StreetFacades.SAMPLES_M) {
      const px = x + dirX * along
      const pz = z + dirZ * along
      const l = this.wall(px, pz, -dirZ, dirX)
      const r = this.wall(px, pz, dirZ, -dirX)
      if (l !== undefined) left.push(l)
      if (r !== undefined) right.push(r)
    }
    return { leftM: StreetFacades.agreed(left), rightM: StreetFacades.agreed(right) }
  }

  /**
   * The surveyed lamps that stand along a street laid along these points, each as how far to the left of the direction of travel it stands
   * (negative: to the right): those within reach of its line, and abreast of it, not past either of its ends (a lamp past the end of a street
   * stands at a corner, on the pavement of another).
   */
  lampsAlong(points: readonly { x: number, z: number }[]): number[] {
    const across: number[] = []
    for (const lamp of this.lamps) {
      let nearest: { distance: number, lateral: number } | undefined
      for (let i = 1; i < points.length; i++) {
        const ax = points[i - 1].x
        const az = points[i - 1].z
        const dx = points[i].x - ax
        const dz = points[i].z - az
        const length2 = dx * dx + dz * dz
        if (length2 === 0) continue
        const t = ((lamp.x - ax) * dx + (lamp.z - az) * dz) / length2
        if (t < 0 || t > 1) continue
        const length = Math.sqrt(length2)
        // Left of the direction of travel, as RoadSystem lays it: (-dz, dx).
        const lateral = ((lamp.x - ax) * -dz + (lamp.z - az) * dx) / length
        if (!nearest || Math.abs(lateral) < nearest.distance) nearest = { distance: Math.abs(lateral), lateral }
      }
      if (nearest && nearest.distance <= StreetFacades.REACH_M) across.push(nearest.lateral)
    }
    return across
  }

  /**
   * Whether any building, or any surveyed lamp, stands within reach of a street laid along these points: most of a town's streets, out to the
   * edge of the patch, have none of the decor's near them, and are laid at their surveyed width without a wall being looked for.
   */
  near(points: readonly { x: number, z: number }[]): boolean {
    if (points.length === 0) return false
    if (this.lampsAlong(points).length > 0) return true
    const reach = StreetFacades.REACH_M + Math.max(...StreetFacades.SAMPLES_M.map(Math.abs))
    const xs = points.map(point => point.x)
    const zs = points.map(point => point.z)
    for (let cx = Math.floor((Math.min(...xs) - reach) / StreetFacades.CELL_M); cx <= Math.floor((Math.max(...xs) + reach) / StreetFacades.CELL_M); cx++) {
      for (let cz = Math.floor((Math.min(...zs) - reach) / StreetFacades.CELL_M); cz <= Math.floor((Math.max(...zs) + reach) / StreetFacades.CELL_M); cz++) {
        if (this.cells.has(StreetFacades.key(cx, cz))) return true
      }
    }
    return false
  }

  private static agreed(readings: number[]): number | undefined {
    if (readings.length < 2) return undefined
    readings.sort((a, b) => a - b)
    return readings[Math.floor((readings.length - 1) / 2)]
  }

  /** How far from (x, z), going (dx, dz), the first wall stands, within REACH_M; a building the point is inside of is not one. */
  wall(x: number, z: number, dx: number, dz: number): number | undefined {
    let nearest: number | undefined
    const seen = new Set<Footprint>()
    // The cells the ray goes through, a step of half a cell at a time: a footprint is filed in every cell it touches.
    const step = StreetFacades.CELL_M / 2
    for (let travelled = 0; travelled <= StreetFacades.REACH_M + step; travelled += step) {
      const list = this.cells.get(StreetFacades.key(Math.floor((x + dx * travelled) / StreetFacades.CELL_M), Math.floor((z + dz * travelled) / StreetFacades.CELL_M)))
      for (const footprint of list ?? []) {
        if (seen.has(footprint)) continue
        seen.add(footprint)
        const distance = StreetFacades.hit(footprint, x, z, dx, dz)
        if (distance !== undefined && distance <= StreetFacades.REACH_M && (nearest === undefined || distance < nearest)) nearest = distance
      }
    }
    return nearest !== undefined && nearest >= StreetFacades.NEAREST_M ? nearest : undefined
  }

  /** Where a ray enters a footprint, in the footprint's own axes (the slab method), or nothing if it misses or starts inside. */
  private static hit(footprint: Footprint, x: number, z: number, dx: number, dz: number): number | undefined {
    const rx = x - footprint.x
    const rz = z - footprint.z
    const origin = [rx * footprint.alongX + rz * footprint.alongZ, -rx * footprint.alongZ + rz * footprint.alongX]
    const direction = [dx * footprint.alongX + dz * footprint.alongZ, -dx * footprint.alongZ + dz * footprint.alongX]
    const half = [footprint.halfAlongM, footprint.halfAcrossM]
    let enter = -Infinity
    let exit = Infinity
    for (let axis = 0; axis < 2; axis++) {
      if (Math.abs(direction[axis]) < 1e-9) {
        if (Math.abs(origin[axis]) > half[axis]) return undefined
        continue
      }
      const a = (-half[axis] - origin[axis]) / direction[axis]
      const b = (half[axis] - origin[axis]) / direction[axis]
      enter = Math.max(enter, Math.min(a, b))
      exit = Math.min(exit, Math.max(a, b))
    }
    if (exit < enter || exit < 0 || enter < 0) return undefined
    return enter
  }

  private static key(cx: number, cz: number): number {
    return (cx + 50_000) * 100_003 + (cz + 50_000)
  }
}
