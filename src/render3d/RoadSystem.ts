// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshLambertMaterial } from "three"
import type { RoadSurface, RoadWay } from "./terrain/RoadProvider.js"
import type { StatedRoad } from "../engine/model/Road.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

/** Where the ground is, in world units, under a point of the scene — SceneRenderer.groundYUnder. */
export type GroundYAt = (x: number, z: number) => number

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
  /**
   * The pavements of a street: a strip this wide along each side of the carriageway, raised by a kerb. Drawn for the streets the map says are
   * urban, and where a way is not a side street's mouth (see crossesAnother).
   */
  static readonly SIDEWALK_WIDTH_M = 1.8
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

  set(ways: RoadWay[], originLat: number, originLng: number, groundYAt: GroundYAt, contemporary: boolean): void {
    RoadSystem.empty(this.surveyed)
    // One mesh per SURFACE, not per way. A town's network is five hundred ways — around Socorro it
    // is 490 — and five hundred draw calls to put down what is, visually, three materials would
    // cost more than everything else in the frame put together. They share a material anyway, so
    // there is nothing to lose by sharing a buffer.
    const bySurface = new Map<RoadSurface, { positions: number[]; indices: number[] }>()
    for (const way of ways) {
      const batch = bySurface.get(way.surface) ?? { positions: [], indices: [] }
      bySurface.set(way.surface, batch)
      this.appendRibbon(way, originLat, originLng, groundYAt, batch)
    }
    for (const [surface, batch] of bySurface) {
      const mesh = this.meshOf(surface, batch, contemporary)
      if (mesh) this.surveyed.add(mesh)
    }
    const pavements = this.sidewalks(ways, originLat, originLng, groundYAt)
    if (pavements.indices.length > 0) {
      const mesh = this.meshOf("paved", pavements, contemporary, RoadSystem.SIDEWALK_ALBEDO)
      if (mesh) {
        mesh.name = "roads sidewalks"
        this.surveyed.add(mesh)
      }
    }
  }

  /**
   * A pavement along each side of every urban street: its rungs are those of the street, offset past the carriageway's edge, and a rung that
   * falls on another street's carriageway is left out, which leaves the gap a side street's mouth has between two pavements.
   */
  private sidewalks(ways: RoadWay[], originLat: number, originLng: number, groundYAt: GroundYAt): { positions: number[]; indices: number[] } {
    const batch = { positions: [] as number[], indices: [] as number[] }
    const paths = ways.map(way => way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng)))
    ways.forEach((way, at) => {
      if (!way.urban || way.surface !== "paved" || way.widthM < RoadSystem.SIDEWALK_MIN_ROAD_M) return
      const offset = way.widthM / 2 + RoadSystem.SIDEWALK_WIDTH_M / 2
      for (const side of [1, -1]) {
        this.appendPath(paths[at], RoadSystem.SIDEWALK_WIDTH_M, groundYAt, batch, {
          offsetM: offset * side,
          liftM: RoadSystem.LIFT_M + RoadSystem.SIDEWALK_KERB_M,
          skip: (x, z) => RoadSystem.crossesAnother(x, z, at, ways, paths)
        })
      }
    })
    return batch
  }

  /** Whether a point lies on the carriageway of a street other than the one it belongs to. */
  private static crossesAnother(x: number, z: number, own: number, ways: RoadWay[], paths: { x: number; z: number }[][]): boolean {
    for (let w = 0; w < paths.length; w++) {
      if (w === own) continue
      const reach = ways[w].widthM / 2 + 0.3
      const path = paths[w]
      for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x
        const dz = path[i].z - path[i - 1].z
        const length2 = dx * dx + dz * dz
        const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - path[i - 1].x) * dx + (z - path[i - 1].z) * dz) / length2))
        if (Math.hypot(x - (path[i - 1].x + dx * t), z - (path[i - 1].z + dz * t)) < reach) return true
      }
    }
    return false
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
   * One way as a strip of quads: a rung across the road at every step along it, each end put at
   * the height of the ground right there.
   *
   * The rung's direction is the average of the two segments meeting at that point, which is what
   * keeps a bend's outer edge from pinching: taking one segment's normal leaves a notch on every
   * corner, and a road is mostly corners.
   */
  private appendRibbon(way: RoadWay, originLat: number, originLng: number, groundYAt: GroundYAt, batch: { positions: number[]; indices: number[] }): void {
    this.appendPath(way.points.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng)), way.widthM, groundYAt, batch)
  }

  /** One centre line, already in the patch's own metres, as a strip of quads — see appendRibbon. */
  private appendPath(
    points: { x: number; z: number }[], widthM: number, groundYAt: GroundYAt, batch: { positions: number[]; indices: number[] },
    strip: { offsetM?: number, liftM?: number, skip?: (x: number, z: number) => boolean } = {}
  ): void {
    const centre = this.resample(points)
    if (centre.length < 2) return
    const half = Math.max(0.5, widthM / 2)
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
      // Left of the direction of travel, on the ground plane.
      const nx = -dz * half
      const nz = dx * half
      // The strip's own middle, a lateral offset to the left of the direction of travel.
      const middle = { x: centre[i].x + (-dz) * offset, z: centre[i].z + dx * offset }
      kept.push(!strip.skip?.(middle.x, middle.z))
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

  /** All the roads of one surface as a single mesh — see set. */
  private meshOf(surface: RoadSurface, batch: { positions: number[]; indices: number[] }, contemporary: boolean, albedoOf?: [number, number, number]): Mesh | undefined {
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
