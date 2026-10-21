import type { Sighting } from "../../../engine/model/Sighting.js"
import { resolveObserverPoseAt } from "../../../engine/model/Sighting.js"
import type { FrozenTerrainGroupName } from "../../../engine/model/FrozenData.js"
import { dataSourceById } from "../../../engine/source/DataSource.js"
import { TerrainReach } from "../TerrainReach.js"
import { geoToLocalMeters } from "../GeoProjection.js"
import type { ElevationProvider } from "../ElevationProvider.js"
import type { RoadProvider } from "../RoadProvider.js"
import type { WaterProvider } from "../WaterProvider.js"
import type { RailwayProvider } from "../RailwayProvider.js"
import { ASKED_GRID_SIZE, IMAGERY_RESOLUTION } from "../TerrainMeshBuilder.js"
import { IMAGERY_SOURCES } from "../terrainSources.js"
import { FrozenPatches, type FrozenPatch } from "./FrozenPatches.js"
import { ReliefAnnex, type FrozenReliefPatch } from "./ReliefAnnex.js"
import { ImageryAnnex, TileRecorder } from "./ImageryAnnex.js"
import type { FrozenVectorPatch, VectorAnnexData } from "./VectorAnnex.js"
import { ObserverPath } from "../../../engine/place/ObserverPath.js"
import { ObserverMapView } from "../../../render/ObserverMapView.js"
import type { GeoBounds } from "../GeoBounds.js"

/** Where each group is taken from: the sources the scene asks live. */
export interface FreezerSources {
  elevation: ElevationProvider
  /** Its credit, as its licence words it (see ELEVATION_SOURCES): the elevation providers have none of their own. */
  elevationCredit: string
  /** An id of IMAGERY_SOURCES: the imagery is taken through a recording of its requests, which only a source built for it can be. */
  imagery: string
  roads?: RoadProvider
  water?: WaterProvider
  railways?: RailwayProvider
}

/** What freezing one group gives: the annex's bytes, and what the recording says of it. */
export interface FrozenAnnex {
  bytes: Uint8Array
  attribution: string
  takenOn: string
  /** How many of the patches the source answered for: fewer is a ground partly unanswered, frozen as it is. */
  answered: number
  patches: number
}

/**
 * The patches of ground a recording plays through, and what is laid on them taken from their sources, once: what its annexes are made of
 * (see FrozenData).
 */
export class TerrainFreezer {
  /** The playhead's step through the recording while the patches are worked out: 100 ms is 3 m at motorway speed, nothing next to 150. */
  private static readonly STEP_MS = 100

  /**
   * Every patch a scene playing the recording from start to end builds, by the rule it builds them by (see SceneRenderer.setTerrainOrigin):
   * one round the first place, and another wherever the observer has gone the rebuild distance from the last one, or climbed enough to see
   * farther. A patch already in the list that would serve again (a drive back the same way) is not taken twice.
   */
  static plan(sighting: Sighting): FrozenPatch[] {
    const route = TerrainFreezer.routeOf(sighting)
    const reachM = TerrainReach.decorReachFor(sighting.decor, route)
    const endMs = Math.max(sighting.observerTrack.duration, sighting.timeline.duration, 0)
    const patches: FrozenPatch[] = []
    let current: FrozenPatch | undefined
    const serves = (patch: FrozenPatch, lat: number, lng: number, radiusM: number) => {
      if (Math.abs(patch.radiusM - radiusM) >= radiusM * 0.1) return false
      const { x, z } = geoToLocalMeters(lat, lng, patch.lat, patch.lng)
      return Math.hypot(x, z) < TerrainReach.rebuildDistanceFor(radiusM)
    }
    for (let t = 0; ; t = Math.min(endMs, t + TerrainFreezer.STEP_MS)) {
      const pose = resolveObserverPoseAt(sighting, t)
      if (pose?.lat !== undefined && pose.lng !== undefined) {
        const radiusM = Math.max(TerrainReach.groundRadiusFor(pose.elevationM ?? 0), reachM)
        if (!current || !serves(current, pose.lat, pose.lng, radiusM)) {
          current = patches.find(patch => serves(patch, pose.lat!, pose.lng!, radiusM))
          if (!current) patches.push(current = { lat: pose.lat, lng: pose.lng, radiusM })
        }
      }
      if (t >= endMs) break
    }
    // The far ring round a patch, where the beams the recording claims go past it (see SceneRenderer.buildFarRing). Not where the eye only overlooks
    // lower ground: that is known from the relief, which is what is being frozen; a frozen scene then has the patches and no ring.
    const beams = sighting.skyEvents?.beams ?? []
    if (beams.length > 0) {
      for (const patch of [...patches]) {
        if (TerrainReach.needsFarRing(patch.radiusM, 0, TerrainReach.beamReachFor(beams, patch))) {
          patches.push({ lat: patch.lat, lng: patch.lng, radiusM: TerrainReach.FAR_RING_RADIUS_M, far: true })
        }
      }
    }
    return patches
  }

  /** The way the observer goes, as the scene tells the relief (see SceneElement.routeOf): where a bridge is the ground. */
  static routeOf(sighting: Sighting): { lat: number; lng: number }[] | undefined {
    const places = sighting.observerTrack.allKeyframes.flatMap(frame =>
      frame.pose.lat !== undefined && frame.pose.lng !== undefined ? [{ lat: frame.pose.lat, lng: frame.pose.lng }] : [])
    return places.length >= 2 ? places : undefined
  }

  /** Takes `group` for every patch of `patches` from `sources`, asking for each exactly what the scene asks. `onPatch` is told of each done. */
  static async freeze(group: FrozenTerrainGroupName, sighting: Sighting, patches: readonly FrozenPatch[], sources: FreezerSources,
                      onPatch?: (done: number, of: number) => void): Promise<FrozenAnnex | undefined> {
    const takenOn = new Date().toISOString().slice(0, 10)
    const report = (done: number) => onPatch?.(done, patches.length)
    switch (group) {
      case "relief": {
        const route = TerrainFreezer.routeOf(sighting)
        const taken: FrozenReliefPatch[] = []
        for (const [i, patch] of patches.entries()) {
          try {
            const grid = await sources.elevation.getElevationGrid(FrozenPatches.boundsOf(patch), { width: ASKED_GRID_SIZE, height: ASKED_GRID_SIZE }, { route })
            taken.push({ ...patch, grid })
          } catch (error) {
            console.warn("Relief not frozen for a patch:", error)
          }
          report(i + 1)
        }
        if (taken.length === 0) return undefined
        const attribution = sources.elevationCredit
        const bytes = await ReliefAnnex.encode({ takenOn, attribution, patches: taken })
        return { bytes, attribution, takenOn, answered: taken.length, patches: patches.length }
      }
      case "imagery": {
        const recorder = new TileRecorder()
        const source = dataSourceById(IMAGERY_SOURCES, sources.imagery)
        const provider = source.create(recorder.fetch)
        let answered = 0
        for (const [i, patch] of patches.entries()) {
          try {
            await provider.getImageryTexture(FrozenPatches.boundsOf(patch), { width: IMAGERY_RESOLUTION, height: IMAGERY_RESOLUTION })
            answered++
          } catch (error) {
            console.warn("Imagery not frozen for a patch:", error)
          }
          report(i + 1)
        }
        if (recorder.tiles.size === 0) return undefined
        const attribution = provider.attribution
        const bytes = await ImageryAnnex.encode({ takenOn, source: source.id, attribution, patches: [...patches], tiles: recorder.tiles })
        return { bytes, attribution, takenOn, answered, patches: patches.length }
      }
      case "roads":
        return TerrainFreezer.vector(sources.roads, patches, takenOn, report, (provider, bounds) => provider.getRoads(bounds), provider => provider.contemporary)
      case "water":
        return TerrainFreezer.vector(sources.water, patches, takenOn, report, (provider, bounds) => provider.getWater(bounds))
      case "railways":
        return TerrainFreezer.vector(sources.railways, patches, takenOn, report, (provider, bounds) => provider.getRailways(bounds), provider => provider.contemporary)
    }
  }

  /**
   * The ground the observer map is fitted to for the recording, as the player fits it with every trace shown (see UfoElement.updateObserverMap):
   * what the map's photograph is taken of. Undefined for a recording that states no place, which has no map.
   */
  static mapGround(sighting: Sighting): GeoBounds | undefined {
    const path = ObserverPath.of(sighting)
    return path && ObserverMapView.fitted(path, sighting.traces.flatMap(trace => trace.points))
  }

  /** Takes the observer map's photograph (see FrozenMapImagery) from the imagery source `source` (an id of IMAGERY_SOURCES), as the map asks for it. */
  static async freezeMap(sighting: Sighting, source: string): Promise<FrozenAnnex | undefined> {
    const bounds = TerrainFreezer.mapGround(sighting)
    if (!bounds) return undefined
    const takenOn = new Date().toISOString().slice(0, 10)
    const recorder = new TileRecorder()
    const imagery = dataSourceById(IMAGERY_SOURCES, source)
    const provider = imagery.create(recorder.fetch)
    const pixels = ObserverMapView.IMAGERY_PX
    try {
      await provider.getImageryTexture(bounds, { width: pixels, height: pixels })
    } catch (error) {
      console.warn("Map imagery not frozen:", error)
      return undefined
    }
    const attribution = provider.attribution
    const bytes = await ImageryAnnex.encode({ takenOn, source: imagery.id, attribution, patches: [], map: { bounds, pixels }, tiles: recorder.tiles })
    return { bytes, attribution, takenOn, answered: 1, patches: 1 }
  }

  /**
   * The ways, water or tracks of each patch, as the scene would ask for them — and none for a patch too wide to draw them on, which the scene
   * does not ask for either (see TerrainReach.ROADS_MAX_RADIUS_M).
   */
  private static async vector<P extends { attribution: string }, T>(
    provider: P | undefined, patches: readonly FrozenPatch[], takenOn: string, report: (done: number) => void,
    ask: (provider: P, bounds: ReturnType<typeof FrozenPatches.boundsOf>) => Promise<T[]>, contemporary?: (provider: P) => boolean
  ): Promise<FrozenAnnex | undefined> {
    if (!provider) return undefined
    const taken: FrozenVectorPatch<T>[] = []
    for (const [i, patch] of patches.entries()) {
      if (patch.radiusM <= TerrainReach.ROADS_MAX_RADIUS_M) {
        try {
          taken.push({ ...patch, items: await ask(provider, FrozenPatches.boundsOf(patch)) })
        } catch (error) {
          console.warn("Not frozen for a patch:", error)
        }
      }
      report(i + 1)
    }
    if (taken.length === 0) return undefined
    const annex: VectorAnnexData<T> = { version: 1, takenOn, attribution: provider.attribution, contemporary: contemporary?.(provider), patches: taken }
    const bytes = new TextEncoder().encode(JSON.stringify(annex))
    return { bytes, attribution: provider.attribution, takenOn, answered: taken.length, patches: patches.length }
  }
}
