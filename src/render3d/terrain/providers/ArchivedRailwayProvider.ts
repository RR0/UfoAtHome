import type { GeoBounds } from "../GeoBounds.js"
import type { RailwayLine, RailwayProvider } from "../RailwayProvider.js"

/** Where the archive lives when the page itself does not carry a copy, as for the roads (see ArchivedRoadProvider). */
export const UFOATHOME_RAILWAYS_INDEX_URL = "https://ufoathome.org/railways/index.json"

/** One archived square of ground: the box it covers, and the file holding its railways. */
interface RailwayArchiveEntry {
  /** Relative to the index, so the whole directory can be copied to another host. */
  file: string
  north: number
  south: number
  east: number
  west: number
  /** Which recording it was frozen for: for a person reading the index, not for the matching. */
  about?: string
}

interface RailwayFile {
  version: number
  attribution: string
  lines: RailwayLine[]
}

export interface ArchivedRailwayProviderOptions {
  fetchImpl?: typeof fetch
  /** Where the index is looked for, in order. Mainly for tests. */
  indexUrls?: string[]
  /** Asked when the archive holds nothing for the ground wanted: the editor's live source. */
  fallback?: RailwayProvider
}

type Located = { entry: RailwayArchiveEntry, indexUrl: string }

/**
 * The railways UFO@home has frozen for the cases it publishes (`npm run build:railways`), for the reason the roads and the water are (see
 * ArchivedRoadProvider): outside France the live source is OpenStreetMap's Overpass, free and donated, and a published scene cannot put a query in
 * front of every reader of a case dossier for an answer that is the same every time. A place frozen with no line is an answer too (most places have
 * none), and nothing is asked about it.
 *
 * What the archive does not hold, the fallback answers: the editor, at a place nobody has published yet.
 */
export class ArchivedRailwayProvider implements RailwayProvider {
  /** Frozen from a survey of the day it was frozen, which is not the recording's: today's network either way. */
  readonly contemporary = true
  /** Replaced by what the archive itself states once one has been read: the credit belongs to the survey, not to the host that kept it. */
  private attributionRead?: string

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private readonly fallback?: RailwayProvider
  private index?: Promise<Located[]>
  /** The index load, shared by every provider of a page that asks the real network (not when a fetch is injected); an empty answer is forgotten. */
  private static readonly shared = new Map<string, Promise<Located[]>>()
  private readonly sharing: boolean

  constructor(options: ArchivedRailwayProviderOptions = {}) {
    this.sharing = !options.fetchImpl
    // Bound: an unbound fetch loses the `this` it needs once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? ArchivedRailwayProvider.defaultIndexUrls()
    this.fallback = options.fallback
  }

  get attribution(): string {
    return this.attributionRead ?? this.fallback?.attribution ?? "Railways © OpenStreetMap contributors"
  }

  async getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    const held = await this.held(bounds)
    if (held) return held
    if (!this.fallback) return []
    const lines = await this.fallback.getRailways(bounds)
    this.attributionRead = this.fallback.attribution
    return lines
  }

  /** The archived railways of the first entry that holds `bounds` whole, or nothing when none does. */
  private async held(bounds: GeoBounds): Promise<RailwayLine[] | undefined> {
    const entries = await this.load().catch((): Located[] => [])
    const found = entries.find(({ entry }) =>
      entry.north >= bounds.north && entry.south <= bounds.south && entry.east >= bounds.east && entry.west <= bounds.west)
    if (!found) return undefined
    try {
      const response = await this.fetchImpl(new URL(found.entry.file, found.indexUrl).href)
      if (!response.ok) return undefined
      const file = await response.json() as RailwayFile
      if (!Array.isArray(file?.lines)) return undefined
      this.attributionRead = file.attribution
      return file.lines
    } catch {
      return undefined
    }
  }

  private load(): Promise<Located[]> {
    if (this.index) return this.index
    if (!this.sharing) return (this.index = this.fetchFirstAvailable())
    const key = this.indexUrls.join("\n")
    let shared = ArchivedRailwayProvider.shared.get(key)
    if (!shared) {
      shared = this.fetchFirstAvailable()
      ArchivedRailwayProvider.shared.set(key, shared)
      void shared.then(entries => {
        if (entries.length === 0) ArchivedRailwayProvider.shared.delete(key)
      })
    }
    return (this.index = shared)
  }

  private async fetchFirstAvailable(): Promise<Located[]> {
    for (const indexUrl of this.indexUrls) {
      try {
        const response = await this.fetchImpl(indexUrl)
        if (!response.ok) continue
        const file = await response.json() as { entries?: RailwayArchiveEntry[] }
        if (Array.isArray(file?.entries)) return file.entries.map(entry => ({ entry, indexUrl }))
      } catch {
        // Not here (a 404 served as HTML, a CORS refusal, no network): the next address.
      }
    }
    return []
  }

  /** Beside the page first, then this project's own host, each under the version of the components asking: the index gains an entry at every release. */
  private static defaultIndexUrls(): string[] {
    const version = `?v=${encodeURIComponent(__APP_VERSION__)}`
    const here = typeof location === "undefined" ? undefined : new URL("/railways/index.json", location.href).href
    return (here && here !== UFOATHOME_RAILWAYS_INDEX_URL ? [here, UFOATHOME_RAILWAYS_INDEX_URL] : [UFOATHOME_RAILWAYS_INDEX_URL]).map(url => url + version)
  }
}
