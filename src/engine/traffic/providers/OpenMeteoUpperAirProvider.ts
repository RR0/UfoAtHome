import type { UpperAir, UpperAirLevel, UpperAirProvider, UpperAirSample, UpperAirSource } from "../UpperAirProvider.js"

/** The levels asked for, by decreasing pressure: from the middle of the troposphere, where nothing of the kind forms, to above the cruise of an airliner. */
const LEVELS_HPA = [500, 400, 300, 250, 200, 150] as const
const FIELDS = ["temperature", "relative_humidity", "wind_speed", "wind_direction"] as const

/** The first day the levels are held for: this record starts in 2022, as the one of the aircraft does. */
const FIRST_DAY = "2022-01-01"
/** The model's own grid step, which is what makes two places one query. */
const GRID_DEG = 0.25

interface Response {
  hourly?: { time: string[] } & Record<string, (number | null)[] | string[]>
}

export interface OpenMeteoUpperAirProviderOptions {
  fetchImpl?: typeof fetch
  baseUrl?: string
}

/**
 * The air aloft, from Open-Meteo's historical forecast API: the analyses of the weather models, hourly, with the pressure levels
 * the archive of the reanalysis (the weather provider's) does not serve. Keyless and open to any origin.
 *
 * Analyses, not soundings: what the model says the atmosphere was, assimilating the observations there were. They are known to
 * underestimate how often the air at cruise levels is supersaturated over ice (their humidity is capped by their own cloud scheme):
 * a trail that persists in the sky may be one the model says should not, never the reverse by much.
 */
export class OpenMeteoUpperAirProvider implements UpperAirProvider {
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly cache = new Map<string, Promise<UpperAir>>()

  constructor(options: OpenMeteoUpperAirProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.baseUrl = options.baseUrl ?? "https://historical-forecast-api.open-meteo.com/v1/forecast"
  }

  between(place: { lat: number; lng: number }, startMs: number, endMs: number): Promise<UpperAir> {
    const first = new Date(startMs).toISOString().slice(0, 10)
    if (first < FIRST_DAY) return Promise.resolve({ status: "outside" })
    const last = new Date(endMs).toISOString().slice(0, 10)
    const cell = `${Math.round(place.lat / GRID_DEG)},${Math.round(place.lng / GRID_DEG)}`
    const key = `${cell}|${first}|${last}`
    let answer = this.cache.get(key)
    if (!answer) {
      answer = this.read(place, first, last)
      this.cache.set(key, answer)
      // Not kept when it could not be read: the next question tries again.
      void answer.then(result => { if (result.status === "failed") this.cache.delete(key) })
    }
    return answer
  }

  private async read(place: { lat: number; lng: number }, first: string, last: string): Promise<UpperAir> {
    const hourly = LEVELS_HPA.flatMap(level => FIELDS.map(field => `${field}_${level}hPa`))
    const params = new URLSearchParams({
      latitude: String(place.lat),
      longitude: String(place.lng),
      start_date: first,
      end_date: last,
      hourly: hourly.join(","),
      wind_speed_unit: "ms",
      timezone: "UTC"
    })
    const url = `${this.baseUrl}?${params}`
    try {
      const response = await this.fetchImpl(url)
      if (!response.ok) return { status: "failed" }
      const body = (await response.json()) as Response
      return this.decode(body, { id: "open-meteo-forecast", name: "Open-Meteo (historical forecast)", url })
    } catch {
      return { status: "failed" }
    }
  }

  private decode(body: Response, source: UpperAirSource): UpperAir {
    const series = body.hourly
    if (!series?.time) return { status: "outside" }
    const samples: UpperAirSample[] = []
    series.time.forEach((stamp, hour) => {
      const levels: UpperAirLevel[] = []
      for (const pressureHpa of LEVELS_HPA) {
        const value = (field: (typeof FIELDS)[number]) => (series[`${field}_${pressureHpa}hPa`] as (number | null)[] | undefined)?.[hour]
        const temperatureC = value("temperature")
        const humidity = value("relative_humidity")
        const speed = value("wind_speed")
        const from = value("wind_direction")
        if ([temperatureC, humidity, speed, from].some(v => v === null || v === undefined)) return
        levels.push({ pressureHpa, temperatureC: temperatureC!, relativeHumidity: humidity! / 100, windSpeedMs: speed!, windFromDeg: from! })
      }
      samples.push({ t: Date.parse(`${stamp}Z`), levels })
    })
    return samples.length > 0 ? { status: "found", samples, source } : { status: "outside" }
  }
}
