import type { ElevationProvider } from "./ElevationProvider.js"
import type { ImageryProvider } from "./ImageryProvider.js"
import type { RoadProvider } from "./RoadProvider.js"
import type { WaterProvider } from "./WaterProvider.js"
import { AwsTerrariumElevationProvider } from "./providers/AwsTerrariumElevationProvider.js"
import { IgnMntElevationProvider } from "./providers/IgnMntElevationProvider.js"
import { FirstElevationThatAnswers } from "./FirstElevationThatAnswers.js"
import { EsriWorldImageryProvider } from "./providers/EsriWorldImageryProvider.js"
import { OverpassRoadProvider } from "./providers/OverpassRoadProvider.js"
import { ArchivedRoadProvider } from "./providers/ArchivedRoadProvider.js"
import { IgnTopoRoadProvider } from "./providers/IgnTopoRoadProvider.js"
import { RegionalRoadProvider } from "./providers/RegionalRoadProvider.js"
import { IgnTopoWaterProvider } from "./providers/IgnTopoWaterProvider.js"
import { OverpassWaterProvider } from "./providers/OverpassWaterProvider.js"
import { RegionalWaterProvider } from "./providers/RegionalWaterProvider.js"
import { ArchivedWaterProvider } from "./providers/ArchivedWaterProvider.js"
import { CachedWaterProvider } from "./providers/CachedWaterProvider.js"

export interface TerrainProviders {
  elevation: ElevationProvider
  imagery: ImageryProvider
  /** Optional, and absent is a real answer: a scene with no road provider draws no roads, which is
   * what every scene did before this existed. */
  roads?: RoadProvider
  /** Optional, as the roads are: a scene with no water provider has its rivers as dry troughs in the relief (see WaterSystem). */
  water?: WaterProvider
}

/**
 * The single composition point choosing which concrete providers back the terrain — see
 * ElevationProvider/ImageryProvider's doc comments. Swapping to a different provider (e.g. a
 * future paid/keyed one) means editing only this function; SceneRenderer/TerrainMeshBuilder never
 * reference a concrete provider class.
 */
export function defaultTerrainProviders(): TerrainProviders {
  return { elevation: defaultElevationProvider(), imagery: defaultImageryProvider(), roads: defaultRoadProvider(), water: defaultWaterProvider() }
}

/**
 * The relief half on its own: the IGN's bare-earth model in France (the laser's, then the older survey's), the worldwide one wherever the IGN does not answer.
 *
 * In that order because the worldwide relief is a model of the SURFACE at fifteen metres to the pixel, off by a metre or two near an observer and by
 * five to twenty where there is forest or a road on an embankment (measured against the laser at Saint-Lô, Maffliers and Silly-le-Long).
 */
export function defaultElevationProvider(): ElevationProvider {
  return new FirstElevationThatAnswers(new IgnMntElevationProvider(), new AwsTerrariumElevationProvider())
}

/**
 * The imagery half on its own — for the callers that want a photograph of the ground and nothing
 * else, which is what the observer map (see ObserverMapRenderer) is.
 *
 * Here rather than in the map, so the choice of provider stays in this one file and the map gets
 * whatever the terrain gets: the two are pictures of the same ground, and a reader comparing them
 * should not be looking at two different surveys.
 */
export function defaultImageryProvider(): ImageryProvider {
  return new EsriWorldImageryProvider()
}

/**
 * The roads half on its own: what UFO@home has already frozen for the cases it publishes, and a
 * live Overpass query for the ground it has not.
 *
 * The live source is the IGN's map in France (it names its roads, and answers) and OpenStreetMap elsewhere (see RegionalRoadProvider).
 *
 * In that order, and not the other way round. Overpass is free and donated, and a published player
 * cannot put a query in front of every reader of a case dossier — it answered 429 and 504 the first
 * time a page with several scenes asked. The archive serves the published cases without asking
 * anybody for anything; the live source is for the editor, where one person is waiting for one
 * square of ground nobody has published yet.
 */
export function defaultRoadProvider(): RoadProvider {
  return new ArchivedRoadProvider({ fallback: new RegionalRoadProvider(new IgnTopoRoadProvider(), new OverpassRoadProvider()) })
}

/**
 * The water half on its own: what UFO@home has frozen for the cases it publishes, and for any other place the IGN's map in France and
 * OpenStreetMap elsewhere (see RegionalWaterProvider), each answer kept a month (see CachedWaterProvider). In that order for the reason the roads
 * are (see defaultRoadProvider): a published scene asks Overpass nothing.
 */
export function defaultWaterProvider(): WaterProvider {
  return new ArchivedWaterProvider({ fallback: new CachedWaterProvider(new RegionalWaterProvider(new IgnTopoWaterProvider(), new OverpassWaterProvider())) })
}
