/** A wind as the readings write it: where it blows TOWARDS, degrees from north, and how fast. */
export interface Wind {
  towardDeg: number
  speedMS: number
}

/** The wind of one place and hour, at the heights the archive gives, lowest first: metres above the ground of its grid point. */
export interface WindProfile {
  /** The latitude and longitude of the archive's grid point, which is not quite the place asked for. */
  lat: number
  lng: number
  /** The height of the grid point's ground, metres above sea level. */
  elevationM: number
  /** The hour it is the wind of, UTC, ISO ("2023-10-15T02:00"). */
  hour: string
  levels: { aboveGroundM: number, wind: Wind }[]
  /** Who gives it, for the rationale of a value read from it. */
  credit: string
}

/** Where scenarios read the wind from: an archive, or anything that answers as one (a test's fixed winds). */
export interface WindSource {
  profile(lat: number, lng: number, date: Date): Promise<WindProfile>
}

/** What a fetched response is kept in between two asks, as a key and its text: a directory for the command line, a Map in a page. */
export interface ResponseCache {
  get(key: string): Promise<string | undefined>
  set(key: string, text: string): Promise<void>
}

/**
 * The wind of a place and an hour, at 10 m and from 850 to 300 hPa, as the Open-Meteo historical forecast archived it: the archive of the
 * forecasts' first hours, which goes back to 2022 at a few kilometres' resolution and gives the heights of the pressure levels, as ERA5
 * does not at that resolution.
 *
 * Open-Meteo limits how fast it is asked (429 Too Many Requests): an ask it refuses is asked again later, a little later each time, and a
 * day of one place is asked once and kept for every hour of it.
 */
export class OpenMeteoWindProfiles implements WindSource {

  static readonly URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
  static readonly CREDIT = "Open-Meteo historical forecast"
  static readonly LEVELS = [850, 700, 600, 500, 400, 300] as const
  /** How many times a refused ask is made again, the wait doubling from RETRY_MS. */
  static readonly RETRIES = 6
  static readonly RETRY_MS = 2000

  private readonly days = new Map<string, Promise<OpenMeteoHourly>>()
  private readonly fetchImpl: typeof fetch
  private readonly wait: (ms: number) => Promise<void>

  constructor(private readonly options: { fetchImpl?: typeof fetch, cache?: ResponseCache, wait?: (ms: number) => Promise<void>, url?: string } = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  }

  /**
   * The wind at `date`: between the two hours of the archive around it, each level's height and wind interpolated (the wind as a vector), as
   * the air changes from one hour to the next.
   */
  async profile(lat: number, lng: number, date: Date): Promise<WindProfile> {
    const HOUR = 3_600_000
    const before = new Date(Math.floor(date.getTime() / HOUR) * HOUR)
    const f = (date.getTime() - before.getTime()) / HOUR
    const first = await this.hourly(lat, lng, before)
    if (f < 1e-6) return first
    const second = await this.hourly(lat, lng, new Date(before.getTime() + HOUR))
    // The same levels both hours, as at one grid point they are: else the nearer hour's.
    if (first.levels.length !== second.levels.length) return f < 0.5 ? first : second
    return {
      ...first,
      hour: date.toISOString().slice(0, 16),
      levels: first.levels.map((level, i) => {
        const [ax, ay] = Winds.vector(level.wind), [bx, by] = Winds.vector(second.levels[i].wind)
        return { aboveGroundM: level.aboveGroundM + f * (second.levels[i].aboveGroundM - level.aboveGroundM), wind: Winds.fromVector(ax + f * (bx - ax), ay + f * (by - ay)) }
      })
    }
  }

  /** The wind of the archive's hour `hourDate`. */
  private async hourly(lat: number, lng: number, hourDate: Date): Promise<WindProfile> {
    const hour = hourDate.toISOString().slice(0, 13) + ":00"
    const day = hour.slice(0, 10)
    const key = `${lat.toFixed(4)},${lng.toFixed(4)},${day}`
    let loading = this.days.get(key)
    if (!loading) {
      loading = this.day(lat, lng, day, key)
      loading.catch(() => this.days.delete(key))
      this.days.set(key, loading)
    }
    return OpenMeteoWindProfiles.profileOf(await loading, hour)
  }

  /** The profile of `hour` in a day's answer. */
  static profileOf(answer: OpenMeteoHourly, hour: string): WindProfile {
    const h = answer.hourly
    const i = h.time.indexOf(hour)
    if (i < 0) throw new Error(`No wind for ${hour} in the archive's answer`)
    const toward = (fromDeg: number) => (fromDeg + 180) % 360
    const levels: WindProfile["levels"] = []
    const ground = h.wind_speed_10m?.[i], groundFrom = h.wind_direction_10m?.[i]
    if (typeof ground === "number" && typeof groundFrom === "number") levels.push({ aboveGroundM: 10, wind: { towardDeg: toward(groundFrom), speedMS: ground } })
    for (const level of OpenMeteoWindProfiles.LEVELS) {
      const z = h[`geopotential_height_${level}hPa`]?.[i], speed = h[`wind_speed_${level}hPa`]?.[i], from = h[`wind_direction_${level}hPa`]?.[i]
      if (typeof z !== "number" || typeof speed !== "number" || typeof from !== "number") continue
      const above = z - answer.elevation
      // A pressure level below the ground there (850 hPa under a high plateau) is not air anyone flew in.
      if (above <= (levels[levels.length - 1]?.aboveGroundM ?? 0)) continue
      levels.push({ aboveGroundM: above, wind: { towardDeg: toward(from), speedMS: speed } })
    }
    if (levels.length === 0) throw new Error(`No wind for ${hour} in the archive's answer`)
    return { lat: answer.latitude, lng: answer.longitude, elevationM: answer.elevation, hour, levels, credit: OpenMeteoWindProfiles.CREDIT }
  }

  private async day(lat: number, lng: number, day: string, key: string): Promise<OpenMeteoHourly> {
    const cached = await this.options.cache?.get(key)
    if (cached) return JSON.parse(cached) as OpenMeteoHourly
    const hourly = ["wind_speed_10m", "wind_direction_10m",
      ...OpenMeteoWindProfiles.LEVELS.flatMap(level => [`wind_speed_${level}hPa`, `wind_direction_${level}hPa`, `geopotential_height_${level}hPa`])]
    const params = new URLSearchParams({
      latitude: String(lat), longitude: String(lng), start_date: day, end_date: day, hourly: hourly.join(","), wind_speed_unit: "ms", timezone: "GMT"
    })
    const url = `${this.options.url ?? OpenMeteoWindProfiles.URL}?${params}`
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetchImpl(url)
      if (response.ok) {
        const text = await response.text()
        await this.options.cache?.set(key, text)
        return JSON.parse(text) as OpenMeteoHourly
      }
      if ((response.status === 429 || response.status >= 500) && attempt < OpenMeteoWindProfiles.RETRIES) {
        await this.wait(OpenMeteoWindProfiles.RETRY_MS * 2 ** attempt)
        continue
      }
      throw new Error(`The wind archive answered ${response.status} for ${key}`)
    }
  }
}

/** What Open-Meteo answers, as far as it is read. */
export interface OpenMeteoHourly {
  latitude: number
  longitude: number
  elevation: number
  hourly: { time: string[] } & Record<string, (number | null)[] | string[] | undefined> & { [key: string]: any }
}

/** Reading a profile. */
export class Winds {

  /** The wind `aboveGroundM` metres above the ground, interpolated as a vector between the profile's levels, held beyond them. */
  static at(profile: WindProfile, aboveGroundM: number): Wind {
    const levels = profile.levels
    if (aboveGroundM <= levels[0].aboveGroundM) return { ...levels[0].wind }
    for (let i = 1; i < levels.length; i++) {
      const lo = levels[i - 1], hi = levels[i]
      if (aboveGroundM <= hi.aboveGroundM) {
        const f = (aboveGroundM - lo.aboveGroundM) / (hi.aboveGroundM - lo.aboveGroundM)
        const [ax, ay] = Winds.vector(lo.wind), [bx, by] = Winds.vector(hi.wind)
        return Winds.fromVector(ax + f * (bx - ax), ay + f * (by - ay))
      }
    }
    return { ...levels[levels.length - 1].wind }
  }

  /** East and north components, m/s. */
  static vector(wind: Wind): [number, number] {
    const r = wind.towardDeg * Math.PI / 180
    return [wind.speedMS * Math.sin(r), wind.speedMS * Math.cos(r)]
  }

  static fromVector(east: number, north: number): Wind {
    return { towardDeg: (Math.atan2(east, north) * 180 / Math.PI + 360) % 360, speedMS: Math.hypot(east, north) }
  }

  /** `wind` as a file writes it: to the degree and the centimetre a second. */
  static rounded(wind: Wind): Wind {
    return { towardDeg: Math.round(wind.towardDeg) % 360, speedMS: Math.round(wind.speedMS * 100) / 100 }
  }
}
