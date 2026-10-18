// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshPhysicalMaterial, ShapeUtils, Vector2 } from "three"
import type { WaterSurface } from "./terrain/WaterProvider.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import type { GroundYAt } from "./RoadSystem.js"

/** A point of an outline in the patch's own frame: x east, z south (see GeoProjection). */
type Flat = { x: number, z: number }

/**
 * The water under a scene: each river, lake and pond a map draws (see WaterProvider), as a flat surface at its own level, that mirrors the sky.
 *
 * WHY: the relief is the bare earth, and the bare earth of a river is its water level (the laser does not see under the surface). The Seine in Paris
 * was a flat trough between its quays, in the colour of the photograph, which nothing said was water: a dry bed under the bridges.
 *
 * AT WHAT LEVEL: the level of the relief in its bed, read on the patch itself (a low share of the heights of the ground inside the outline), so that
 * it lies where the ground the scene draws has its water, whatever relief the scene has. Not the highest of them: the patch's mesh is smoother than
 * the quays, and near a bank its ground climbs inside the outline. One level per surface: water is level, and a surface is cut to the patch, so a
 * river's fall across it is a few centimetres a kilometre (the Seine's) save in mountains, where it is drawn level all the same.
 *
 * AS WHAT: a dielectric of index 1.33, smooth with a light ripple: its share of reflected light is Fresnel's, 2 % looking down into it and nearly all
 * of it at grazing incidence, which is why a river far off is the colour of the sky. What is not reflected goes into the water and little of it comes
 * back: the body of the water is dark (a few per cent, greenish, as a river carrying silt is). The reflection is the eye's probe of the whole scene,
 * as for every glossy thing (see Reflections), and the Sun's glint is the Sun's light on a smooth surface, which three draws.
 *
 * Loaded on demand (see SceneRenderer.buildWater): most scenes have no water near them.
 */
export class WaterSystem {
  /** Above the ground of its bed, so it wins the depth test against the very surface it lies on without standing visibly above it. */
  static readonly LIFT_M = 0.05
  /** Drawn right after the ground (SceneRenderer.TERRAIN_RENDER_ORDER, 1) and before the roads (RoadSystem.RENDER_ORDER), which cross it on bridges. */
  static readonly RENDER_ORDER = 1.04
  /** The share of the heights of the ground inside an outline its level is read at: the bed, not the slope of a bank the mesh smoothed. */
  static readonly LEVEL_QUANTILE = 0.2
  /** The body of the water, as a diffuse albedo (linear): a river with some silt in it, its upwelling light a few per cent, greenish. */
  static readonly BODY_ALBEDO: [number, number, number] = [0.035, 0.045, 0.04]
  /** The index of refraction of water, which gives its Fresnel reflectance: 2 % head-on. */
  static readonly IOR = 1.33
  /** A surface with a light ripple: a perfect mirror is a pond on a still day, and the PMREM blurs the probe to it. */
  static readonly ROUGHNESS = 0.08
  /** The most samples of the ground an outline is read at, a side: enough for a pond, few enough for the Seine across a patch. */
  private static readonly MAX_SAMPLES = 48

  readonly group = new Group()
  private readonly material = new MeshPhysicalMaterial({
    color: new Color(...WaterSystem.BODY_ALBEDO), roughness: WaterSystem.ROUGHNESS, metalness: 0, ior: WaterSystem.IOR,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  })

  constructor() {
    this.group.name = "water"
  }

  /**
   * Lays `surfaces` on a patch centred on (originLat, originLng), reaching `radiusM` from it: each cut to the patch, at its own level.
   *
   * Always rebuilt, for the reason RoadSystem.set gives: the level is the relief's, and the relief is rebuilt as the observer moves.
   */
  set(surfaces: readonly WaterSurface[], originLat: number, originLng: number, groundYAt: GroundYAt, radiusM: number, groundSpacingM: number): void {
    this.clear()
    for (const surface of surfaces) {
      const rings = surface.rings
        .map(ring => WaterSystem.clip(ring.map(point => geoToLocalMeters(point.lat, point.lng, originLat, originLng)), radiusM))
      const outline = rings[0]
      if (!outline || outline.length < 3) continue
      const islands = rings.slice(1).filter(ring => ring.length >= 3)
      const level = WaterSystem.level(outline, islands, groundYAt, groundSpacingM)
      if (level === undefined) continue
      const geometry = WaterSystem.geometry(outline, islands, level + WaterSystem.LIFT_M)
      if (!geometry) continue
      const mesh = new Mesh(geometry, this.material)
      mesh.name = `water ${surface.id}`
      mesh.renderOrder = WaterSystem.RENDER_ORDER
      mesh.receiveShadow = true
      this.group.add(mesh)
    }
  }

  /** How many surfaces are laid. */
  get count(): number {
    return this.group.children.length
  }

  clear(): void {
    for (const child of [...this.group.children]) {
      ;(child as Mesh).geometry.dispose()
      this.group.remove(child)
    }
  }

  dispose(): void {
    this.clear()
    this.material.dispose()
  }

  /**
   * The level of a surface: the relief inside its outline (and out of its islands), on a grid as fine as the patch's mesh, read at LEVEL_QUANTILE.
   * Undefined for an outline no sample falls in and that has no vertex either, which a ring of three points can be.
   */
  static level(outline: Flat[], islands: Flat[][], groundYAt: GroundYAt, spacingM: number): number | undefined {
    const xs = outline.map(point => point.x)
    const zs = outline.map(point => point.z)
    const [west, east, north, south] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    const step = Math.max(spacingM, (east - west) / WaterSystem.MAX_SAMPLES, (south - north) / WaterSystem.MAX_SAMPLES, 0.5)
    const heights: number[] = []
    for (let z = north + step / 2; z < south; z += step) {
      for (let x = west + step / 2; x < east; x += step) {
        const at = { x, z }
        if (!WaterSystem.contains(outline, at) || islands.some(island => WaterSystem.contains(island, at))) continue
        const y = groundYAt(x, z)
        if (Number.isFinite(y)) heights.push(y)
      }
    }
    // A pond narrower than the grid: its own outline is all there is to read the ground at.
    if (heights.length === 0) for (const point of outline) heights.push(groundYAt(point.x, point.z))
    const finite = heights.filter(Number.isFinite).sort((a, b) => a - b)
    if (finite.length === 0) return undefined
    return finite[Math.floor((finite.length - 1) * WaterSystem.LEVEL_QUANTILE)]
  }

  /** A ring cut to the square of the patch (Sutherland and Hodgman's clipping, one side of the square after the other). */
  static clip(ring: Flat[], radiusM: number): Flat[] {
    let points = ring
    const sides: { inside: (p: Flat) => boolean, cross: (a: Flat, b: Flat) => Flat }[] = [
      { inside: p => p.x >= -radiusM, cross: (a, b) => WaterSystem.atX(a, b, -radiusM) },
      { inside: p => p.x <= radiusM, cross: (a, b) => WaterSystem.atX(a, b, radiusM) },
      { inside: p => p.z >= -radiusM, cross: (a, b) => WaterSystem.atZ(a, b, -radiusM) },
      { inside: p => p.z <= radiusM, cross: (a, b) => WaterSystem.atZ(a, b, radiusM) }
    ]
    for (const side of sides) {
      const kept: Flat[] = []
      for (let i = 0; i < points.length; i++) {
        const current = points[i]
        const previous = points[(i + points.length - 1) % points.length]
        if (side.inside(current)) {
          if (!side.inside(previous)) kept.push(side.cross(previous, current))
          kept.push(current)
        } else if (side.inside(previous)) {
          kept.push(side.cross(previous, current))
        }
      }
      points = kept
      if (points.length === 0) break
    }
    return points
  }

  private static atX(a: Flat, b: Flat, x: number): Flat {
    return { x, z: a.z + (b.z - a.z) * (x - a.x) / (b.x - a.x) }
  }

  private static atZ(a: Flat, b: Flat, z: number): Flat {
    return { x: a.x + (b.x - a.x) * (z - a.z) / (b.z - a.z), z }
  }

  /** Whether a point is inside a ring (even-odd). */
  static contains(ring: Flat[], point: Flat): boolean {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]
      const b = ring[j]
      if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside
    }
    return inside
  }

  /** The surface as triangles at height `y`, each facing up; undefined where the outline makes none. */
  private static geometry(outline: Flat[], islands: Flat[][], y: number): BufferGeometry | undefined {
    const toVector = (point: Flat) => new Vector2(point.x, point.z)
    const contour = outline.map(toVector)
    const holes = islands.map(island => island.map(toVector))
    const faces = ShapeUtils.triangulateShape(contour, holes)
    if (faces.length === 0) return undefined
    const all = [...contour, ...holes.flat()]
    const positions: number[] = []
    for (const [a, b, c] of faces) {
      const [pa, pb, pc] = [all[a], all[b], all[c]]
      // The y of the cross product of its two edges (a vector2's y is z here): positive is a face that looks up.
      const up = (pb.y - pa.y) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.y - pa.y) > 0
      for (const p of up ? [pa, pb, pc] : [pa, pc, pb]) positions.push(p.x, y, p.y)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    const normals = new Float32Array(positions.length)
    for (let i = 1; i < normals.length; i += 3) normals[i] = 1
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    geometry.computeBoundingSphere()
    return geometry
  }
}
