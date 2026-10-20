import type { DecorObject } from "../../engine/model/Decor.js"
import { geoToLocalMeters } from "./GeoProjection.js"

/**
 * How much real ground a scene builds round its observer, and when it builds more: the rules SceneRenderer builds its patches by, apart so
 * that what works out the patches a recording plays through (see TerrainFreezer) follows the very same ones.
 */
export class TerrainReach {
  /** The ground disc's radius at eye level, metres. */
  static readonly GROUND_RADIUS_M = 900
  /** Mean Earth radius, for the one thing this scene needs it for: how far an observer can actually see the ground from a given height. */
  static readonly EARTH_RADIUS_M = 6_371_000
  /** How far the ground stays worth drawing through real air — a clear day's visibility. Beyond it everything is haze whatever the geometry
   * says, so there is nothing to gain by building more. */
  static readonly MAX_GROUND_VISIBILITY_M = 30_000
  /** How far an observer goes from the centre of a 900 m patch before another is built — see SceneRenderer.setTerrainOrigin. */
  static readonly REBUILD_DISTANCE_M = 150
  /** Past this radius a patch gets no roads, water or railways — see SceneRenderer.buildRoads. */
  static readonly ROADS_MAX_RADIUS_M = 5000
  /** A route that stays within this of its start is a still observer's (a stance, a turn of the head, a few steps). */
  private static readonly STILL_OBSERVER_M = 60
  private static readonly PATCH_WHOLE_SHARE = 700 / 900
  private static readonly MAX_DECOR_TERRAIN_M = 3000

  /**
   * How far the ground disc has to reach for a observer at `elevationM`: their real horizon distance
   * (sqrt(2Rh) — 4.5 km at eye height, 138 km at a DC-3's 1500 m), capped by what air lets anyone
   * see anyway, and never smaller than the 900 m this always used at ground level.
   *
   * A fixed 900-unit disc was fine for a observer standing on it and nothing else: from a few hundred
   * metres up its own rim curved away into view with a void beyond — the "fish-eye ground" of a
   * observer in an aircraft. Deliberately NOT an attempt to render Earth's curvature: the horizon
   * only starts visibly bending around 10-15 km up, and at the altitudes a sighting is reported from
   * the real correction is the 1.24deg horizon dip at 1500 m, well under what any observer could
   * judge, while the missing ground was impossible to miss.
   */
  static groundRadiusFor(elevationM: number): number {
    const horizonM = Math.sqrt(2 * TerrainReach.EARTH_RADIUS_M * Math.max(elevationM, 0))
    return Math.max(TerrainReach.GROUND_RADIUS_M, Math.min(horizonM, TerrainReach.MAX_GROUND_VISIBILITY_M))
  }

  /** How far an observer goes from the centre of a patch of `radiusM` before another is built: 150 m matters for a 900 m patch and is meaningless for a 30 km one. */
  static rebuildDistanceFor(radiusM: number): number {
    return TerrainReach.REBUILD_DISTANCE_M * (radiusM / TerrainReach.GROUND_RADIUS_M)
  }

  /**
   * How wide the patch of real ground has to be for the scenery of a still observer to stand on it: the farthest of the objects that stand on the ground, and the
   * ground round it, out to where the patch begins to fade (see TerrainMeshBuilder), and at most 3 km. Nothing for an observer who goes somewhere (a drive's patches
   * follow it, and what is out of reach now is within reach later), for scenery that is all near, and for what flies.
   */
  static decorReachFor(decor: readonly DecorObject[], route: readonly { lat: number; lng: number }[] | undefined): number {
    if (route && route.length >= 2) {
      const first = route[0]
      for (const place of route) {
        const move = geoToLocalMeters(place.lat, place.lng, first.lat, first.lng)
        if (Math.hypot(move.x, move.z) > TerrainReach.STILL_OBSERVER_M) return 0
      }
    }
    let reach = 0
    for (const object of decor) {
      if (object.kind === "aircraft" || object.kind === "observer" || object.track) continue
      const half = Math.max(object.sizeM?.widthM ?? 0, object.sizeM?.lengthM ?? 0) / 2
      reach = Math.max(reach, Math.hypot(object.eastM, object.northM) + half)
    }
    // The patch is whole to 700 of its 900 and fades to nothing at the rim: what must stand on whole ground is inside the first.
    const needed = Math.ceil(reach / TerrainReach.PATCH_WHOLE_SHARE / 100) * 100
    return needed > TerrainReach.GROUND_RADIUS_M * TerrainReach.PATCH_WHOLE_SHARE ? Math.min(needed, TerrainReach.MAX_DECOR_TERRAIN_M) : 0
  }
}
