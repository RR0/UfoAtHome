// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, MeshStandardMaterial } from "three"
import type { Material } from "three"
import type { RailwayLine } from "./terrain/RailwayProvider.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import type { GroundYAt } from "./RoadSystem.js"
import { TrackProfile } from "./TrackProfile.js"
import type { TrackLayout } from "./TrackProfile.js"

/** A point of the patch's own frame: x east, z south (see GeoProjection), y up. */
type Point3 = { x: number, y: number, z: number }

/** The vertices and triangles of one material, gathered over every line before they become one mesh. */
class Batch {
  readonly positions: number[] = []
  readonly indices: number[] = []
  /** Metres along the track, for the sleepers (see RailwaySystem.sleeperMaterial); only the sleeper bed has them. */
  readonly along: number[] = []

  get vertexCount(): number {
    return this.positions.length / 3
  }

  /**
   * A strip between two rails of points, rung by rung: `left[i]` and `right[i]` are the two edges of rung i. Faces up when `left` lies farther across
   * than `right` (see RailwaySystem.lay's `at`), and out when `left` is the lower edge of a side on the far side, or the upper edge of one on the near.
   */
  strip(left: Point3[], right: Point3[], along?: number[]): void {
    const base = this.vertexCount
    for (let i = 0; i < left.length; i++) {
      this.positions.push(left[i].x, left[i].y, left[i].z, right[i].x, right[i].y, right[i].z)
      if (along) this.along.push(along[i], along[i])
    }
    for (let i = 0; i < left.length - 1; i++) {
      const a = base + i * 2
      this.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  /**
   * A straight member of square section from one point to another: a mast, an arm of a cantilever, a span of wire. Its four sides, and its two ends
   * where `capped` (a wire's are a fraction of a pixel, and there are thousands).
   */
  beam(from: Point3, to: Point3, sideM: number, capped = true): void {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dz = to.z - from.z
    const length = Math.hypot(dx, dy, dz)
    if (length < 1e-6) return
    const u = { x: dx / length, y: dy / length, z: dz / length }
    // Any direction across the member, then the third: up for a horizontal member, east for a vertical one.
    const seed = Math.abs(u.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    const vx = u.y * seed.z - u.z * seed.y
    const vy = u.z * seed.x - u.x * seed.z
    const vz = u.x * seed.y - u.y * seed.x
    const vl = Math.hypot(vx, vy, vz)
    const v = { x: vx / vl * sideM / 2, y: vy / vl * sideM / 2, z: vz / vl * sideM / 2 }
    const w = { x: (u.y * v.z - u.z * v.y), y: (u.z * v.x - u.x * v.z), z: (u.x * v.y - u.y * v.x) }
    const corner = (end: Point3, a: number, b: number): Point3 => ({ x: end.x + v.x * a + w.x * b, y: end.y + v.y * a + w.y * b, z: end.z + v.z * a + w.z * b })
    const ring: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]]
    for (let k = 0; k < 4; k++) {
      const [a0, b0] = ring[k]
      const [a1, b1] = ring[(k + 1) % 4]
      this.quad(corner(from, a0, b0), corner(from, a1, b1), corner(to, a1, b1), corner(to, a0, b0))
    }
    if (capped) {
      this.quad(...[...ring].reverse().map(([a, b]) => corner(from, a, b)) as [Point3, Point3, Point3, Point3])
      this.quad(...ring.map(([a, b]) => corner(to, a, b)) as [Point3, Point3, Point3, Point3])
    }
  }

  private quad(a: Point3, b: Point3, c: Point3, d: Point3): void {
    const base = this.vertexCount
    this.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z)
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
}

/** One line laid out: its centre at every rung, the height of its formation there, the direction of travel and the distance along it. */
interface Profile {
  centre: { x: number, z: number }[]
  /** The height of the formation the ballast stands on (see TrackProfile). */
  y: number[]
  /** Unit direction of travel on the ground plane. */
  dir: { x: number, z: number }[]
  along: number[]
}

/**
 * The railways under a scene: for every track its ballast, its sleepers and its two rails at its own gauge, on a formation of its own profile (see
 * TrackProfile: not the bare relief, which has a hole under every bridge), on an embankment or a deck where that stands over the ground, and
 * for an electrified line its catenary: the masts, the contact wire the pantograph runs under at its real height, the messenger wire it hangs from.
 *
 * WHY a system and not decor a survey plants (see SurveyedDecor): a railway is data of the place, as a road is, not an object an author places,
 * moves or names. A town's tracks are tens of kilometres cut into hundreds of sections (252 within a kilometre of the Gare de Lyon, 44 km of track),
 * with a mast every 54 m: as decor objects they would be thousands of entries in the recording and in the editor's list, frozen into the file at
 * the day it was written, when what they are is the survey of today, asked again as the observer moves and credited as such. What an author does
 * need to state (a level crossing of 1970, a line lifted since) is a decor object of its own, in the recording, as a stated road is.
 *
 * WHY the catenary: the arc of a pantograph on a wire (blue-white, bright enough to light the clouds, more often on a frosty night) and the lights
 * of a train seen across a valley are classic explanations of a light in the sky. A reader needs to see where the wire is, and how high: 5.50 m
 * over the rail on a French main line, 5.08 m on a high-speed one.
 *
 * Loaded on demand (see SceneRenderer.buildRailways): most scenes have no line near them.
 */
export class RailwaySystem {
  /** How far apart a track's rungs are at most, metres: a curve of 300 m radius is off its chord by 1.5 cm at this step. */
  static readonly STEP_M = 6
  /** Ballast: from the formation to the top of the sleepers, metres, and its slope (horizontal over vertical) down to the ground. */
  static readonly BALLAST_HEIGHT_M = 0.5
  static readonly BALLAST_SLOPE = 1.5
  /** The shoulder of ballast past the end of the sleepers. */
  static readonly BALLAST_SHOULDER_M = 0.45
  /** A deck under a track that is carried over the ground, when nothing else draws it: its depth under the formation. */
  static readonly DECK_DEPTH_M = 0.8
  /** The bank of an embankment under the ballast, horizontal over vertical: earth holds at 3 for 2. */
  static readonly BANK_SLOPE = 1.5
  /** A concrete sleeper of a French main line, and how far apart they are laid. */
  static readonly SLEEPER_LENGTH_M = 2.4
  static readonly SLEEPER_WIDTH_M = 0.29
  static readonly SLEEPER_SPACING_M = 0.6
  /** A rail (UIC 60): its head and its height over the sleeper, with the pad under it. */
  static readonly RAIL_HEAD_M = 0.072
  static readonly RAIL_HEIGHT_M = 0.18
  /** How far a tram's grooved rail stands out of the street: it does not. Drawn this high so that it is not lost in the ground under it. */
  static readonly TRAM_RAIL_HEIGHT_M = 0.03
  /** Lifted this far off the ground so that what lies on it wins the depth test (see RoadSystem.LIFT_M). */
  static readonly LIFT_M = 0.06

  /**
   * The catenary, by what the line is (SNCF and French tramway practice): the height of the contact wire over the rail, the height of the messenger
   * over it at a mast, how far apart the masts stand, and how far the wire is pulled from side to side at each mast so that it wears the pantograph's
   * strip evenly. A tram has a single wire, no messenger.
   */
  static readonly CATENARY = {
    rail: { contactM: 5.5, systemM: 1.4, spanM: 54, staggerM: 0.2 },
    highSpeed: { contactM: 5.08, systemM: 1.4, spanM: 63, staggerM: 0.2 },
    service: { contactM: 5.5, systemM: 1.2, spanM: 45, staggerM: 0.2 },
    tram: { contactM: 6.0, systemM: 0, spanM: 30, staggerM: 0.2 }
  } as const
  /** How far the messenger sags at mid-span below its height at the masts. */
  static readonly MESSENGER_SAG_M = 0.55
  /** A mast's face, its distance from the axis of its track, and how far it stands over the messenger. */
  static readonly MAST_SIDE_M = 0.26
  static readonly MAST_OFFSET_M = 3.1
  static readonly MAST_ABOVE_M = 0.6
  /** The wires: copper of 107 mm² (12 mm), and a bronze messenger of about 11 mm. */
  static readonly CONTACT_DIAMETER_M = 0.012
  static readonly MESSENGER_DIAMETER_M = 0.011
  /** The tubes of a cantilever. */
  static readonly ARM_SIDE_M = 0.06

  /** How far apart the tracks of one line stand, axis to axis, by what the line is. */
  private static readonly TRACK_SPACING_M = { rail: 3.7, highSpeed: 4.5, tram: 3.1, subway: 3.4, light_rail: 3.4, funicular: 3.2 }

  /** Linear albedos: granite ballast darkened by brake dust, concrete and creosoted wood sleepers, rusted rail sides, galvanised steel, weathered copper. */
  private static readonly BALLAST_ALBEDO: [number, number, number] = [0.17, 0.16, 0.15]
  /** The grass and earth of a bank, a dull summer one, and the weathered concrete of a deck. */
  private static readonly BANK_ALBEDO: [number, number, number] = [0.085, 0.09, 0.05]
  private static readonly DECK_ALBEDO: [number, number, number] = [0.26, 0.255, 0.24]
  private static readonly CONCRETE_ALBEDO: [number, number, number] = [0.36, 0.35, 0.33]
  private static readonly WOOD_ALBEDO: [number, number, number] = [0.07, 0.055, 0.045]
  private static readonly RUST_ALBEDO: [number, number, number] = [0.085, 0.068, 0.058]
  private static readonly STEEL_ALBEDO: [number, number, number] = [0.3, 0.31, 0.32]
  private static readonly COPPER_ALBEDO: [number, number, number] = [0.09, 0.085, 0.07]

  readonly group = new Group()
  private stepM = RailwaySystem.STEP_M
  private drawn = 0

  private readonly ballastMaterial = RailwaySystem.pebbled(RailwaySystem.lambert(RailwaySystem.BALLAST_ALBEDO, true))
  private readonly earthMaterial = RailwaySystem.lambert(RailwaySystem.BANK_ALBEDO, true)
  private readonly deckMaterial = RailwaySystem.lambert(RailwaySystem.DECK_ALBEDO, false)
  private readonly concreteSleepers = RailwaySystem.sleeperMaterial(RailwaySystem.CONCRETE_ALBEDO)
  private readonly woodSleepers = RailwaySystem.sleeperMaterial(RailwaySystem.WOOD_ALBEDO)
  private readonly rustMaterial = RailwaySystem.lambert(RailwaySystem.RUST_ALBEDO, true)
  /** The running surface, polished by the wheels: a metal, which mirrors the sky and, at night, every lamp along the line. */
  private readonly headMaterial = new MeshStandardMaterial({ color: new Color(0.62, 0.62, 0.62), metalness: 1, roughness: 0.28, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  private readonly steelMaterial = RailwaySystem.lambert(RailwaySystem.STEEL_ALBEDO, false)
  private readonly wireMaterial = RailwaySystem.lambert(RailwaySystem.COPPER_ALBEDO, false)

  constructor() {
    this.group.name = "railways"
  }

  /** How many lines are laid. */
  get count(): number {
    return this.drawn
  }

  /** As RoadSystem.setGroundSpacing: two rungs to a cell of the ground, so that a track follows the relief between its vertices. */
  setGroundSpacing(spacingM: number): void {
    this.stepM = Number.isFinite(spacingM) && spacingM > 0 ? Math.min(RailwaySystem.STEP_M, Math.max(1.5, spacingM / 2)) : RailwaySystem.STEP_M
  }

  /**
   * Lays `lines` on a patch centred on (originLat, originLng), reaching `radiusM` from it. Always rebuilt, for the reason RoadSystem.set gives: a track
   * lies on the relief, and the relief is rebuilt as the observer moves.
   */
  set(lines: readonly RailwayLine[], originLat: number, originLng: number, groundYAt: GroundYAt, radiusM = Infinity): void {
    this.clear()
    const projected = lines.map(line => ({
      line,
      path: line.points.map(point => ({ ...geoToLocalMeters(point.lat, point.lng, originLat, originLng), altitudeM: point.altitudeM }))
    }))
    const shown = projected.filter(({ line, path }) => line.level >= 0 && RailwaySystem.within(path, radiusM))
    const offset = RailwaySystem.altitudeOffset(shown, groundYAt)
    const laid = shown.flatMap(({ line, path }) => {
      const layout = this.layoutOf(line, path)
      return layout ? [{ line, layout }] : []
    })
    // The height of the formation of every line together: a line meets the ones at its ends at the same height (see TrackProfile).
    const heights = TrackProfile.heights(laid.map(({ layout }) => layout), groundYAt, offset)
    const batches = {
      ballast: new Batch(), earth: new Batch(), deck: new Batch(), concrete: new Batch(), wood: new Batch(), rust: new Batch(), head: new Batch(), steel: new Batch(), wire: new Batch()
    }
    laid.forEach(({ line, layout }, n) => {
      this.lay(line, { ...layout, y: heights[n] }, groundYAt, batches)
      this.drawn++
    })
    const meshes: [Batch, Material, string, boolean][] = [
      [batches.ballast, this.ballastMaterial, "ballast", false],
      [batches.earth, this.earthMaterial, "embankments", false],
      [batches.deck, this.deckMaterial, "decks", true],
      [batches.concrete, this.concreteSleepers, "sleepers", false],
      [batches.wood, this.woodSleepers, "sleepers wood", false],
      [batches.rust, this.rustMaterial, "rails", false],
      [batches.head, this.headMaterial, "rail heads", false],
      [batches.steel, this.steelMaterial, "catenary masts", true],
      [batches.wire, this.wireMaterial, "catenary wires", false]
    ]
    for (const [batch, material, name, casts] of meshes) {
      const mesh = RailwaySystem.meshOf(batch, material)
      if (!mesh) continue
      mesh.name = `railways ${name}`
      mesh.castShadow = casts
      mesh.receiveShadow = true
      this.group.add(mesh)
    }
  }

  clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      ;(child as Mesh).geometry?.dispose()
    }
    this.drawn = 0
  }

  dispose(): void {
    this.clear()
    for (const material of [this.ballastMaterial, this.earthMaterial, this.deckMaterial, this.concreteSleepers, this.woodSleepers, this.rustMaterial, this.headMaterial, this.steelMaterial, this.wireMaterial]) material.dispose()
  }

  /** Whether a line comes within `radiusM` (and a margin) of the patch's origin, as RoadSystem.within asks of a road. */
  private static within(path: { x: number, z: number }[], radiusM: number): boolean {
    if (!Number.isFinite(radiusM)) return true
    const reach = radiusM * 1.1 + 100
    return path.some((point, i) => Math.hypot(point.x, point.z) <= reach
      || (i > 0 && Math.hypot((point.x + path[i - 1].x) / 2, (point.z + path[i - 1].z) / 2) <= reach))
  }

  /**
   * What to add to an altitude of the map to have the height of the scene: the median, over the points of the lines at grade, of the relief under
   * them less their altitude. The map's altitudes are good to a metre and a half and the relief to a few centimetres, but the two do not share a
   * zero (the scene's is the observer's ground); one offset for the whole patch puts a viaduct where the map has it against the ground the scene draws.
   */
  private static altitudeOffset(shown: { line: RailwayLine, path: { x: number, z: number, altitudeM?: number }[] }[], groundYAt: GroundYAt): number | undefined {
    const differences: number[] = []
    for (const { line, path } of shown) {
      if (line.level !== 0) continue
      for (const point of path) if (point.altitudeM !== undefined) differences.push(groundYAt(point.x, point.z) - point.altitudeM)
    }
    if (differences.length < 5) return undefined
    differences.sort((a, b) => a - b)
    return differences[Math.floor(differences.length / 2)]
  }

  /** A line resampled every step along its centre, with its direction of travel and the map's altitude at each rung where it has one. */
  private layoutOf(line: RailwayLine, path: { x: number, z: number, altitudeM?: number }[]): (TrackLayout & Omit<Profile, "y">) | undefined {
    const centre: { x: number, z: number, altitudeM?: number }[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i]
      const to = path[i + 1]
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / this.stepM))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        const altitudeM = from.altitudeM !== undefined && to.altitudeM !== undefined ? from.altitudeM + (to.altitudeM - from.altitudeM) * t : undefined
        centre.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, altitudeM })
      }
    }
    centre.push(path[path.length - 1])
    if (centre.length < 2) return undefined
    const along = [0]
    for (let i = 1; i < centre.length; i++) along.push(along[i - 1] + Math.hypot(centre[i].x - centre[i - 1].x, centre[i].z - centre[i - 1].z))
    if (along[along.length - 1] < 0.5) return undefined
    const dir = centre.map((_, i) => {
      const before = centre[Math.max(0, i - 1)]
      const after = centre[Math.min(centre.length - 1, i + 1)]
      const dx = after.x - before.x
      const dz = after.z - before.z
      const l = Math.hypot(dx, dz)
      return l < 1e-6 ? { x: 1, z: 0 } : { x: dx / l, z: dz / l }
    })
    return { kind: line.kind, ...(line.highSpeed ? { highSpeed: true } : {}), level: line.level, centre, along, dir }
  }

  /** The ballast, the sleepers and the rails of every track of a line, and its catenary when it has one. */
  private lay(line: RailwayLine, profile: Profile, groundYAt: GroundYAt, batches: Record<"ballast" | "earth" | "deck" | "concrete" | "wood" | "rust" | "head" | "steel" | "wire", Batch>): void {
    const spacing = line.highSpeed ? RailwaySystem.TRACK_SPACING_M.highSpeed : RailwaySystem.TRACK_SPACING_M[line.kind]
    const tracks = Math.min(8, Math.max(1, line.tracks))
    const offsets = Array.from({ length: tracks }, (_, i) => (i - (tracks - 1) / 2) * spacing)
    const tram = line.kind === "tram"
    // A tram's rails are in the street, flush with it: no ballast and no sleepers to see.
    const bedM = tram ? 0 : RailwaySystem.BALLAST_HEIGHT_M
    const lift = RailwaySystem.LIFT_M
    const at = (i: number, acrossM: number, upM: number): Point3 => ({
      // Across the direction of travel as RoadSystem.appendPath offsets a strip: (-dir.z, dir.x) on the ground plane.
      x: profile.centre[i].x - profile.dir[i].z * acrossM,
      y: profile.y[i] + upM,
      z: profile.centre[i].z + profile.dir[i].x * acrossM
    })
    const rungs = profile.centre.map((_, i) => i)
    if (!tram) {
      const topHalf = RailwaySystem.SLEEPER_LENGTH_M / 2 + RailwaySystem.BALLAST_SHOULDER_M + (offsets[offsets.length - 1] ?? 0)
      const topLeft = rungs.map(i => at(i, topHalf, bedM + lift))
      const topRight = rungs.map(i => at(i, -topHalf, bedM + lift))
      batches.ballast.strip(topLeft, topRight)
      if (line.level === 0) {
        // The ballast's own slope, down to the formation and no lower: half a metre. Where the ground at its foot stands higher (a cutting,
        // a crowned relief), it stops on the ground. Where it stands lower, the line is on an embankment, which is earth and grass: drawn
        // so, from the foot of the ballast down to the ground at the slope of a bank. The ballast went down to the ground before, and on the
        // low embankments the relief smooths away (the ground 0.3 to 1.5 m below the middle of the track 2 to 6 m out, on the LGV at Mâcon)
        // a track stood on a grey wall up to two metres high.
        const toe = topHalf + bedM * RailwaySystem.BALLAST_SLOPE
        for (const side of [1, -1]) {
          const foot: Point3[] = []
          const bank: Point3[] = []
          let banked = false
          for (const i of rungs) {
            const point = at(i, side * toe, lift)
            const ground = groundYAt(point.x, point.z) + lift
            const drop = point.y - ground
            if (drop < 0) point.y = Math.min(ground, profile.y[i] + bedM - 0.05 + lift)
            foot.push(point)
            const out = at(i, side * (toe + Math.max(0, drop) * RailwaySystem.BANK_SLOPE), lift)
            out.y = Math.min(groundYAt(out.x, out.z) + lift, point.y)
            if (point.y - out.y > 0.02) banked = true
            bank.push(out)
          }
          const top = side > 0 ? topLeft : topRight
          if (side > 0) batches.ballast.strip(foot, top)
          else batches.ballast.strip(top, foot)
          if (banked) {
            if (side > 0) batches.earth.strip(bank, foot)
            else batches.earth.strip(foot, bank)
          }
        }
      } else {
        // A deck of concrete under the ballast: its sides and its underside, seen from the street under a viaduct.
        const depth = -RailwaySystem.DECK_DEPTH_M
        const edge = topHalf + 0.15
        const deckLeft = rungs.map(i => at(i, edge, bedM + lift + 0.1))
        const deckRight = rungs.map(i => at(i, -edge, bedM + lift + 0.1))
        const bottomLeft = rungs.map(i => at(i, edge, depth))
        const bottomRight = rungs.map(i => at(i, -edge, depth))
        batches.deck.strip(bottomLeft, deckLeft)
        batches.deck.strip(deckRight, bottomRight)
        batches.deck.strip(bottomRight, bottomLeft)
        // The parapet's top, a hand's width, so the ballast is seen to lie in a trough and not on a block.
        batches.deck.strip(deckLeft, rungs.map(i => at(i, topHalf, bedM + lift + 0.1)))
        batches.deck.strip(rungs.map(i => at(i, -topHalf, bedM + lift + 0.1)), deckRight)
      }
    }
    const sleepers = line.service ? batches.wood : batches.concrete
    const railCentre = line.gaugeMm / 2000 + RailwaySystem.RAIL_HEAD_M / 2
    const railHeight = tram ? RailwaySystem.TRAM_RAIL_HEIGHT_M : RailwaySystem.RAIL_HEIGHT_M
    const base = bedM + lift
    for (const offset of offsets) {
      if (!tram) {
        const half = RailwaySystem.SLEEPER_LENGTH_M / 2
        sleepers.strip(rungs.map(i => at(i, offset + half, base + 0.004)), rungs.map(i => at(i, offset - half, base + 0.004)), profile.along)
      }
      for (const side of [1, -1]) {
        const middle = offset + side * railCentre
        const half = RailwaySystem.RAIL_HEAD_M / 2
        const topL = rungs.map(i => at(i, middle + half, base + railHeight))
        const topR = rungs.map(i => at(i, middle - half, base + railHeight))
        batches.head.strip(topL, topR)
        batches.rust.strip(rungs.map(i => at(i, middle + half, base)), topL)
        batches.rust.strip(topR, rungs.map(i => at(i, middle - half, base)))
      }
    }
    if (line.electrification === "overhead" && line.kind !== "subway" && line.kind !== "funicular") {
      this.catenary(line, profile, offsets, base + railHeight, at, groundYAt, batches)
    }
  }

  /**
   * The overhead line of every track: a mast every span on the outer side of each outer track, a cantilever from it over its track, a portal across
   * the line where it has more than two; the contact wire level at its height over the rail, pulled from side to side at each mast; the messenger
   * above it, sagging between masts. Masts are counted along each section of the map from its middle, so a short one still has its own.
   */
  private catenary(
    line: RailwayLine, profile: Profile, offsets: number[], railTopM: number, at: (i: number, acrossM: number, upM: number) => Point3, groundYAt: GroundYAt,
    batches: Record<"steel" | "wire", Batch>
  ): void {
    const spec = line.kind === "tram" ? RailwaySystem.CATENARY.tram
      : line.highSpeed ? RailwaySystem.CATENARY.highSpeed
        : line.service ? RailwaySystem.CATENARY.service : RailwaySystem.CATENARY.rail
    const length = profile.along[profile.along.length - 1]
    const spans = Math.max(1, Math.round(length / spec.spanM))
    const span = length / spans
    // The masts at the middle of each span's length, so that the ends of a section, where the next one takes over, have none twice.
    const stations = Array.from({ length: spans }, (_, k) => (k + 0.5) * span)
    const contactUp = railTopM + spec.contactM
    const messengerUp = contactUp + spec.systemM
    const mastTop = (spec.systemM > 0 ? messengerUp : contactUp) + RailwaySystem.MAST_ABOVE_M
    const outer = offsets[offsets.length - 1]
    const portal = offsets.length > 2
    const sides = offsets.length === 1 ? [1] : [1, -1]
    const atDistance = (s: number, acrossM: number, upM: number): Point3 => {
      // The rung at or before `s`, by halves.
      let i = 0
      let j = profile.along.length - 2
      while (i < j) {
        const m = (i + j + 1) >> 1
        if (profile.along[m] <= s) i = m
        else j = m - 1
      }
      const t = Math.min(1, Math.max(0, (s - profile.along[i]) / Math.max(1e-6, profile.along[i + 1] - profile.along[i])))
      const a = at(i, acrossM, upM)
      const b = at(i + 1, acrossM, upM)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
    }
    for (const s of stations) {
      for (const side of sides) {
        const mastAcross = side * (outer + RailwaySystem.MAST_OFFSET_M)
        // On the ground beside a line at grade; on the deck of one carried over it.
        const foot = atDistance(s, mastAcross, 0)
        if (line.level === 0) foot.y = groundYAt(foot.x, foot.z)
        const head = atDistance(s, mastAcross, mastTop)
        batches.steel.beam(foot, head, RailwaySystem.MAST_SIDE_M)
        if (portal) continue
        // The cantilever over the track on this side: a stay at the messenger's height, a tube from low on the mast up to it over the track.
        const track = sides.length === 1 ? offsets[0] : side * outer
        const over = track - side * 0.6
        const support = spec.systemM > 0 ? messengerUp : contactUp + 0.3
        batches.steel.beam(atDistance(s, mastAcross, support), atDistance(s, over, support), RailwaySystem.ARM_SIDE_M)
        batches.steel.beam(atDistance(s, mastAcross, contactUp - 0.4), atDistance(s, over, support), RailwaySystem.ARM_SIDE_M)
      }
      if (portal) {
        const across = outer + RailwaySystem.MAST_OFFSET_M
        batches.steel.beam(atDistance(s, across, mastTop - 0.2), atDistance(s, -across, mastTop - 0.2), RailwaySystem.MAST_SIDE_M * 0.8)
      }
    }
    // The wires of each track, the whole length of the section: from its start to the first mast, from mast to mast, and on to its end.
    const supports = [0, ...stations, length]
    for (const [track, offset] of offsets.entries()) {
      const stagger = (k: number): number => k === 0 || k === supports.length - 1 ? 0 : ((k + track) % 2 === 0 ? 1 : -1) * spec.staggerM
      for (let k = 0; k < supports.length - 1; k++) {
        const from = supports[k]
        const to = supports[k + 1]
        if (to - from < 0.1) continue
        batches.wire.beam(atDistance(from, offset + stagger(k), contactUp), atDistance(to, offset + stagger(k + 1), contactUp), RailwaySystem.CONTACT_DIAMETER_M, false)
        if (spec.systemM <= 0) continue
        // The messenger, as a parabola between two masts; from a section's end to its first mast, half of one.
        const pieces = 4
        // Where along a whole span between two masts each point is: the start of a section is the middle of the span it shares with the one before.
        const sagged = (f: number): number => {
          const u = k === 0 ? 0.5 + f / 2 : k === supports.length - 2 ? f / 2 : f
          return messengerUp - RailwaySystem.MESSENGER_SAG_M * 4 * u * (1 - u)
        }
        for (let p = 0; p < pieces; p++) {
          const f0 = p / pieces
          const f1 = (p + 1) / pieces
          batches.wire.beam(
            atDistance(from + (to - from) * f0, offset, sagged(f0)),
            atDistance(from + (to - from) * f1, offset, sagged(f1)),
            RailwaySystem.MESSENGER_DIAMETER_M, false)
        }
      }
    }
  }

  private static meshOf(batch: Batch, material: Material): Mesh | undefined {
    if (batch.indices.length === 0) return undefined
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(batch.positions), 3))
    if (batch.along.length > 0) geometry.setAttribute("aAlong", new BufferAttribute(new Float32Array(batch.along), 1))
    geometry.setIndex(new BufferAttribute(new Uint32Array(batch.indices), 1))
    geometry.computeVertexNormals()
    return new Mesh(geometry, material)
  }

  private static lambert(albedo: [number, number, number], onGround: boolean): MeshLambertMaterial {
    return new MeshLambertMaterial({
      color: new Color(...albedo),
      // What lies on the relief is pulled forward a little in depth, as a road is (see RoadSystem.meshOf).
      ...(onGround ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {})
    })
  }

  /**
   * The ballast as stones: a crushed granite of 30 to 60 mm, light and dark faces, and the rust and brake dust in patches. Read in the patch's
   * own metres and let go of with the distance, as the grain of a road is (see RoadSystem.addGrain), before a stone is finer than a pixel: a flat
   * grey reads as a poured surface, and in a low light as a wall.
   */
  private static pebbled(material: MeshLambertMaterial): MeshLambertMaterial {
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBallast;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBallast = position;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying vec3 vBallast;
float ballastHash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}
float ballastNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ballastHash(i), ballastHash(i + vec2(1.0, 0.0)), f.x), mix(ballastHash(i + vec2(0.0, 1.0)), ballastHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
        .replace("#include <map_fragment>", `#include <map_fragment>
{
  float eye = length(vViewPosition);
  vec2 at = vBallast.xz + vec2(0.0, vBallast.y);
  float stones = (ballastHash(floor(at * 22.0)) - 0.5) * 0.9 * (1.0 - smoothstep(4.0, 18.0, eye))
    + (ballastNoise(at * 6.0) - 0.5) * 0.5 * (1.0 - smoothstep(15.0, 60.0, eye))
    + (ballastNoise(at * 0.7) - 0.5) * 0.35 * (1.0 - smoothstep(80.0, 300.0, eye));
  diffuseColor.rgb *= 1.0 + stones;
}`)
    }
    material.customProgramCacheKey = () => "rr0-railway-ballast"
    return material
  }

  /**
   * The sleepers, as a band the length of a sleeper along each track: a sleeper every SLEEPER_SPACING_M, the ballast of the crib between them. Drawn
   * by the band's own shader, the share of each pixel that is sleeper filtered over the pixel's own length of track: tens of thousands of sleepers
   * cost nothing, and far off, where one is smaller than a pixel, the band is their mean colour and not a flicker.
   */
  private static sleeperMaterial(albedo: [number, number, number]): MeshLambertMaterial {
    const material = new MeshLambertMaterial({ color: new Color(1, 1, 1), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
    const sleeper = new Color(...albedo)
    const crib = new Color(...RailwaySystem.BALLAST_ALBEDO)
    material.onBeforeCompile = shader => {
      shader.uniforms.uSleeper = { value: sleeper }
      shader.uniforms.uCrib = { value: crib }
      shader.uniforms.uSpacing = { value: RailwaySystem.SLEEPER_SPACING_M }
      shader.uniforms.uDuty = { value: RailwaySystem.SLEEPER_WIDTH_M / RailwaySystem.SLEEPER_SPACING_M }
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aAlong;\nvarying float vAlong;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlong = aAlong;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying float vAlong;
uniform vec3 uSleeper;
uniform vec3 uCrib;
uniform float uSpacing;
uniform float uDuty;
// How much of [0, x] periods is sleeper: the integral of a pulse of width uDuty at the start of each period.
float sleeperIntegral(float x) {
  return floor(x) * uDuty + min(fract(x), uDuty);
}`)
        .replace("#include <map_fragment>", `#include <map_fragment>
{
  float u = vAlong / uSpacing;
  float w = max(fwidth(u), 1e-4);
  float cover = (sleeperIntegral(u + 0.5 * w) - sleeperIntegral(u - 0.5 * w)) / w;
  diffuseColor.rgb *= mix(uCrib, uSleeper, clamp(cover, 0.0, 1.0));
}`)
    }
    material.customProgramCacheKey = () => "rr0-railway-sleepers"
    return material
  }
}
