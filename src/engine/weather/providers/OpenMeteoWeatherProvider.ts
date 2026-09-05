import type { PrecipitationType, Weather, WeatherSource } from "../../model/Weather.js"
import type { WeatherObservation, WeatherPoint, WeatherProvider, WeatherQuery, WeatherSample } from "../WeatherProvider.js"

/** ERA5's own first day — nothing before it can be looked up, and a 1933 or 1897 sighting must be
 * told so rather than handed a silently extrapolated sky. */
const ERA5_EPOCH_MS = Date.UTC(1940, 0, 1)

const HOUR_MS = 3_600_000

/** ERA5's own grid step. Two positions inside one cell read the exact same numbers whatever their
 * precise coordinates, so they are one query: a witness has to travel some 28 km before the record
 * has anything different to say about them. */
const ERA5_GRID_DEG = 0.25

/** Each layer's own contribution to how dark a deck looks, weighted by how much sky it covers:
 * a low stratus deck is the grey one, cirrus is bright even at full cover. */
const LOW_DECK_DARKNESS = 0.7
const MID_DECK_DARKNESS = 0.45
const HIGH_DECK_DARKNESS = 0.1
/** Rain rate (mm/h) at which a deck is as dark as falling water alone can make it. */
const WET_DECK_MM = 2
const WET_DECK_DARKENING = 0.3
const STORM_DARKENING = 0.2

/** Rate (mm/h) mapped to precipitationIntensity 1 — heavy rain, not a record-breaking cloudburst,
 * since the field saturates the renderer well before that. */
const HEAVY_PRECIPITATION_MM = 8

/** Sky fraction at which a layer is the deck a witness would describe, rather than a wisp. */
const SIGNIFICANT_LAYER_COVER = 0.125
/** Below this total cover there is no deck to give an altitude to at all. */
const VISIBLE_COVER = 0.05
/** Espy's approximation of the lifting condensation level: ~125 m per degree of spread between
 * the surface temperature and its dew point. Only meaningful for the LOW deck (the one that
 * actually forms at the LCL); mid and high decks get their layer's own typical base instead. */
const METERS_PER_SPREAD_DEG = 125
const MIN_LOW_BASE_M = 100
const MAX_LOW_BASE_M = 2500
const MID_BASE_M = 3500
const HIGH_BASE_M = 8000

/** WMO codes 95..99 are the thunderstorm family; 96 and 99 are the two that state hail. */
const STORM_CODE_MIN = 95
const STORM_CODE_MAX = 99
const HAIL_CODES = [96, 99]

const HOURLY_FIELDS = [
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "precipitation",
  "snowfall",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "temperature_2m",
  "dew_point_2m"
] as const

/** The subset of Open-Meteo's response this reads — declared rather than `any` so a renamed field
 * upstream fails to compile here instead of quietly producing NaN weather. */
interface OpenMeteoArchiveResponse {
  error?: boolean
  reason?: string
  hourly?: {
    time: string[]
    cloud_cover: number[]
    cloud_cover_low: number[]
    cloud_cover_mid: number[]
    cloud_cover_high: number[]
    precipitation: number[]
    snowfall: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    temperature_2m: number[]
    dew_point_2m: number[]
  }
}

/** One hour of the response, already picked out by index — the raw record, before any of it is
 * turned into this project's own Weather vocabulary. */
interface HourlyRecord {
  cloudCover: number
  cloudCoverLow: number
  cloudCoverMid: number
  cloudCoverHigh: number
  precipitationMm: number
  snowfallCm: number
  weatherCode: number
  windSpeedMs: number
  windFromDeg: number
  temperatureC: number
  dewPointC: number
}

export interface OpenMeteoWeatherProviderOptions {
  fetchImpl?: typeof fetch
  /** Defaults to Open-Meteo's public, keyless historical archive endpoint. */
  baseUrl?: string
}

/**
 * Real recorded weather from ERA5, the ECMWF reanalysis, served by Open-Meteo's historical archive
 * API — hourly, worldwide, from 1940 on, no API key, CORS-open (verified against rr0.org's own
 * origin), which is what makes it usable straight from a browser-embedded recorder.
 *
 * Reanalysis, not a station reading: ERA5 assimilates the observations that DO exist (stations,
 * ships, radiosondes, later satellites) into a physical model on a ~28 km grid, so it states what
 * the atmosphere was doing over the witness's valley, not what a thermometer in it read. For a
 * 1965 sighting in rural Provence that is the only kind of record there is, and it is a far better
 * starting point than a witness — or an author reconstructing the case decades later — guessing at
 * a cloud cover slider.
 *
 * Two of this project's fields have no direct counterpart in the record and are DERIVED here, in
 * the one place that knows the dataset (see cloudDarknessFrom/cloudBaseFrom): "cloud darkness" is
 * a look, not a measurement, and a cloud BASE altitude isn't an ERA5 hourly variable at all. Both
 * derivations are documented at their own constants above; both are honest approximations, and
 * both are exactly the kind of thing a witness may overrule by unlocking the field.
 */
export class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  /** Same query, same answer — the editor re-asks on every debounced date/place edit, and a
   * reanalysis of 1965 will not have changed since the last keystroke. */
  private readonly cache = new Map<string, WeatherObservation>()

  constructor(options: OpenMeteoWeatherProviderOptions = {}) {
    // fetch.bind(globalThis), not the bare reference — see AwsTerrariumElevationProvider's own
    // comment on the "Illegal invocation" this avoids.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.baseUrl = options.baseUrl ?? "https://archive-api.open-meteo.com/v1/archive"
  }

  async getWeather(query: WeatherQuery): Promise<WeatherObservation | undefined> {
    if (query.points.length === 0) return undefined
    const stamps = query.points.map(point => point.time.getTime())
    const startMs = Math.min(...stamps)
    if (startMs < ERA5_EPOCH_MS) return undefined

    // One entry per grid cell the observer passed through, in the order first reached — a
    // stationary witness (nearly all of them) yields exactly one, and the request below is then
    // the same single-location one it always was.
    const cells = new Map<string, { lat: number; lng: number; index: number }>()
    for (const point of query.points) {
      const key = this.cellKey(point)
      if (!cells.has(key)) cells.set(key, { lat: point.lat, lng: point.lng, index: cells.size })
    }

    const url = this.requestUrl([...cells.values()], new Date(startMs), new Date(Math.max(...stamps)))
    const cached = this.cache.get(url)
    if (cached) return cached

    const response = await this.fetchImpl(url)
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`)
    const json = (await response.json()) as OpenMeteoArchiveResponse | OpenMeteoArchiveResponse[]
    // Open-Meteo answers a single location with an object and several with an array — normalized
    // here so the rest of this reads one way.
    const perCell = Array.isArray(json) ? json : [json]
    // An `error` payload is all but always an out-of-range date ("Invalid date" for anything
    // before 1940, or a date the archive hasn't caught up to yet) — "no record", not "the lookup
    // broke", so it takes the undefined path rather than throwing.
    if (perCell.length < cells.size || perCell.some(entry => entry.error || !entry.hourly)) return undefined

    const source: WeatherSource = { id: "era5", name: "ERA5 (Open-Meteo)", url }
    const samples = query.points.map(point =>
      this.sampleAt(perCell[cells.get(this.cellKey(point))!.index].hourly!, point.time)
    )
    if (samples.some(sample => sample === undefined)) return undefined
    const observation: WeatherObservation = { samples: samples as WeatherSample[], source }
    this.cache.set(url, observation)
    return observation
  }

  private cellKey(point: WeatherPoint): string {
    return `${Math.round(point.lat / ERA5_GRID_DEG)},${Math.round(point.lng / ERA5_GRID_DEG)}`
  }

  /** Comma-separated coordinate lists are how the archive takes several locations in ONE request —
   * which keeps `WeatherSource.url` a single, replayable request even for a witness who moved,
   * rather than a lookup nobody could re-run in full. */
  private requestUrl(cells: { lat: number; lng: number }[], start: Date, end: Date): string {
    const params = new URLSearchParams({
      latitude: cells.map(cell => cell.lat).join(","),
      longitude: cells.map(cell => cell.lng).join(","),
      start_date: this.isoDate(start),
      end_date: this.isoDate(end),
      hourly: HOURLY_FIELDS.join(","),
      // m/s is what Weather.windSpeed is in — asking for it beats converting km/h here and
      // getting the factor wrong in a place nobody would look at again.
      wind_speed_unit: "ms",
      timezone: "UTC"
    })
    return `${this.baseUrl}?${params}`
  }

  private isoDate(date: Date): string {
    return date.toISOString().slice(0, 10)
  }

  /** undefined when the response doesn't cover `time` (a truncated series), which the caller turns
   * into "no record" rather than a hole in the middle of a track. */
  private sampleAt(hourly: NonNullable<OpenMeteoArchiveResponse["hourly"]>, time: Date): WeatherSample | undefined {
    const record = this.recordAt(hourly, time)
    return record && { time, weather: this.toWeather(record) }
  }

  /**
   * The record read AT `time`, blended between the two hourly rows that bracket it rather than
   * snapped to the nearer one. ERA5's hourly values are instantaneous samples of a continuous
   * atmosphere, so reading between them is how the dataset is meant to be used — and it is what
   * lets an observation shorter than an hour still carry a weatherTrack that *changes*, instead of
   * one flat value repeated. (`precipitation` is the one accumulation among them, over the
   * preceding hour; blending it is an approximation, and a mild one at this resolution.)
   */
  private recordAt(hourly: NonNullable<OpenMeteoArchiveResponse["hourly"]>, time: Date): HourlyRecord | undefined {
    // Open-Meteo's `time` entries are naive ISO strings already expressed in the timezone asked
    // for (UTC here), so they need the "Z" the API omits before they mean an instant.
    const stamps = hourly.time.map(entry => Date.parse(`${entry}Z`))
    const target = time.getTime()
    if (stamps.length === 0) return undefined
    // Beyond an hour outside the series is a truncated response, not a value to extrapolate.
    if (target < stamps[0] - HOUR_MS || target > stamps[stamps.length - 1] + HOUR_MS) return undefined
    if (target <= stamps[0]) return this.recordFrom(hourly, 0)
    if (target >= stamps[stamps.length - 1]) return this.recordFrom(hourly, stamps.length - 1)
    let index = 0
    while (index + 1 < stamps.length && stamps[index + 1] <= target) index++
    const span = stamps[index + 1] - stamps[index]
    return this.blendRecords(
      this.recordFrom(hourly, index),
      this.recordFrom(hourly, index + 1),
      span > 0 ? (target - stamps[index]) / span : 0
    )
  }

  /** undefined for a row the response left short of the others — a malformed series, reported as
   * "no record" rather than silently read as NaN weather. */
  private recordFrom(hourly: NonNullable<OpenMeteoArchiveResponse["hourly"]>, index: number): HourlyRecord | undefined {
    const record: HourlyRecord = {
      cloudCover: hourly.cloud_cover[index] / 100,
      cloudCoverLow: hourly.cloud_cover_low[index] / 100,
      cloudCoverMid: hourly.cloud_cover_mid[index] / 100,
      cloudCoverHigh: hourly.cloud_cover_high[index] / 100,
      precipitationMm: hourly.precipitation[index],
      snowfallCm: hourly.snowfall[index],
      weatherCode: hourly.weather_code[index],
      windSpeedMs: hourly.wind_speed_10m[index],
      windFromDeg: hourly.wind_direction_10m[index],
      temperatureC: hourly.temperature_2m[index],
      dewPointC: hourly.dew_point_2m[index]
    }
    return Object.values(record).some(value => value === undefined || Number.isNaN(value)) ? undefined : record
  }

  /** Blends the raw record, not the mapped Weather: everything derived from it (deck darkness,
   * cloud base, precipitation type) then stays internally consistent, instead of a cloud base
   * halfway between 500 m and 8000 m describing a deck that was never at either. The WMO code is
   * a category, so it is held from the nearer hour rather than averaged, and the wind bearing
   * takes the shortest arc (350deg -> 10deg through 0, same rule as WeatherTrack's own
   * lerpAngleDeg). */
  private blendRecords(from: HourlyRecord | undefined, to: HourlyRecord | undefined, fraction: number): HourlyRecord | undefined {
    if (!from || !to) return from ?? to
    const lerp = (a: number, b: number): number => a + (b - a) * fraction
    const delta = ((((to.windFromDeg - from.windFromDeg) % 360) + 540) % 360) - 180
    return {
      cloudCover: lerp(from.cloudCover, to.cloudCover),
      cloudCoverLow: lerp(from.cloudCoverLow, to.cloudCoverLow),
      cloudCoverMid: lerp(from.cloudCoverMid, to.cloudCoverMid),
      cloudCoverHigh: lerp(from.cloudCoverHigh, to.cloudCoverHigh),
      precipitationMm: lerp(from.precipitationMm, to.precipitationMm),
      snowfallCm: lerp(from.snowfallCm, to.snowfallCm),
      weatherCode: fraction < 0.5 ? from.weatherCode : to.weatherCode,
      windSpeedMs: lerp(from.windSpeedMs, to.windSpeedMs),
      windFromDeg: (((from.windFromDeg + delta * fraction) % 360) + 360) % 360,
      temperatureC: lerp(from.temperatureC, to.temperatureC),
      dewPointC: lerp(from.dewPointC, to.dewPointC)
    }
  }

  private toWeather(record: HourlyRecord): Weather {
    const storm = record.weatherCode >= STORM_CODE_MIN && record.weatherCode <= STORM_CODE_MAX
    const precipitationType = this.precipitationTypeFrom(record)
    return {
      cloudCover: this.clamp(record.cloudCover, 0, 1),
      cloudDarkness: this.cloudDarknessFrom(record, storm),
      cloudBaseM: this.cloudBaseFrom(record),
      // The ice deck, carried through rather than only folded into the darkness: it is the one
      // ingredient the halos need, and the record has it (see Weather.highCloudCover).
      highCloudCover: record.cloudCoverHigh,
      // Whichever of the two lower decks covers more sky: that is what stands between the witness
      // and the ice above, and it is the deck a halo has to be seen through.
      lowerCloudCover: Math.max(record.cloudCoverLow, record.cloudCoverMid),
      precipitationType,
      precipitationIntensity:
        precipitationType === "none" ? 0 : this.clamp(Math.sqrt(record.precipitationMm / HEAVY_PRECIPITATION_MM), 0, 1),
      // The record states where the wind came FROM; Weather.windDirectionDeg is where it blows TO
      // — see that field's own doc comment. This is the only place the two conventions meet.
      windDirectionDeg: (record.windFromDeg + 180) % 360,
      windSpeed: record.windSpeedMs,
      storm
    }
  }

  /** Snow first: a snowfall total settles the question whatever else the code says. Hail is only
   * ever stated by the two thunderstorm-with-hail codes — nothing else in the record distinguishes
   * it from rain. */
  private precipitationTypeFrom(record: HourlyRecord): PrecipitationType {
    if (record.snowfallCm > 0) return "snow"
    if (HAIL_CODES.includes(record.weatherCode)) return "hail"
    return record.precipitationMm > 0 ? "rain" : "none"
  }

  /** No such measurement exists, so this derives the LOOK from what does: which layers hold the
   * cloud (a low deck is grey, cirrus is bright), whether it is raining out of them, and whether
   * it is a thunderstorm. Weighted by each layer's own share of the sky, so a thin low deck under
   * mostly cirrus doesn't darken the whole thing. */
  private cloudDarknessFrom(record: HourlyRecord, storm: boolean): number {
    const layered = record.cloudCoverLow + record.cloudCoverMid + record.cloudCoverHigh
    if (layered <= 0) return 0
    const perLayer =
      (LOW_DECK_DARKNESS * record.cloudCoverLow +
        MID_DECK_DARKNESS * record.cloudCoverMid +
        HIGH_DECK_DARKNESS * record.cloudCoverHigh) /
      layered
    const wet = Math.min(1, record.precipitationMm / WET_DECK_MM)
    return this.clamp(perLayer + WET_DECK_DARKENING * wet + (storm ? STORM_DARKENING : 0), 0, 1)
  }

  /** ERA5 hourly has no cloud-base variable, so this places the deck the witness would actually be
   * describing: the LOWEST layer holding a real share of the sky, at that layer's own altitude —
   * the low deck's from Espy's temperature/dew-point spread (it forms at the condensation level,
   * which the record does let us compute), mid and high decks at their typical bases, which no
   * surface reading can pin down any better. undefined — "unstated", falling back to
   * DEFAULT_CLOUD_BASE_M — when there is barely any cloud to place. */
  private cloudBaseFrom(record: HourlyRecord): number | undefined {
    if (record.cloudCover < VISIBLE_COVER) return undefined
    const lowBaseM = this.clamp(
      METERS_PER_SPREAD_DEG * (record.temperatureC - record.dewPointC),
      MIN_LOW_BASE_M,
      MAX_LOW_BASE_M
    )
    if (record.cloudCoverLow >= SIGNIFICANT_LAYER_COVER) return Math.round(lowBaseM)
    if (record.cloudCoverMid >= SIGNIFICANT_LAYER_COVER) return MID_BASE_M
    if (record.cloudCoverHigh >= SIGNIFICANT_LAYER_COVER) return HIGH_BASE_M
    // Every layer is a wisp, yet the total is visible: the deck is whichever holds the most of it.
    const highest = Math.max(record.cloudCoverLow, record.cloudCoverMid, record.cloudCoverHigh)
    if (highest <= 0) return undefined
    if (highest === record.cloudCoverLow) return Math.round(lowBaseM)
    return highest === record.cloudCoverMid ? MID_BASE_M : HIGH_BASE_M
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
