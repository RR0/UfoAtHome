import type { WeatherProvider } from "./WeatherProvider.js"
import { OpenMeteoWeatherProvider } from "./providers/OpenMeteoWeatherProvider.js"

/**
 * The single composition point choosing which record backs inferred weather — same role
 * defaultTerrainProviders() plays for terrain, and the same rule: swapping datasets (a national
 * archive, a paid/keyed API) means editing only this function. Neither WeatherInference nor the
 * recorder ever names a concrete provider.
 */
export function defaultWeatherProvider(): WeatherProvider {
  return new OpenMeteoWeatherProvider()
}
