import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadWay } from "../RoadProvider.js"

/** Where the archive lives when the page itself doesn't carry a copy — same arrangement as the
 * model catalogue's own index (see UfoAtHomeModelCatalogue). */
export const UFOATHOME_ROAD_INDEX_URL = "https://ufoathome.org/roads/index.json"

/** One archived square of ground: the box it covers, and the file holding its ways. */
interface RoadArchiveEntry {
  /** Relative to the index, so the whole directory can be copied to another host. */
  file: string
  /** What the entry was fetched for, and what it therefore covers. */
  north: number
  south: number
  east: number
  west: number
  /** Which recording it was frozen for — for a person reading the index, not for the matching. */
  about?: string
}

interface RoadIndexFile {
  version: number
  entries: RoadArchiveEntry[]
}

interface RoadFile {
  version: number
  attribution: string
  contemporary: boolean
  ways: RoadWay[]
}

export interface ArchivedRoadProviderOptions {
  fetchImpl?: typeof fetch
  /** Where the index is looked for, in order. Mainly for tests. */
  indexUrls?: string[]
  /** Asked when the archive holds nothing for the ground wanted — the editor's live source. */
  fallback?: RoadProvider
}

/**
 * The roads UFO@home has frozen for the cases it publishes.
 *
 * This exists because of what a live Overpass query costs somebody else. The service is free and
 * donated, and it said so the first time a page with several scenes was opened: 429, then 504, then
 * a rate limit on the address that had been asking. A published player cannot put that in front of
 * every reader — a case dossier is read by people who never asked about roads, and the answer for
 * one recording's ground is the same every time.
 *
 * So the same rule the rest of this project applies to data it did not produce (see
 * UfoAtHomeModelCatalogue, and the orbital element archive): take a copy, keep the CREDIT with it,
 * and serve it from somewhere that will last. `npm run build:roads` writes those copies; this reads
 * them, beside the page first and from ufoathome.org otherwise.
 *
 * What the archive does not hold, the fallback answers — which is how the editor keeps working at
 * a place nobody has published yet, one person waiting for one square of ground.
 */
export class ArchivedRoadProvider implements RoadProvider {
  /** Replaced by whatever the archive itself states, once one has been read: the credit belongs to
   * the survey the ways came from, not to the host that kept them. */
  private attributionRead?: string
  private contemporaryRead?: boolean

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private readonly fallback?: RoadProvider
  /** The one in-flight (or settled) index load — small, and unchanged within a session. */
  private index?: Promise<{ entry: RoadArchiveEntry; indexUrl: string }[]>

  constructor(options: ArchivedRoadProviderOptions = {}) {
    // fetch.bind(globalThis) — an unbound fetch loses the `this` it requires once called as a
    // field (see AwsTerrariumElevationProvider, which learned the same thing).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? ArchivedRoadProvider.defaultIndexUrls()
    this.fallback = options.fallback
  }

  get attribution(): string {
    return this.attributionRead ?? this.fallback?.attribution ?? "Roads © OpenStreetMap contributors"
  }

  /** Whatever the file that answered says it is. An archive of OSM is still today's network, frozen
   * on the day it was taken — freezing it does not make it 1964 (see RoadProvider). */
  get contemporary(): boolean {
    return this.contemporaryRead ?? this.fallback?.contemporary ?? true
  }

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    const held = await this.held(bounds)
    if (held) return held
    if (!this.fallback) return []
    const ways = await this.fallback.getRoads(bounds)
    this.attributionRead = this.fallback.attribution
    this.contemporaryRead = this.fallback.contemporary
    return ways
  }

  /** The archived ways covering `bounds`, or nothing when no entry contains them. */
  private async held(bounds: GeoBounds): Promise<RoadWay[] | undefined> {
    let entries: { entry: RoadArchiveEntry; indexUrl: string }[]
    try {
      entries = await this.load()
    } catch {
      return undefined
    }
    const found = entries.find(({ entry }) =>
      entry.north >= bounds.north && entry.south <= bounds.south
      && entry.east >= bounds.east && entry.west <= bounds.west)
    if (!found) return undefined
    try {
      const response = await this.fetchImpl(new URL(found.entry.file, found.indexUrl).href)
      if (!response.ok) return undefined
      const file = (await response.json()) as RoadFile
      if (!Array.isArray(file?.ways)) return undefined
      this.attributionRead = file.attribution
      this.contemporaryRead = file.contemporary
      return file.ways
    } catch {
      return undefined
    }
  }

  private load(): Promise<{ entry: RoadArchiveEntry; indexUrl: string }[]> {
    this.index ??= this.fetchFirstAvailable()
    return this.index
  }

  private async fetchFirstAvailable(): Promise<{ entry: RoadArchiveEntry; indexUrl: string }[]> {
    for (const indexUrl of this.indexUrls) {
      try {
        const response = await this.fetchImpl(indexUrl)
        if (!response.ok) continue
        const file = (await response.json()) as RoadIndexFile
        if (Array.isArray(file?.entries)) return file.entries.map(entry => ({ entry, indexUrl }))
      } catch {
        // A 404 served as HTML, a CORS refusal, an offline browser: all the same answer here — this
        // address doesn't hold the archive, try the next.
      }
    }
    return []
  }

  /** Beside the page first, then this project's own host, each under the version of the components
   * asking — an index gains an entry at every release, and a week of hard caching once left readers
   * with a catalogue from before a model existed (see UfoAtHomeModelCatalogue). */
  private static defaultIndexUrls(): string[] {
    const version = `?v=${encodeURIComponent(__APP_VERSION__)}`
    const here = typeof location === "undefined" ? undefined : new URL("/roads/index.json", location.href).href
    return (here && here !== UFOATHOME_ROAD_INDEX_URL ? [here, UFOATHOME_ROAD_INDEX_URL] : [UFOATHOME_ROAD_INDEX_URL])
      .map(url => url + version)
  }
}
