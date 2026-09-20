// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshLambertMaterial } from "three"
import type { RoadSurface, RoadWay } from "./terrain/RoadProvider.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"

/** Where the ground is, in world units, under a point of the scene — SceneRenderer.groundYUnder. */
export type GroundYAt = (x: number, z: number) => number

/**
 * The roads under a scene, drawn as real carriageways lying on the real relief.
 *
 * Drawn rather than photographed, and the reason is arithmetic. The ground is seen from a witness's
 * eye at 1.70 m, so almost edge-on: on a 720 x 405 frame over a 60 degree field, one metre of
 * ground a hundred metres out is an eighth of a pixel, and a seven-metre road is four fifths of
 * one. Sharpening the photograph under it does not help — the whole road is thinner than a pixel
 * however many texels it was cut from. A drawn carriageway has a width in the world instead of in
 * the texture, so it survives the same perspective that flattens the photograph.
 *
 * Two kinds of road are drawn here and they are NOT drawn alike. One is stated by the case file —
 * measured at the time, by the people who were there — and is the ground the witness was actually
 * on. The other comes from a survey of today (see RoadProvider.contemporary): useful for placing
 * oneself, and an anachronism, since the interstate beside Socorro was built after 1964 and the
 * track Zamora turned onto may be gone. So a contemporary road is drawn faint, and the credit says
 * whose survey and of when.
 */
export class RoadSystem {
  /** How far apart a ribbon's rungs are, metres: close enough to follow a wash or a bank, far
   * enough that a kilometre of road is a few hundred vertices rather than a few thousand. */
  static readonly STEP_M = 8
  /** Lifted this far off the ground so the carriageway wins the depth test against the very
   * surface it is laid on, without standing visibly above it. */
  static readonly LIFT_M = 0.06
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

  constructor() {
    this.group.name = "roads"
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
  set(ways: RoadWay[], originLat: number, originLng: number, groundYAt: GroundYAt, contemporary: boolean): void {
    this.clear()
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
      if (mesh) this.group.add(mesh)
    }
  }

  /** Nothing to draw — an unreached provider, or a scene that has moved somewhere else. */
  clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      const mesh = child as Mesh<BufferGeometry, MeshLambertMaterial>
      mesh.geometry?.dispose()
      mesh.material?.dispose()
    }
  }

  dispose(): void {
    this.clear()
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
    const centre = this.resample(way.points.map(point => {
      const { x, z } = geoToLocalMeters(point.lat, point.lng, originLat, originLng)
      return { x, z }
    }))
    if (centre.length < 2) return
    const half = Math.max(0.5, way.widthM / 2)
    const base = batch.positions.length / 3
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
      const left = { x: centre[i].x + nx, z: centre[i].z + nz }
      const right = { x: centre[i].x - nx, z: centre[i].z - nz }
      batch.positions.push(
        left.x, groundYAt(left.x, left.z) + RoadSystem.LIFT_M, left.z,
        right.x, groundYAt(right.x, right.z) + RoadSystem.LIFT_M, right.z
      )
    }
    for (let i = 0; i < centre.length - 1; i++) {
      const a = base + i * 2
      batch.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  /** All the roads of one surface as a single mesh — see set. */
  private meshOf(surface: RoadSurface, batch: { positions: number[]; indices: number[] }, contemporary: boolean): Mesh | undefined {
    if (batch.indices.length === 0) return undefined
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(batch.positions), 3))
    geometry.setIndex(new BufferAttribute(new Uint32Array(batch.indices), 1))
    geometry.computeVertexNormals()
    const albedo = RoadSystem.ALBEDO[surface]
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
      const steps = Math.max(1, Math.ceil(length / RoadSystem.STEP_M))
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
