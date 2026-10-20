import type { FrozenData, FrozenGroup } from "../../../engine/model/FrozenData.js"
import { FrozenGroups } from "../../../engine/model/FrozenData.js"
import type { TerrainProviders } from "../defaultTerrainProviders.js"
import type { RoadWay } from "../RoadProvider.js"
import type { WaterSurface } from "../WaterProvider.js"
import type { RailwayLine } from "../RailwayProvider.js"
import { FrozenAnnexes } from "./FrozenAnnexes.js"
import { FrozenPatches, type FrozenPatch } from "./FrozenPatches.js"
import { FrozenElevationProvider, ReliefAnnex } from "./ReliefAnnex.js"
import { FrozenImageryProvider, FrozenMapImagery, ImageryAnnex } from "./ImageryAnnex.js"
import { FrozenRailwayProvider, FrozenRoadProvider, FrozenWaterProvider, type VectorAnnexData } from "./VectorAnnex.js"

/**
 * The ground of a recording that carries its own (see FrozenData): each group it froze read from its annex, each other one asked of `live`.
 *
 * A group read from its annex asks nobody for anything, whatever the observer does: a patch it was not taken for has no relief, no roads, no
 * photograph, rather than one asked for live. That is what freezing means, and what a scene built where the annexes hold the ground never meets
 * (see FrozenPatches).
 */
export class FrozenTerrain {
  /** `live` itself when nothing of the ground is frozen, so that a scene given it has nothing to rebuild. */
  static providers(frozen: FrozenData | undefined, documentUrl: string | undefined, live: TerrainProviders): TerrainProviders {
    const held = (name: "relief" | "imagery" | "roads" | "water" | "railways") => FrozenGroups.held(frozen, name)
    const relief = held("relief"), imagery = held("imagery"), roads = held("roads"), water = held("water"), railways = held("railways")
    if (!relief && !imagery && !roads && !water && !railways) return live
    const address = (group: FrozenGroup) => FrozenAnnexes.address(group.src, documentUrl)
    const lists: Promise<readonly FrozenPatch[]>[] = []
    const providers: TerrainProviders = { ...live }
    if (relief) {
      const annex = FrozenAnnexes.zip(address(relief)).then(files => ReliefAnnex.decode(files))
      providers.elevation = new FrozenElevationProvider(annex)
      lists.push(annex.then(data => data.patches))
    }
    if (imagery) {
      const annex = FrozenAnnexes.zip(address(imagery)).then(files => ImageryAnnex.decode(files))
      providers.imagery = new FrozenImageryProvider(annex, imagery.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (roads) {
      const annex = FrozenAnnexes.json<VectorAnnexData<RoadWay>>(address(roads))
      providers.roads = new FrozenRoadProvider(annex, roads.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (water) {
      const annex = FrozenAnnexes.json<VectorAnnexData<WaterSurface>>(address(water))
      providers.water = new FrozenWaterProvider(annex, water.attribution)
      lists.push(annex.then(data => data.patches))
    }
    if (railways) {
      const annex = FrozenAnnexes.json<VectorAnnexData<RailwayLine>>(address(railways))
      providers.railways = new FrozenRailwayProvider(annex, railways.attribution)
      lists.push(annex.then(data => data.patches))
    }
    // The first annex that could be read says where the patches are: they were all taken for the same ones (see TerrainFreezer).
    providers.patches = new FrozenPatches(FrozenTerrain.firstRead(lists))
    return providers
  }

  /** The observer map's photograph, read from the annex of the `map` group. */
  static map(group: FrozenGroup, documentUrl: string | undefined): FrozenMapImagery {
    const annex = FrozenAnnexes.zip(FrozenAnnexes.address(group.src, documentUrl)).then(files => ImageryAnnex.decode(files))
    return new FrozenMapImagery(annex, group.attribution)
  }

  private static async firstRead(lists: Promise<readonly FrozenPatch[]>[]): Promise<readonly FrozenPatch[]> {
    for (const list of lists) {
      try {
        const patches = await list
        if (patches.length > 0) return patches.map(({ lat, lng, radiusM }) => ({ lat, lng, radiusM }))
      } catch {
        // This annex could not be read: the next may.
      }
    }
    return []
  }
}
