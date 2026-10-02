import type { GeoPoint } from "../../interpretation/Reentry.js"
import type { AircraftDescription, AircraftProvider, AircraftTraffic, AircraftTrack } from "../AircraftProvider.js"
import { AircraftSighting } from "../AircraftSighting.js"
import { AircraftTile } from "./AircraftTile.js"

/**
 * Where the archive is served. A placeholder until the tiles have a host: they are about 250 GB a year,
 * too many for the site itself.
 */
export const UFOATHOME_AIRCRAFT_INDEX_URL = "https://ufoathome.org/aircraft/index.json"

/** What scripts/build-aircraft-archive.ts writes at the root of the archive. */
interface ArchiveIndex {
  credit: string
  license: string
  from: string
  to: string
  days: string[]
}

export interface AdsbLolArchiveProviderOptions {
  fetchImpl?: typeof fetch
  /** Where the index is looked for, in order; the days are beside whichever answered. Mainly for tests. */
  indexUrls?: string[]
}

/**
 * The aircraft ADSB.lol's feeders heard, read from the archive scripts/build-aircraft-archive.ts builds
 * out of its open daily releases (ODbL 1.0; see that script for the layout and the record format).
 *
 * The archive is static files: for each UTC hour, a pack with one gzip member per 1 degree tile, and an
 * index of the members' offsets. So the traffic around a place and a time is a few ranged requests — the
 * tiles that cover the radius, for the hours that cover the window — with no server and no key.
 */
export class AdsbLolArchiveProvider implements AircraftProvider {
  readonly citation = "Aircraft positions: adsb.lol feeders and contributors, Open Database License 1.0 (https://www.adsb.lol/docs/open-data/historical/)"

  /** How far around the observer aircraft are looked for, km: the far ones are the ones taken for something else. */
  static readonly DEFAULT_RADIUS_KM = 150
  /** The aircraft database's flags, as the ingestion keeps them. */
  private static readonly FLAG_MILITARY = 1
  private static readonly FLAG_PIA = 4
  private static readonly FLAG_LADD = 8
  private static readonly KM_PER_DEG = 111.32
  private static readonly HOUR_MS = 3600_000

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private index?: Promise<{ index: ArchiveIndex; base: string } | undefined>
  private readonly hours = new Map<string, Promise<Record<string, [number, number]>>>()
  private readonly tiles = new Map<string, Promise<AircraftTrack[]>>()
  private readonly shards = new Map<string, Promise<Record<string, [string, string, string?, number?]>>>()

  constructor(options: AdsbLolArchiveProviderOptions = {}) {
    // fetch.bind(globalThis): an unbound fetch loses the `this` it requires once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? AdsbLolArchiveProvider.defaultIndexUrls()
  }

  /** Beside the page first (this site, a dev server), ufoathome.org otherwise. */
  static defaultIndexUrls(): string[] {
    const urls: string[] = []
    if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
      urls.push(new URL("/aircraft/index.json", location.href).href)
    }
    if (!urls.includes(UFOATHOME_AIRCRAFT_INDEX_URL)) urls.push(UFOATHOME_AIRCRAFT_INDEX_URL)
    return urls
  }

  /** The first day of the archive, known without asking it: ADSB.lol's open history begins in 2022 at the earliest. */
  static readonly FIRST_DAY = "2022-01-01"

  mayCover(ms: number): boolean {
    return new Date(ms).toISOString().slice(0, 10) >= AdsbLolArchiveProvider.FIRST_DAY
  }

  async between(observer: GeoPoint, startMs: number, endMs: number, radiusKm = AdsbLolArchiveProvider.DEFAULT_RADIUS_KM): Promise<AircraftTraffic> {
    const loaded = await this.loadIndex()
    if (!loaded) return { status: "failed" }
    const hours: number[] = []
    for (let hour = Math.floor(startMs / AdsbLolArchiveProvider.HOUR_MS); hour <= Math.floor(endMs / AdsbLolArchiveProvider.HOUR_MS); hour++) hours.push(hour)
    // A window half covered is not returned as if it were whole: fewer aircraft than there were.
    if (!hours.every(hour => loaded.index.days.includes(AdsbLolArchiveProvider.dayOf(hour)))) return { status: "outside" }
    const keys = AdsbLolArchiveProvider.tilesAround(observer, radiusKm)
    try {
      const found = (await Promise.all(hours.flatMap(hour => keys.map(key => this.tileOf(loaded.base, hour, key))))).flat()
      return { status: "found", tracks: AdsbLolArchiveProvider.merge(found, observer, startMs, endMs, radiusKm) }
    } catch {
      return { status: "failed" }
    }
  }

  async describe(track: AircraftTrack, day: string): Promise<AircraftDescription | undefined> {
    const loaded = await this.loadIndex()
    if (!loaded) return undefined
    const hex = track.icao.toString(16).padStart(6, "0")
    const shard = track.nonIcao ? "non-icao" : hex.slice(0, 2)
    const key = `${day}/${shard}`
    let described = this.shards.get(key)
    if (!described) {
      described = this.fetchImpl(new URL(`${day}/aircraft/${shard}.json`, loaded.base).href)
        .then(response => response.ok ? response.json() as Promise<Record<string, [string, string, string?, number?]>> : {})
        .catch(() => ({}))
      this.shards.set(key, described)
    }
    const entry = (await described)[track.nonIcao ? `~${hex}` : hex]
    if (!entry) return undefined
    const [registration, type, category, flags = 0] = entry
    const description: AircraftDescription = {
      registration: registration || undefined,
      type: type || undefined,
      category: category || undefined,
      military: (flags & AdsbLolArchiveProvider.FLAG_MILITARY) !== 0 || undefined,
      restricted: (flags & (AdsbLolArchiveProvider.FLAG_PIA | AdsbLolArchiveProvider.FLAG_LADD)) !== 0 || undefined
    }
    return Object.values(description).some(value => value !== undefined) ? description : undefined
  }

  /**
   * The keys ("floor lat_floor lng") of the 1 degree tiles that cover a circle of `radiusKm` around
   * `observer`, wrapped at the antimeridian and bounded at the poles.
   */
  static tilesAround(observer: GeoPoint, radiusKm: number): string[] {
    const dLat = radiusKm / AdsbLolArchiveProvider.KM_PER_DEG
    const south = Math.max(-90, observer.lat - dLat)
    const north = Math.min(90, observer.lat + dLat)
    // A degree of longitude is shortest at the pole-ward edge of the band: size it there.
    const cos = Math.cos((Math.max(Math.abs(south), Math.abs(north)) * Math.PI) / 180)
    const dLng = cos < 1e-6 ? 180 : radiusKm / (AdsbLolArchiveProvider.KM_PER_DEG * cos)
    const lngs = new Set<number>()
    if (dLng >= 180) {
      for (let lng = -180; lng < 180; lng++) lngs.add(lng)
    } else {
      for (let lng = Math.floor(observer.lng - dLng); lng <= Math.floor(observer.lng + dLng); lng++) lngs.add(AircraftSighting.wrapLongitude(lng))
    }
    const keys: string[] = []
    for (let lat = Math.floor(south); lat <= Math.min(89, Math.floor(north)); lat++) {
      for (const lng of lngs) keys.push(`${lat}_${lng}`)
    }
    return keys
  }

  private static dayOf(hour: number): string {
    return new Date(hour * AdsbLolArchiveProvider.HOUR_MS).toISOString().slice(0, 10)
  }

  /** The tracks of the tiles gathered, joined per aircraft, kept to the window and the radius. */
  private static merge(found: AircraftTrack[], observer: GeoPoint, startMs: number, endMs: number, radiusKm: number): AircraftTrack[] {
    const byAircraft = new Map<string, AircraftTrack>()
    for (const track of found) {
      const points = track.points.filter(point => point.t >= startMs && point.t <= endMs && AircraftSighting.groundDistanceKm(observer, point) <= radiusKm)
      if (points.length === 0) continue
      const key = `${track.nonIcao ? "~" : ""}${track.icao}`
      const known = byAircraft.get(key)
      if (known) known.points.push(...points)
      else byAircraft.set(key, { icao: track.icao, nonIcao: track.nonIcao, points })
    }
    const tracks = [...byAircraft.values()]
    for (const track of tracks) track.points.sort((a, b) => a.t - b.t)
    return tracks.sort((a, b) => a.icao - b.icao)
  }

  private loadIndex(): Promise<{ index: ArchiveIndex; base: string } | undefined> {
    this.index ??= (async () => {
      for (const url of this.indexUrls) {
        try {
          const response = await this.fetchImpl(url)
          if (response.ok) return { index: await response.json() as ArchiveIndex, base: url }
        } catch {
          // The next one, then.
        }
      }
      return undefined
    })()
    return this.index
  }

  /** One tile of one hour, by a ranged read of the hour's pack. A tile the hour's index lacks held no aircraft. */
  private tileOf(base: string, hour: number, key: string): Promise<AircraftTrack[]> {
    const day = AdsbLolArchiveProvider.dayOf(hour)
    const name = String(hour % 24).padStart(2, "0")
    const cacheKey = `${day}/${name}/${key}`
    let tile = this.tiles.get(cacheKey)
    if (!tile) {
      tile = this.hourIndex(base, day, name).then(async index => {
        const member = index[key]
        if (!member) return []
        const [offset, length] = member
        const response = await this.fetchImpl(new URL(`${day}/${name}.pack`, base).href, { headers: { Range: `bytes=${offset}-${offset + length - 1}` } })
        if (!response.ok) throw new Error(`The pack of ${day} ${name} h answered ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        // A host that ignores ranges sends the whole pack: take the member out of it.
        const gzipped = response.status === 206 ? bytes : bytes.subarray(offset, offset + length)
        return AdsbLolArchiveProvider.tracksOf(await AdsbLolArchiveProvider.gunzip(gzipped), hour)
      })
      // A failure is not remembered: the next ask tries again.
      tile.catch(() => this.tiles.delete(cacheKey))
      this.tiles.set(cacheKey, tile)
    }
    return tile
  }

  private hourIndex(base: string, day: string, name: string): Promise<Record<string, [number, number]>> {
    const key = `${day}/${name}`
    let index = this.hours.get(key)
    if (!index) {
      index = this.fetchImpl(new URL(`${day}/${name}.json`, base).href).then(response => {
        // An hour of a held day with no file is an hour with no traffic recorded.
        if (response.status === 404) return {}
        if (!response.ok) throw new Error(`The index of ${day} ${name} h answered ${response.status}`)
        return response.json() as Promise<Record<string, [number, number]>>
      })
      index.catch(() => this.hours.delete(key))
      this.hours.set(key, index)
    }
    return index
  }

  private static async gunzip(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  /** The records of one tile and hour, grouped into one track per aircraft. */
  private static tracksOf(bytes: Uint8Array, hour: number): AircraftTrack[] {
    const tracks = new Map<string, AircraftTrack>()
    for (const position of AircraftTile.decode(bytes)) {
      const key = `${position.nonIcao ? "~" : ""}${position.icao}`
      let track = tracks.get(key)
      if (!track) tracks.set(key, track = { icao: position.icao, nonIcao: position.nonIcao, points: [] })
      track.points.push({
        t: hour * AdsbLolArchiveProvider.HOUR_MS + position.secondsInHour * 1000,
        lat: position.lat,
        lng: position.lng,
        altitudeFt: position.altitudeFt,
        groundSpeedKt: position.groundSpeedKt,
        trackDeg: position.trackDeg
      })
    }
    return [...tracks.values()]
  }
}
