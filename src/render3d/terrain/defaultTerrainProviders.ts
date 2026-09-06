import type { ElevationProvider } from "./ElevationProvider.js"
import type { ImageryProvider } from "./ImageryProvider.js"
import { AwsTerrariumElevationProvider } from "./providers/AwsTerrariumElevationProvider.js"
import { EsriWorldImageryProvider } from "./providers/EsriWorldImageryProvider.js"

export interface TerrainProviders {
  elevation: ElevationProvider
  imagery: ImageryProvider
}

/**
 * The single composition point choosing which concrete providers back the terrain — see
 * ElevationProvider/ImageryProvider's doc comments. Swapping to a different provider (e.g. a
 * future paid/keyed one) means editing only this function; SceneRenderer/TerrainMeshBuilder never
 * reference a concrete provider class.
 */
export function defaultTerrainProviders(): TerrainProviders {
  return { elevation: new AwsTerrariumElevationProvider(), imagery: defaultImageryProvider() }
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
