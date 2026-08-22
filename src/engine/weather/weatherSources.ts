import type { DataSource } from "../source/DataSource.js"
import type { WeatherProvider } from "./WeatherProvider.js"
import { OpenMeteoWeatherProvider } from "./providers/OpenMeteoWeatherProvider.js"

/** Every meteorological record the editor can read a sighting's conditions from. */
export const WEATHER_SOURCES: DataSource<WeatherProvider>[] = [
  {
    id: "era5",
    name: "ERA5 (Open-Meteo)",
    credit: "© Copernicus/ECMWF",
    creditUrl: "https://open-meteo.com/en/docs/historical-weather-api",
    create: () => new OpenMeteoWeatherProvider()
  }
]
