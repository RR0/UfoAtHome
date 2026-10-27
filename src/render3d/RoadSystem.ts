// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, Vector2 } from "three"
import type { RoadSurface, RoadWay } from "./terrain/RoadProvider.js"
import type { StatedRoad } from "../engine/model/Road.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import type { StreetFacades } from "./StreetFacades.js"

/** Where the ground is, in world units, under a point of the scene — SceneRenderer.groundYUnder. */
export type GroundYAt = (x: number, z: number) => number

/** Where a strip lies across its line at one rung: its middle, metres to the left of the direction of travel, and its half width. */
type Lateral = { offsetM: number, halfM: number }

/** A street across, at one rung of its line, in metres to the left of the direction of travel (right is negative): the carriageway, and each pavement from its kerb to its outer edge. */
interface StreetAcross {
  carriageway: Lateral
  left?: { kerbM: number, outerM: number }
  right?: { kerbM: number, outerM: number }
}

/**
 * The roads under a scene, drawn as real carriageways lying on the real relief.
 *
 * Drawn rather than photographed, and the reason is arithmetic. The ground is seen from a observer's
 * eye at 1.70 m, so almost edge-on: on a 720 x 405 frame over a 60 degree field, one metre of
 * ground a hundred metres out is an eighth of a pixel, and a seven-metre road is four fifths of
 * one. Sharpening the photograph under it does not help — the whole road is thinner than a pixel
 * however many texels it was cut from. A drawn carriageway has a width in the world instead of in
 * the texture, so it survives the same perspective that flattens the photograph.
 *
 * Two kinds of road are drawn here and they are NOT drawn alike. One is stated by the case file —
 * measured at the time, by the people who were there — and is the ground the observer was actually
 * on. The other comes from a survey of today (see RoadProvider.contemporary): useful for placing
 * oneself, and not evidence of anything, because a road network is not what it was. Sixty years of
 * widening, realignment and abandonment stand between today's survey and the night of an account,
 * and an unsealed ranch track is the first thing to go. So a contemporary road is drawn faint, and
 * the credit says whose survey it is and that it is of today.
 */
export class RoadSystem {
  /** How far apart a ribbon's rungs are, metres: close enough to follow a wash or a bank, far
   * enough that a kilometre of road is a few hundred vertices rather than a few thousand. */
  static readonly STEP_M = 8
  /** How far apart the rungs of a ribbon are NOW: STEP_M, or half the cell of a finer mesh (see setGroundSpacing). */
  private stepM = RoadSystem.STEP_M
  /** Lifted this far off the ground so the carriageway wins the depth test against the very
   * surface it is laid on, without standing visibly above it. */
  static readonly LIFT_M = 0.06
  /**
   * Drawn right AFTER the ground: just over the patch's own order (see SceneRenderer.TERRAIN_RENDER_ORDER, 1) and under the clouds and the compass. A surveyed
   * road is faint (it is a survey of today), so it is blended with whatever is already in the picture where it lies. Drawn first, as it was with no order at
   * all, that was the sky behind the ground (bright below the horizon at night), and the ground, a little farther in depth than the ribbon, never covered it
   * again: the road came out as a glow, brightest where the sky is, hidden in patches where the ground stood over it.
   */
  static readonly RENDER_ORDER = 1.05
  /** The paint is drawn over the carriageway it is on (see RoadMarkings). */
  static readonly MARKINGS_RENDER_ORDER = 1.06
  /** The albedo of the barrier between two carriageways: galvanised steel, or concrete, weathered. */
  private static readonly BARRIER_ALBEDO: [number, number, number] = [0.32, 0.33, 0.34]
  /** The albedo of a road paint: white, weathered. */
  private static readonly MARKINGS_ALBEDO: [number, number, number] = [0.55, 0.55, 0.5]
  /**
   * How much the grain of the surface varies its colour, by surface. Asphalt is mottled but even: its aggregate is a few millimetres, finer than any pixel past
   * a metre, and its repairs a shade apart. At 0.8 the octaves summed to nearly twice and nearly nothing of the albedo at the observer's feet, which is a
   * cobbled or stony track, not a street (Rue Maurice Thorez in Nanterre read as one). Gravel and dirt are as uneven as that.
   */
  private static readonly GRAIN_CONTRAST: Record<RoadSurface, number> = { paved: 0.25, gravel: 1.1, dirt: 1.1 }
  /**
   * The pavements of a street: a strip this wide along each side of the carriageway, raised by a kerb. Drawn for the streets the map says are
   * urban, and where a way is not a side street's mouth (see crossesAnother).
   */
  static readonly SIDEWALK_WIDTH_M = 1.8
  /**
   * A pavement narrower than this, between a carriageway and a wall, is none: a lane between walls. Wider, it is whatever the carriageway leaves of
   * the street. The carriageway is what the survey says it is and no wider: the IGN's width is from kerb to kerb, and a street eleven metres from
   * wall to wall that the map gives three metres is a lane one car goes down (Rue Maurice Thorez in Nanterre), not a road; widened to a fifth of
   * the street a pavement, it was one two cars could pass on.
   */
  private static readonly SIDEWALK_NONE_M = 0.8
  /** How far from its line a street's middle is taken to be, at most: the IGN's stated precision. Farther, it is the walls that are of another street. */
  private static readonly STREET_MIDDLE_MOST_M = 2.5
  /** How far a lamp's column stands clear of the carriageway, at least: its own radius and a little. */
  private static readonly LAMP_CLEARANCE_M = 0.4
  /** Where a lamp nobody surveyed is drawn: this far onto the pavement from its kerb, the usual place of a column, or half the pavement if narrower. */
  private static readonly LAMP_FROM_KERB_M = 0.5
  /** How near a street's line a lamp nobody surveyed must be to be taken for one of its lamps, metres: within the street. */
  private static readonly KERB_REACH_M = 12
  static readonly SIDEWALK_KERB_M = 0.12
  /** Streets narrower than this have no room for one (a lane, a cycle path), and a carriageway wider than the usual is a road with no pavements of its own. */
  private static readonly SIDEWALK_MIN_ROAD_M = 3.5
  private static readonly SIDEWALK_ALBEDO: [number, number, number] = [0.3, 0.29, 0.27]
  /** What a contemporary road is drawn at, against a stated one's full presence — see the class
   * doc comment. Enough to place oneself by, not enough to be mistaken for what was there. */
  static readonly CONTEMPORARY_OPACITY = 0.45

  /** Linear-light albedos, from what these surfaces actually are: fresh asphalt is very dark and
   * weathers pale, desert gravel is the ground it was cut from, a dirt track is that ground wet or
   * compacted. Lit by the scene's own lights like everything else — nothing is tinted here. */
  private static readonly ALBEDO: Record<RoadSurface, [number, number, number]> = {
    paved: [0.16, 0.16, 0.17],
    gravel: [0.42, 0.38, 0.31],
    dirt: [0.34, 0.28, 0.21]
  }

  /** Where the patch's own origin stands from one fixed point of the recording, so the grain of a road is the same from one patch to the next (see GrassDetail). */
  private readonly grainOrigin = new Vector2()
  private grainReference?: { lat: number, lng: number }
  /** The streets laid between walls by the last set, each by its rungs and how it lies across at each: where a supposed lamp goes (see atKerb). */
  private laidStreets: { rungs: { x: number, z: number, dirX: number, dirZ: number }[], across: (x: number, z: number, dirX: number, dirZ: number) => StreetAcross }[] = []
  /** A paint being laid is dropped if another set of roads came since: it was for the patch before. */
  private markingsToken = 0
  private static markingsModule?: Promise<typeof import("./RoadMarkings.js")>

  readonly group = new Group()
  /** What a survey of today reports, drawn faint, and what the case file states, drawn whole. Two
   * groups rather than one, because they arrive at different times and from different places: the
   * stated ones the moment a recording is loaded, the surveyed ones whenever the archive or the
   * service answers. */
  private readonly surveyed = new Group()
  private readonly stated = new Group()

  constructor() {
    this.group.name = "roads"
    this.surveyed.name = "roads surveyed"
    this.stated.name = "roads stated"
    this.group.add(this.surveyed, this.stated)
  }

  /**
   * Lays `ways` on the ground around an observer at (originLat, originLng).
   *
   * Always rebuilds, and that is not laziness. A carriageway is drawn at the height of the ground
   * under each of its rungs, so it belongs to the relief it was laid on: the first version of this
   * skipped a rebuild whose roads and place were unchanged, and a patch rebuilt under them left a
   * whole network hanging at the heights of the patch before. Deciding not to fetch is the
   * caller's business (see SceneRenderer.buildRoads); deciding not to drape is nobody's.
   */
  /**
   * Tells the ribbons how far apart the vertices of the ground they are laid on stand. A ribbon is flat between two rungs and the ground is not: with
   * rungs eight metres apart on a mesh with a vertex every seven, the ribbon dipped under the triangles between them and came out above them
   * elsewhere, and the carriageway was drawn as dark polygons lying on the ground, and half sunk in it. Two rungs to a cell keeps the two within the lift.
   */
  setGroundSpacing(spacingM: number): void {
    this.stepM = Number.isFinite(spacingM) && spacingM > 0 ? Math.min(RoadSystem.STEP_M, Math.max(1.5, spacingM / 2)) : RoadSystem.STEP_M
  }

  /**
   * `facades`, when the scene has buildings round the observer, are where the walls of its streets stand: an urban street is then laid from wall
   * to wall (see StreetFacades) rather than at the width of its carriageway alone.
   */
  set(allWays: RoadWay[], originLat: number, originLng: number, groundYAt: GroundYAt, contemporary: boolean, radiusM = Infinity, facades?: StreetFacades): void {
    // Only what the patch can show: an archive holds the roads of the whole of a drive, and a town's worth of pavements is paid for by every one of them.
    const ways = RoadSystem.within(allWays, originLat, originLng, radiusM)
    RoadSystem.empty(this.surveyed)
    this.laidStreets = []
    this.markingsToken++
    this.anchorGrain(originLat, originLng)
    // One mesh per SURFACE, not per way. A town's network is five hundred ways — around Socorro it
    // is 490 — and five hundred draw calls to put down what is, visually, three materials would
    // cost more than everything else in the frame put together. They share a material anyway, so
    // there is nothing to lose by sharing a buffer.
    const bySurface = new Map<RoadSurface, { positions: number[]; indices: number[] }>()
    const paths = ways.map(way => way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng)))
    const streets = ways.map((way, at) => this.streetOf(way, paths[at], facades))
    for (const [at, way] of ways.entries()) {
      const batch = bySurface.get(way.surface) ?? { positions: [], indices: [] }
      bySurface.set(way.surface, batch)
      const street = streets[at]
      this.appendPath(paths[at], way.widthM, groundYAt, batch,
        street ? { lateralAt: (x, z, dirX, dirZ) => street(x, z, dirX, dirZ).carriageway } : {})
    }
    for (const [surface, batch] of bySurface) {
      const mesh = this.meshOf(surface, batch, contemporary)
      if (mesh) this.surveyed.add(mesh)
    }
    const pavements = this.sidewalks(ways, paths, streets, groundYAt)
    if (pavements.indices.length > 0) {
      // Solid whatever the survey's day, unlike the carriageways: a pavement stands up from the ground, and a faint one is a pane of glass along the
      // street with the road seen through its kerb. The walls it runs along are of the same day and drawn solid too.
      const mesh = this.meshOf("paved", pavements, false, RoadSystem.SIDEWALK_ALBEDO, false)
      if (mesh) {
        mesh.name = "roads sidewalks"
        this.surveyed.add(mesh)
      }
    }
    this.paint(ways, originLat, originLng, groundYAt, contemporary)
  }

  /**
   * Lays the paint of the roads, the first time a scene has any road wide enough to carry it: the code that draws it is fetched then and not before, and
   * the paint of the roads of the patch before is not laid on this one if it comes late (see markingsToken).
   */
  private paint(ways: RoadWay[], originLat: number, originLng: number, groundYAt: GroundYAt, contemporary: boolean): void {
    if (!ways.some(way => way.surface === "paved" && way.widthM >= 5.5 && way.kind !== "roundabout")) return
    const token = this.markingsToken
    void (RoadSystem.markingsModule ??= import("./RoadMarkings.js")).then(({ RoadMarkings }) => {
      if (token !== this.markingsToken) return
      const batch = { positions: [] as number[], indices: [] as number[] }
      const laid = RoadMarkings.lay(ways, originLat, originLng, (points, widthM, options) =>
        this.appendPath(points, widthM, groundYAt, batch, { offsetM: options.offsetM, liftM: RoadSystem.LIFT_M + options.liftM, minHalfM: options.minHalfM }))
      if (laid > 0 && batch.indices.length > 0) {
        const mesh = this.meshOf("paved", batch, contemporary, RoadSystem.MARKINGS_ALBEDO, false)
        if (mesh) {
          mesh.name = "roads markings"
          mesh.renderOrder = RoadSystem.MARKINGS_RENDER_ORDER
          // Over the carriageway it is on, which is already over the ground.
          mesh.material.polygonOffsetFactor = -4
          mesh.material.polygonOffsetUnits = -4
          this.surveyed.add(mesh)
        }
      }
      // The barrier between two carriageways of a motorway: it keeps the light off the other lane as it keeps the traffic.
      const barrier = RoadMarkings.barrierGeometry(RoadMarkings.barriers(ways, originLat, originLng), groundYAt)
      if (barrier.indices.length > 0) {
        const mesh = this.meshOf("paved", barrier, contemporary, RoadSystem.BARRIER_ALBEDO, false)
        if (mesh) {
          mesh.name = "roads barriers"
          mesh.material.polygonOffset = false
          mesh.castShadow = true
          this.surveyed.add(mesh)
        }
      }
      this.onMarkings?.()
    })
  }

  /** Called when the paint of a set of roads arrives, a moment after the roads: the scene draws again. */
  onMarkings?: () => void

  /** Keeps the grain of the surfaces where it was from one patch to the next: the fixed point is the first patch's, and another place entirely starts over. */
  private anchorGrain(originLat: number, originLng: number): void {
    if (this.grainReference) {
      const from = geoToLocalMeters(this.grainReference.lat, this.grainReference.lng, originLat, originLng)
      if (Math.hypot(from.x, from.z) > 20000) this.grainReference = undefined
    }
    this.grainReference ??= { lat: originLat, lng: originLng }
    const reference = geoToLocalMeters(this.grainReference.lat, this.grainReference.lng, originLat, originLng)
    // A point of this patch's own metres, in the fixed point's: the patch's origin is where the fixed point is, seen from it, the other way.
    this.grainOrigin.set(-reference.x, -reference.z)
  }

  /**
   * ONLY the roads that come within `radiusM` (and a margin) of the patch's origin: a road with a point, or the middle of a segment, that near. All of them
   * for an unbounded radius.
   */
  private static within(ways: RoadWay[], originLat: number, originLng: number, radiusM: number): RoadWay[] {
    if (!Number.isFinite(radiusM)) return ways
    const reach = radiusM * 1.1 + 100
    return ways.filter(way => {
      let previous: { x: number, z: number } | undefined
      for (const point of way.points) {
        const here = geoToLocalMeters(point.lat, point.lng, originLat, originLng)
        if (Math.hypot(here.x, here.z) <= reach) return true
        if (previous && Math.hypot((here.x + previous.x) / 2, (here.z + previous.z) / 2) <= reach) return true
        previous = here
      }
      return false
    })
  }

  /**
   * How an urban paved street lies across at each rung of its line: where the scene has buildings along it, the carriageway the survey states in
   * the middle of the street and the pavements out to the walls (see StreetFacades), and its pavements at their usual width past the carriageway
   * where it has none. Nothing for any other road, which is laid at its own width on its own line. Read once a rung, for the carriageway, its
   * pavements and their kerbs alike.
   *
   * The middle of the street is the same all along a way, not the middle at each rung: walls step back and forward from one house to the next,
   * and a carriageway that followed them zigzagged down the street. Only the pavements' outer edges follow the walls, which is what pavements do.
   */
  private streetOf(way: RoadWay, path: { x: number, z: number }[], facades: StreetFacades | undefined): ((x: number, z: number, dirX: number, dirZ: number) => StreetAcross) | undefined {
    if (!way.urban || way.surface !== "paved") return undefined
    const surveyed = RoadSystem.surveyedAcross(way)
    if (!facades || !facades.near(path)) return () => surveyed
    const read = new Map<string, { leftM?: number, rightM?: number }>()
    const wallsAt = (x: number, z: number, dirX: number, dirZ: number) => {
      const key = `${x.toFixed(2)}:${z.toFixed(2)}`
      let walls = read.get(key)
      if (!walls) {
        walls = facades.across(x, z, dirX, dirZ)
        read.set(key, walls)
      }
      return walls
    }
    const rungs = this.rungsOf(path)
    const middles = rungs.flatMap(rung => {
      const walls = wallsAt(rung.x, rung.z, rung.dirX, rung.dirZ)
      return walls.leftM !== undefined && walls.rightM !== undefined ? [(walls.leftM - walls.rightM) / 2] : []
    }).sort((a, b) => a - b)
    const lamps = facades.lampsAlong(path)
    if (middles.length === 0 && lamps.length === 0) return () => surveyed
    const between = middles.length > 0 ? middles[Math.floor((middles.length - 1) / 2)] : 0
    const middle = RoadSystem.clearOf(lamps, way.widthM / 2, Math.max(-RoadSystem.STREET_MIDDLE_MOST_M, Math.min(RoadSystem.STREET_MIDDLE_MOST_M, between)))
    const laid = { rungs, across: (x: number, z: number, dirX: number, dirZ: number) => RoadSystem.betweenWalls(way, middle, wallsAt(x, z, dirX, dirZ).leftM, wallsAt(x, z, dirX, dirZ).rightM) }
    this.laidStreets.push(laid)
    return (x, z, dirX, dirZ) => {
      const walls = wallsAt(x, z, dirX, dirZ)
      return RoadSystem.betweenWalls(way, middle, walls.leftM, walls.rightM)
    }
  }

  /**
   * The middle of a lane `halfM` wide nearest `preferredM` that leaves every lamp in `lampsM` (each how far to the left of the street's line it
   * stands) on a pavement: within the survey's precision of its line, and `preferredM` itself where no such middle is.
   */
  private static clearOf(lampsM: number[], halfM: number, preferredM: number): number {
    const clear = (middle: number) => lampsM.every(lamp => Math.abs(lamp - middle) >= halfM + RoadSystem.LAMP_CLEARANCE_M)
    if (clear(preferredM)) return preferredM
    const most = RoadSystem.STREET_MIDDLE_MOST_M
    for (let away = 0.1; away <= 2 * most; away += 0.1) {
      for (const middle of [preferredM - away, preferredM + away]) {
        if (Math.abs(middle) <= most && clear(middle)) return middle
      }
    }
    return preferredM
  }

  /**
   * Where a lamp that nobody surveyed stands, a point of the patch's own metres near a street laid between walls: at its kerb, on the pavement of
   * the side it was put on, or on the other's if that side has none. The same point where it is near no such street. See StreetLampSpec.supposed.
   */
  atKerb(x: number, z: number): { x: number, z: number } {
    let nearest: { rung: { x: number, z: number, dirX: number, dirZ: number }, across: StreetAcross, distance: number } | undefined
    for (const street of this.laidStreets) {
      for (const rung of street.rungs) {
        const distance = Math.hypot(x - rung.x, z - rung.z)
        if (distance <= RoadSystem.KERB_REACH_M && (!nearest || distance < nearest.distance)) nearest = { rung, across: street.across(rung.x, rung.z, rung.dirX, rung.dirZ), distance }
      }
    }
    if (!nearest) return { x, z }
    const { rung, across } = nearest
    const lateral = (x - rung.x) * -rung.dirZ + (z - rung.z) * rung.dirX
    const along = (x - rung.x) * rung.dirX + (z - rung.z) * rung.dirZ
    const own = lateral >= across.carriageway.offsetM ? across.left : across.right
    const pavement = own ?? across.left ?? across.right
    if (!pavement) return { x, z }
    const outward = Math.sign(pavement.outerM - pavement.kerbM)
    const at = pavement.kerbM + outward * Math.min(RoadSystem.LAMP_FROM_KERB_M, Math.abs(pavement.outerM - pavement.kerbM) / 2)
    return { x: rung.x + rung.dirX * along - rung.dirZ * at, z: rung.z + rung.dirZ * along + rung.dirX * at }
  }

  /** Where the rungs of a line stand, and which way it goes at each (see appendPath). */
  private rungsOf(points: { x: number; z: number }[]): { x: number, z: number, dirX: number, dirZ: number }[] {
    const centre = this.resample(points)
    return centre.map((point, i) => {
      const before = centre[Math.max(0, i - 1)]
      const after = centre[Math.min(centre.length - 1, i + 1)]
      const dx = after.x - before.x
      const dz = after.z - before.z
      const length = Math.hypot(dx, dz)
      return length < 1e-6 ? { x: point.x, z: point.z, dirX: 1, dirZ: 0 } : { x: point.x, z: point.z, dirX: dx / length, dirZ: dz / length }
    })
  }

  /** A street the scene has no walls for: its carriageway on its line, at its width, and pavements of the usual width either side if it is wide enough for them. */
  private static surveyedAcross(way: RoadWay): StreetAcross {
    const half = way.widthM / 2
    const carriageway = { offsetM: 0, halfM: half }
    if (way.widthM < RoadSystem.SIDEWALK_MIN_ROAD_M) return { carriageway }
    return { carriageway, left: { kerbM: half, outerM: half + RoadSystem.SIDEWALK_WIDTH_M }, right: { kerbM: -half, outerM: -half - RoadSystem.SIDEWALK_WIDTH_M } }
  }

  /**
   * A street whose middle is `middleM` from its line, with walls `leftM` and `rightM` from it where there are: the carriageway the survey states
   * in the middle, and each pavement from its kerb out to the wall, or of the usual width where there is none. A pavement narrower than
   * SIDEWALK_NONE_M is none: the carriageway runs up to the wall there.
   */
  private static betweenWalls(way: RoadWay, middleM: number, leftM: number | undefined, rightM: number | undefined): StreetAcross {
    const half = way.widthM / 2
    const carriageway = { offsetM: middleM, halfM: half }
    const leftKerb = middleM + half
    const rightKerb = middleM - half
    const leftOuter = leftM ?? leftKerb + RoadSystem.SIDEWALK_WIDTH_M
    const rightOuter = -(rightM ?? -rightKerb + RoadSystem.SIDEWALK_WIDTH_M)
    return {
      carriageway,
      ...(leftOuter - leftKerb >= RoadSystem.SIDEWALK_NONE_M ? { left: { kerbM: leftKerb, outerM: leftOuter } } : {}),
      ...(rightKerb - rightOuter >= RoadSystem.SIDEWALK_NONE_M ? { right: { kerbM: rightKerb, outerM: rightOuter } } : {})
    }
  }

  /**
   * A pavement along each side of every urban street, from its kerb out (see streetOf), raised by the kerb and with the kerb's face standing up from
   * the carriageway: a pavement lying flat on the ground has no edge to be seen by, from an eye at its own height. A rung that falls on another
   * street's carriageway is left out, which leaves the gap a side street's mouth has between two pavements.
   */
  private sidewalks(
    ways: RoadWay[], paths: { x: number, z: number }[][], streets: (((x: number, z: number, dirX: number, dirZ: number) => StreetAcross) | undefined)[], groundYAt: GroundYAt
  ): { positions: number[]; indices: number[] } {
    const batch = { positions: [] as number[], indices: [] as number[] }
    // Where the carriageways are, by cell of ground: asking every segment of every road for every rung of every pavement took three seconds for a town.
    const grid = new SegmentGrid(ways, paths)
    ways.forEach((_, at) => {
      const street = streets[at]
      if (!street) return
      const skip = (x: number, z: number) => grid.onAnotherCarriageway(x, z, at)
      for (const side of ["left", "right"] as const) {
        const pavementAt = (x: number, z: number, dirX: number, dirZ: number): Lateral | undefined => {
          const pavement = street(x, z, dirX, dirZ)[side]
          return pavement && { offsetM: (pavement.kerbM + pavement.outerM) / 2, halfM: Math.abs(pavement.outerM - pavement.kerbM) / 2 }
        }
        this.appendPath(paths[at], 0, groundYAt, batch, { lateralAt: pavementAt, liftM: RoadSystem.LIFT_M + RoadSystem.SIDEWALK_KERB_M, minHalfM: 0, skip })
        this.appendKerb(paths[at], groundYAt, batch, (x, z, dirX, dirZ) => street(x, z, dirX, dirZ)[side]?.kerbM, side === "left", skip)
      }
    })
    return batch
  }

  /**
   * The roads the case file itself draws, in metres from the observer's place — see StatedRoad.
   *
   * Drawn whole rather than faint, and that is the whole point of telling them apart: this is the
   * ground the observer was on, measured by the people who went there, not a survey taken sixty
   * years later.
   */
  setStated(roads: StatedRoad[], groundYAt: GroundYAt): void {
    RoadSystem.empty(this.stated)
    const bySurface = new Map<RoadSurface, { positions: number[]; indices: number[] }>()
    for (const road of roads) {
      const batch = bySurface.get(road.surface) ?? { positions: [], indices: [] }
      bySurface.set(road.surface, batch)
      // z is the negated north axis, the same convention decor is placed under (see
      // GeoProjection, and SceneRenderer's own eastM/northM handling).
      this.appendPath(road.path.map(point => ({ x: point.eastM, z: -point.northM })), road.widthM, groundYAt, batch)
    }
    for (const [surface, batch] of bySurface) {
      const mesh = this.meshOf(surface, batch, false)
      if (mesh) this.stated.add(mesh)
    }
  }

  /** Nothing surveyed to draw — an unreached provider, or a scene that has moved somewhere else.
   * What the case file states is not touched: it does not depend on anybody answering. */
  clear(): void {
    RoadSystem.empty(this.surveyed)
    this.laidStreets = []
    this.markingsToken++
  }

  private static empty(group: Group): void {
    for (const child of [...group.children]) {
      group.remove(child)
      const mesh = child as Mesh<BufferGeometry, MeshLambertMaterial>
      mesh.geometry?.dispose()
      mesh.material?.dispose()
    }
  }

  dispose(): void {
    RoadSystem.empty(this.surveyed)
    RoadSystem.empty(this.stated)
  }

  /**
   * One line as a strip of quads: a rung across the road at every step along it, each end put at
   * the height of the ground right there.
   *
   * The rung's direction is the average of the two segments meeting at that point, which is what
   * keeps a bend's outer edge from pinching: taking one segment's normal leaves a notch on every
   * corner, and a road is mostly corners. The centre line is already in the patch's own metres.
   */
  private appendPath(
    points: { x: number; z: number }[], widthM: number, groundYAt: GroundYAt, batch: { positions: number[]; indices: number[] },
    strip: {
      offsetM?: number, liftM?: number, minHalfM?: number, skip?: (x: number, z: number) => boolean,
      /** Where the strip lies across at each rung, in place of `offsetM` and the width: nothing is no strip at that rung. */
      lateralAt?: (x: number, z: number, dirX: number, dirZ: number) => Lateral | undefined
    } = {}
  ): void {
    const centre = this.resample(points)
    if (centre.length < 2) return
    const half = Math.max(strip.minHalfM ?? 0.5, widthM / 2)
    const lift = strip.liftM ?? RoadSystem.LIFT_M
    const offset = strip.offsetM ?? 0
    const base = batch.positions.length / 3
    const kept: boolean[] = []
    // Where each rung's three points stand on the ground plane: the left edge, the middle, the right edge.
    const rungs: { x: number; z: number }[][] = []
    for (let i = 0; i < centre.length; i++) {
      const before = centre[Math.max(0, i - 1)]
      const after = centre[Math.min(centre.length - 1, i + 1)]
      let dx = after.x - before.x
      let dz = after.z - before.z
      const length = Math.hypot(dx, dz)
      if (length < 1e-6) { dx = 1; dz = 0 } else { dx /= length; dz /= length }
      const lateral = strip.lateralAt ? strip.lateralAt(centre[i].x, centre[i].z, dx, dz) : { offsetM: offset, halfM: half }
      const rungHalf = lateral ? Math.max(strip.minHalfM ?? 0.5, lateral.halfM) : half
      const rungOffset = lateral?.offsetM ?? offset
      // Left of the direction of travel, on the ground plane.
      const nx = -dz * rungHalf
      const nz = dx * rungHalf
      // The strip's own middle, a lateral offset to the left of the direction of travel.
      const middle = { x: centre[i].x + (-dz) * rungOffset, z: centre[i].z + dx * rungOffset }
      kept.push(lateral !== undefined && lateral.halfM > 0 && !strip.skip?.(middle.x, middle.z))
      rungs.push([{ x: middle.x + nx, z: middle.z + nz }, middle, { x: middle.x - nx, z: middle.z - nz }])
    }
    // A ribbon is flat between two points and the ground is not, and a road on an embankment is crowned: its middle stands higher than its edges. A
    // rung of two points laid a flat ribbon under the crown, and the ground showed through it in patches, which read as dark polygons lying on the road. So
    // three points a rung, and where the ground half-way to the next rung stands above the ribbon there, both ends are raised by the difference (never
    // on a slope that is a plane: the ribbon is exact there, and raised it would float).
    const heights = rungs.map(rung => rung.map(point => groundYAt(point.x, point.z)))
    for (let i = 0; i < rungs.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const from = rungs[i][k]
        const to = rungs[i + 1][k]
        const deficit = groundYAt((from.x + to.x) / 2, (from.z + to.z) / 2) - (heights[i][k] + heights[i + 1][k]) / 2
        if (deficit > 0) {
          heights[i][k] += deficit
          heights[i + 1][k] += deficit
        }
      }
    }
    for (let i = 0; i < rungs.length; i++) {
      for (let k = 0; k < 3; k++) batch.positions.push(rungs[i][k].x, heights[i][k] + lift, rungs[i][k].z)
    }
    for (let i = 0; i < centre.length - 1; i++) {
      if (!kept[i] || !kept[i + 1]) continue
      const a = base + i * 3
      // Left to middle, then middle to right: each a pair of triangles between this rung and the next.
      batch.indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4)
      batch.indices.push(a + 1, a + 4, a + 2, a + 2, a + 4, a + 5)
    }
  }

  /**
   * The face of a kerb: a strip standing SIDEWALK_KERB_M high along a line at `kerbAt` metres to the left of the direction of travel, facing the
   * carriageway (to the right for the kerb of a left pavement, to the left for a right one).
   */
  private appendKerb(
    points: { x: number; z: number }[], groundYAt: GroundYAt, batch: { positions: number[]; indices: number[] },
    kerbAt: (x: number, z: number, dirX: number, dirZ: number) => number | undefined, facesRight: boolean, skip: (x: number, z: number) => boolean
  ): void {
    const centre = this.resample(points)
    if (centre.length < 2) return
    const base = batch.positions.length / 3
    const kept: boolean[] = []
    for (let i = 0; i < centre.length; i++) {
      const before = centre[Math.max(0, i - 1)]
      const after = centre[Math.min(centre.length - 1, i + 1)]
      let dx = after.x - before.x
      let dz = after.z - before.z
      const length = Math.hypot(dx, dz)
      if (length < 1e-6) { dx = 1; dz = 0 } else { dx /= length; dz /= length }
      const kerb = kerbAt(centre[i].x, centre[i].z, dx, dz)
      const x = centre[i].x + (-dz) * (kerb ?? 0)
      const z = centre[i].z + dx * (kerb ?? 0)
      kept.push(kerb !== undefined && !skip(x, z))
      const bottom = groundYAt(x, z) + RoadSystem.LIFT_M
      batch.positions.push(x, bottom, z, x, bottom + RoadSystem.SIDEWALK_KERB_M, z)
    }
    for (let i = 0; i < centre.length - 1; i++) {
      if (!kept[i] || !kept[i + 1]) continue
      const a = base + i * 2
      // Bottom, next bottom, top faces left of the direction of travel; the other way round, right.
      if (facesRight) batch.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      else batch.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  /** All the roads of one surface as a single mesh — see set. */
  private meshOf(surface: RoadSurface, batch: { positions: number[]; indices: number[] }, contemporary: boolean, albedoOf?: [number, number, number], grained = true): Mesh<BufferGeometry, MeshLambertMaterial> | undefined {
    if (batch.indices.length === 0) return undefined
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(batch.positions), 3))
    geometry.setIndex(new BufferAttribute(new Uint32Array(batch.indices), 1))
    geometry.computeVertexNormals()
    const albedo = albedoOf ?? RoadSystem.ALBEDO[surface]
    const material = new MeshLambertMaterial({
      color: new Color(albedo[0], albedo[1], albedo[2]),
      transparent: contemporary,
      opacity: contemporary ? RoadSystem.CONTEMPORARY_OPACITY : 1,
      fog: true,
      // Laid ON the relief, at nearly the same depth as it over hundreds of metres: LIFT_M alone
      // stops a road sinking into a hillside, and this stops it flickering against flat ground,
      // where six centimetres is below what the depth buffer can tell apart at that range.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
    if (grained) this.addGrain(material, RoadSystem.GRAIN_CONTRAST[surface])
    const mesh = new Mesh(geometry, material)
    mesh.name = `roads ${surface}`
    mesh.renderOrder = RoadSystem.RENDER_ORDER
    mesh.receiveShadow = true
    // A road casts nothing: it IS the ground there, and a shadow map that had it as an occluder
    // would shade the ground with the carriageway's own six centimetres.
    mesh.castShadow = false
    return mesh
  }

  /**
   * The grain of a surface: asphalt is mottled, patched and gritty, and a lit road that is one flat colour reads as a picture lying on the ground. Read in the
   * surface's own metres (see GrassDetail on why not the world's), so that it goes by under a moving observer as a road does, and fading with the distance, as
   * each scale of it is let go of before it is finer than a pixel.
   */
  private addGrain(material: MeshLambertMaterial, contrast: number): void {
    const origin = this.grainOrigin
    material.onBeforeCompile = shader => {
      shader.uniforms.uRoadOrigin = { value: origin }
      shader.uniforms.uRoadContrast = { value: contrast }
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vRoadXZ;\nuniform vec2 uRoadOrigin;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRoadXZ = position.xz + uRoadOrigin;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying vec2 vRoadXZ;
uniform float uRoadContrast;
float roadHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float roadNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(roadHash(i), roadHash(i + vec2(1.0, 0.0)), f.x), mix(roadHash(i + vec2(0.0, 1.0)), roadHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
        .replace("#include <map_fragment>", `#include <map_fragment>
{
  float eye = length(vViewPosition);
  // Repairs and wear in patches a few metres across, then the aggregate, then the grit under the wheels.
  float grain = (roadNoise(vRoadXZ * 0.45) - 0.5) * 0.55 * (1.0 - smoothstep(80.0, 260.0, eye))
    + (roadNoise(vRoadXZ * 3.1) - 0.5) * 0.5 * (1.0 - smoothstep(30.0, 110.0, eye))
    + (roadNoise(vRoadXZ * 13.0) - 0.5) * 0.7 * (1.0 - smoothstep(9.0, 40.0, eye))
    + (roadNoise(vRoadXZ * 47.0) - 0.5) * 0.7 * (1.0 - smoothstep(2.5, 12.0, eye));
  diffuseColor.rgb *= 1.0 + grain * uRoadContrast;
}`)
    }
    // A different program from every other Lambert material, which three tells apart by this key.
    material.customProgramCacheKey = () => "rr0-road-grain"
  }

  /**
   * The same line with a point every STEP_M, so the ribbon can follow ground the survey knew
   * nothing about. OSM states a straight kilometre as two points; laid flat between them it would
   * cut through every rise in between.
   */
  private resample(points: { x: number; z: number }[]): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]
      const to = points[i + 1]
      const length = Math.hypot(to.x - from.x, to.z - from.z)
      const steps = Math.max(1, Math.ceil(length / this.stepM))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        out.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t })
      }
    }
    const last = points[points.length - 1]
    if (last) out.push({ x: last.x, z: last.z })
    return out
  }
}

/**
 * The carriageways of a set of roads, cut into segments and filed by the cell of ground they pass through (each, with the margin of its road's width, in every
 * cell it touches): whether a point is on a carriageway is then asked of the few segments of its own cell and not of all of them.
 */
class SegmentGrid {
  /** Wider than the widest carriageway's half, so that a segment need only be filed under the cells it, and its margin, touch. */
  private static readonly CELL_M = 40
  private readonly cells = new Map<number, { way: number, ax: number, az: number, dx: number, dz: number, length2: number, reach: number }[]>()

  constructor(ways: RoadWay[], paths: { x: number, z: number }[][]) {
    paths.forEach((path, way) => {
      const reach = ways[way].widthM / 2 + 0.3
      for (let i = 1; i < path.length; i++) {
        const ax = path[i - 1].x
        const az = path[i - 1].z
        const dx = path[i].x - ax
        const dz = path[i].z - az
        const segment = { way, ax, az, dx, dz, length2: dx * dx + dz * dz, reach }
        const x0 = Math.floor((Math.min(ax, path[i].x) - reach) / SegmentGrid.CELL_M)
        const x1 = Math.floor((Math.max(ax, path[i].x) + reach) / SegmentGrid.CELL_M)
        const z0 = Math.floor((Math.min(az, path[i].z) - reach) / SegmentGrid.CELL_M)
        const z1 = Math.floor((Math.max(az, path[i].z) + reach) / SegmentGrid.CELL_M)
        for (let cx = x0; cx <= x1; cx++) {
          for (let cz = z0; cz <= z1; cz++) {
            const key = SegmentGrid.key(cx, cz)
            const list = this.cells.get(key)
            if (list) list.push(segment)
            else this.cells.set(key, [segment])
          }
        }
      }
    })
  }

  private static key(cx: number, cz: number): number {
    return (cx + 50_000) * 100_003 + (cz + 50_000)
  }

  /** Whether a point lies on the carriageway of a street other than `own`. */
  onAnotherCarriageway(x: number, z: number, own: number): boolean {
    const list = this.cells.get(SegmentGrid.key(Math.floor(x / SegmentGrid.CELL_M), Math.floor(z / SegmentGrid.CELL_M)))
    if (!list) return false
    for (const segment of list) {
      if (segment.way === own) continue
      const t = segment.length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / segment.length2))
      if (Math.hypot(x - (segment.ax + segment.dx * t), z - (segment.az + segment.dz * t)) < segment.reach) return true
    }
    return false
  }
}
