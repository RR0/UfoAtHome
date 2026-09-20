import type { ElevationProvider } from "./ElevationProvider.js"
import type { ImageryProvider } from "./ImageryProvider.js"
import type { RoadProvider } from "./RoadProvider.js"
import { AwsTerrariumElevationProvider } from "./providers/AwsTerrariumElevationProvider.js"
import { EsriWorldImageryProvider } from "./providers/EsriWorldImageryProvider.js"
import { OverpassRoadProvider } from "./providers/OverpassRoadProvider.js"
import { ArchivedRoadProvider } from "./providers/ArchivedRoadProvider.js"

export interface TerrainProviders {
  elevation: ElevationProvider
  imagery: ImageryProvider
  /** Optional, and absent is a real answer: a scene with no road provider draws no roads, which is
   * what every scene did before this existed. */
  roads?: RoadProvider
}

/**
 * The single composition point choosing which concrete providers back the terrain — see
 * ElevationProvider/ImageryProvider's doc comments. Swapping to a different provider (e.g. a
 * future paid/keyed one) means editing only this function; SceneRenderer/TerrainMeshBuilder never
 * reference a concrete provider class.
 */
export function defaultTerrainProviders(): TerrainProviders {
  return { elevation: new AwsTerrariumElevationProvider(), imagery: defaultImageryProvider(), roads: defaultRoadProvider() }
}

/**
 * The imagery half on its own — for the callers that want a photograph of the ground and nothing
 * else, which is what the witness map (see WitnessMapRenderer) is.
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
 * In that order, and not the other way round. Overpass is free and donated, and a published player
 * cannot put a query in front of every reader of a case dossier — it answered 429 and 504 the first
 * time a page with several scenes asked. The archive serves the published cases without asking
 * anybody for anything; the live source is for the editor, where one person is waiting for one
 * square of ground nobody has published yet.
 */
export function defaultRoadProvider(): RoadProvider {
  return new ArchivedRoadProvider({ fallback: new OverpassRoadProvider() })
}
