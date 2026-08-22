import type { PlaceProvider } from "./PlaceProvider.js"
import { NominatimPlaceProvider } from "./providers/NominatimPlaceProvider.js"

/**
 * The single composition point choosing which geocoder backs the place-name field — same role
 * defaultTerrainProviders()/defaultWeatherProvider() play for their own data, and the same rule:
 * swapping geocoders means editing only this function.
 */
export function defaultPlaceProvider(): PlaceProvider {
  return new NominatimPlaceProvider()
}
