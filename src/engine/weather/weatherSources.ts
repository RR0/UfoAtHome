import type { DataSource } from "../source/DataSource.js"
import type { WeatherProvider } from "./WeatherProvider.js"
import { OpenMeteoWeatherProvider } from "./providers/OpenMeteoWeatherProvider.js"

/** Every meteorological record the editor can read a sighting's conditions from. */
export const WEATHER_SOURCES: DataSource<WeatherProvider>[] = [
  {
    id: "era5",
    name: "Open-Meteo",
    credit: "© Copernicus/ECMWF",
    creditUrl: "https://open-meteo.com/en/docs/historical-weather-api",
    create: () => new OpenMeteoWeatherProvider()
  }
]

/**
 * Whether a source is one a lookup of ours wrote, rather than a weather the report itself names (a station's).
 * The provider answers a recent date from the forecast model and an older one from the reanalysis, under two ids,
 * but only the reanalysis is a choice the author can make (WEATHER_SOURCES): the other is no less our lookup's.
 */
export const isRecordSource = (source: { id: string }): boolean =>
  source.id === "open-meteo-forecast" || WEATHER_SOURCES.some(known => known.id === source.id)
