import type { DecorObject } from "../../engine/model/Decor.js"
import type { BeamJson } from "../../modules/sky-events/beams/LaserBeam.js"
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

  /** From this height an observer is flying: what they look at is well below them, and their reach is all the air lets them see. */
  private static readonly AIRBORNE_FROM_M = 300
  /** How many of their own heights the sharp ground reaches round someone flying: at 30 degrees below the horizon they look two heights away. */
  private static readonly SHARP_GROUND_HEIGHTS = 4
  /** The least of it: a little over ROADS_MAX_RADIUS_M, for no network to be asked for from an aircraft. */
  private static readonly SHARP_GROUND_MIN_M = 6000
  /** The most of it: past this a photograph is stretched too thin again, some 19 m a pixel here. What is looked at further off has its own (see lookPatchFor). */
  private static readonly SHARP_GROUND_MAX_M = 12000

  /**
   * How wide the patch of the place is built round an observer whose ground reaches `groundRadiusM`, at `elevationM`. Their whole reach for
   * someone on the ground. For someone flying, not: one photograph of a given size stretched over thirty kilometres each way gives 47 m a
   * pixel, a field of 250 m five pixels, a blur where a camera at 3 km sees a field pattern. Round them the patch is what they can read,
   * sharper as they are lower, and the far ring (see needsFarRing, which it then calls for) carries the ground out to their reach.
   */
  static patchRadiusFor(groundRadiusM: number, elevationM: number): number {
    if (elevationM < TerrainReach.AIRBORNE_FROM_M) return groundRadiusM
    const sharpM = Math.min(TerrainReach.SHARP_GROUND_MAX_M, Math.max(TerrainReach.SHARP_GROUND_MIN_M, elevationM * TerrainReach.SHARP_GROUND_HEIGHTS))
    return Math.min(groundRadiusM, sharpM)
  }

  /** How far the look patch reaches, as a share of how far away it is looked at: a telephoto's field and more. */
  private static readonly LOOK_PATCH_SHARE = 0.4
  /** Past this share of the patch's radius, what is looked at has left the patch's sharp part. */
  private static readonly LOOK_WITHIN_SHARE = 0.6
  /** Looking less steeply down than this, the eye reads no ground point: only the land going off to the horizon. */
  private static readonly LOOK_DOWN_FROM_DEG = 3

  /**
   * Whether someone flying looks at ground the patch round them cannot show sharply, and where: high up, a lens aimed down reads ground many
   * kilometres off, past even a patch of four heights; so that ground gets a sharp patch of its own, round the point looked at.
   * Undefined when the patch round the observer does.
   */
  static lookPatchFor(elevationM: number, pitchDeg: number, patchRadiusM: number): { distanceM: number, radiusM: number } | undefined {
    if (elevationM < TerrainReach.AIRBORNE_FROM_M || pitchDeg > -TerrainReach.LOOK_DOWN_FROM_DEG) return undefined
    const distanceM = elevationM / Math.tan(-pitchDeg * Math.PI / 180)
    if (distanceM <= patchRadiusM * TerrainReach.LOOK_WITHIN_SHARE || distanceM > TerrainReach.MAX_GROUND_VISIBILITY_M) return undefined
    return { distanceM, radiusM: Math.max(TerrainReach.SHARP_GROUND_MIN_M, distanceM * TerrainReach.LOOK_PATCH_SHARE) }
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

  /**
   * How far the far ring of ground reaches (see SceneRenderer.buildFarRing): what the air lets anyone see. A ring is coarse whatever its size,
   * so it reaches all the way rather than as far as the reason it was built for.
   */
  static readonly FAR_RING_RADIUS_M = TerrainReach.MAX_GROUND_VISIBILITY_M
  /**
   * How far above the lowest ground of the patch of the place the eye has to be for the land beyond it to show: from a hill, a valley and the
   * plain past it are in view out to the horizon of that height (sqrt(2Rh): 16 km at 20 m), far past the patch, where the sky below the horizon
   * showed instead as a band of blue taken for a sea (the Seine valley from the terrace of Meudon, 100 m above it).
   */
  static readonly OVERLOOK_M = 20

  /**
   * Whether a patch of the place `nearRadiusM` wide needs a far ring round it: the eye overlooks land lower than itself by OVERLOOK_M, so that
   * the ground it sees goes on far past the patch, or a beam of light the recording claims goes past it (see beamReachFor).
   */
  static needsFarRing(nearRadiusM: number, eyeAboveLowestM: number, beamReachM: number): boolean {
    if (nearRadiusM >= TerrainReach.FAR_RING_RADIUS_M) return false
    return eyeAboveLowestM >= TerrainReach.OVERLOOK_M || beamReachM > nearRadiusM
  }

  /** How far from `centre` the beams of light a recording claims go (see BeamJson): the farthest point of their paths, metres, wherever they move. */
  static beamReachFor(beams: readonly BeamJson[], centre: { lat: number; lng: number }): number {
    let reach = 0
    for (const beam of beams) {
      for (const point of [...beam.path, ...(beam.moves ?? []).flatMap(key => key.path)]) {
        const offset = geoToLocalMeters(point.lat, point.lng, centre.lat, centre.lng)
        reach = Math.max(reach, Math.hypot(offset.x, offset.z))
      }
    }
    return reach
  }
}
