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
  return { elevation: new AwsTerrariumElevationProvider(), imagery: new EsriWorldImageryProvider() }
}
