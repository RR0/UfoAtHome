import type { Snapshots, HeldGroup } from "../../../engine/model/Snapshots.js"
import { SnapshotGroups } from "../../../engine/model/Snapshots.js"
import type { TerrainProviders } from "../defaultTerrainProviders.js"
import type { RoadWay } from "../RoadProvider.js"
import type { WaterSurface } from "../WaterProvider.js"
import type { RailwayLine } from "../RailwayProvider.js"
import { SnapshotAnnexes } from "./SnapshotAnnexes.js"
import { SnapshotPatches, type SnapshotPatch } from "./SnapshotPatches.js"
import { SnapshotElevationProvider, ReliefAnnex } from "./ReliefAnnex.js"
import { SnapshotImageryProvider, SnapshotMapImagery, ImageryAnnex } from "./ImageryAnnex.js"
import { SnapshotRailwayProvider, SnapshotRoadProvider, SnapshotWaterProvider, type VectorAnnexData } from "./VectorAnnex.js"

/**
 * The ground of a recording that carries its own (see Snapshots): each group it froze read from its annex, each other one asked of `live`.
 *
 * A group read from its annex asks nobody for anything, whatever the observer does: a patch it was not taken for has no relief, no roads, no
 * photograph, rather than one asked for live. That is what freezing means, and what a scene built where the annexes hold the ground never meets
 * (see SnapshotPatches).
 */
export class SnapshotTerrain {
  /** `live` itself when nothing of the ground is frozen, so that a scene given it has nothing to rebuild. */
  static providers(snapshots: Snapshots | undefined, documentUrl: string | undefined, live: TerrainProviders): TerrainProviders {
    const held = (name: "relief" | "imagery" | "roads" | "water" | "railways") => SnapshotGroups.held(snapshots, name)
    const relief = held("relief"), imagery = held("imagery"), roads = held("roads"), water = held("water"), railways = held("railways")
    if (!relief && !imagery && !roads && !water && !railways) return live
    const address = (group: HeldGroup) => SnapshotAnnexes.address(group.src, documentUrl)
    const lists: Promise<readonly SnapshotPatch[]>[] = []
    const providers: TerrainProviders = { ...live }
    if (relief) {
      const annex = SnapshotAnnexes.zip(address(relief)).then(files => ReliefAnnex.decode(files))
      providers.elevation = new SnapshotElevationProvider(annex)
      lists.push(annex.then(data => data.patches))
    }
    if (imagery) {
      const annex = SnapshotAnnexes.zip(address(imagery)).then(files => ImageryAnnex.decode(files))
      providers.imagery = new SnapshotImageryProvider(annex, imagery.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (roads) {
      const annex = SnapshotAnnexes.json<VectorAnnexData<RoadWay>>(address(roads))
      providers.roads = new SnapshotRoadProvider(annex, roads.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (water) {
      const annex = SnapshotAnnexes.json<VectorAnnexData<WaterSurface>>(address(water))
      providers.water = new SnapshotWaterProvider(annex, water.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (railways) {
      const annex = SnapshotAnnexes.json<VectorAnnexData<RailwayLine>>(address(railways))
      providers.railways = new SnapshotRailwayProvider(annex, railways.attribution)
      lists.push(annex.then(data => data.patches))
    }
    // The first annex that could be read says where the patches are: they were all taken for the same ones (see TerrainSnapshotTaker).
    providers.patches = new SnapshotPatches(SnapshotTerrain.firstRead(lists))
    return providers
  }

  /** The observer map's photograph, read from the annex of the `map` group. */
  static map(group: HeldGroup, documentUrl: string | undefined): SnapshotMapImagery {
    const annex = SnapshotAnnexes.zip(SnapshotAnnexes.address(group.src, documentUrl)).then(files => ImageryAnnex.decode(files))
    return new SnapshotMapImagery(annex, group.attribution)
  }

  private static async firstRead(lists: Promise<readonly SnapshotPatch[]>[]): Promise<readonly SnapshotPatch[]> {
    for (const list of lists) {
      try {
        const patches = await list
        if (patches.length > 0) return patches.map(({ lat, lng, radiusM, far }) => ({ lat, lng, radiusM, ...(far ? { far } : {}) }))
      } catch {
        // This annex could not be read: the next may.
      }
    }
    return []
  }
}
