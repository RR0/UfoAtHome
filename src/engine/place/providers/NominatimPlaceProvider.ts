import type { PlaceAttribution, PlaceMatch, PlaceProvider, PlaceSearchOptions } from "../PlaceProvider.js"

const DEFAULT_LIMIT = 5

/** The subset of Nominatim's jsonv2 result this reads — declared rather than `any` so a renamed
 * field upstream fails to compile here instead of quietly producing NaN coordinates. */
interface NominatimResult {
  display_name?: string
  name?: string
  lat?: string
  lon?: string
}

export interface NominatimPlaceProviderOptions {
  fetchImpl?: typeof fetch
  /** Defaults to OpenStreetMap's own public endpoint. */
  baseUrl?: string
  /** Its reverse counterpart, a sibling path on the same service. */
  reverseUrl?: string
}

/**
 * Place-name search against OpenStreetMap's Nominatim — keyless, CORS-open (verified against
 * rr0.org's own origin), and, unlike the gazetteer-style geocoders, it knows more than populated
 * places: the hamlets, farms, airfields and stretches of road that testimony actually names.
 *
 * Nominatim's usage policy allows exactly this kind of use — a search a person asked for, one at a
 * time — and rules out per-keystroke autocomplete and bulk work. That is why the recorder searches
 * only on an explicit Enter or button press rather than as you type, and why identical queries are
 * answered from the cache below instead of re-asked. Attribution is not optional and is shown
 * beside the results.
 */
export class NominatimPlaceProvider implements PlaceProvider {
  readonly attribution: PlaceAttribution = {
    text: "© OpenStreetMap",
    url: "https://osm.org/copyright"
  }

  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly reverseUrl: string
  /** Same query, same answer — and one fewer request against a service that asks to be spared. */
  private readonly cache = new Map<string, PlaceMatch[]>()

  constructor(options: NominatimPlaceProviderOptions = {}) {
    // fetch.bind(globalThis), not the bare reference — see AwsTerrariumElevationProvider's own
    // comment on the "Illegal invocation" this avoids.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.baseUrl = options.baseUrl ?? "https://nominatim.openstreetmap.org/search"
    this.reverseUrl = options.reverseUrl ?? "https://nominatim.openstreetmap.org/reverse"
  }

  async reverse(lat: number, lng: number, options: PlaceSearchOptions = {}): Promise<PlaceMatch | undefined> {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2" })
    if (options.language) params.set("accept-language", options.language)
    const url = `${this.reverseUrl}?${params}`
    const cached = this.cache.get(url)
    if (cached) return cached[0]

    const response = await this.fetchImpl(url, { signal: options.signal })
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`)
    // Reverse answers with a single object, and with an `error` object for coordinates it knows no
    // place for (open sea) — "there is nothing there" is an answer, not a failure.
    const result = (await response.json()) as NominatimResult & { error?: unknown }
    const match = result.error ? undefined : this.toMatch(result)
    this.cache.set(url, match ? [match] : [])
    return match
  }

  async search(query: string, options: PlaceSearchOptions = {}): Promise<PlaceMatch[]> {
    const trimmed = query.trim()
    if (trimmed === "") return []
    const url = this.requestUrl(trimmed, options)
    const cached = this.cache.get(url)
    if (cached) return cached

    const response = await this.fetchImpl(url, { signal: options.signal })
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`)
    const results = (await response.json()) as NominatimResult[]
    const matches = (Array.isArray(results) ? results : [])
      .map(result => this.toMatch(result))
      .filter((match): match is PlaceMatch => match !== undefined)
    this.cache.set(url, matches)
    return matches
  }

  private requestUrl(query: string, options: PlaceSearchOptions): string {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: String(options.limit ?? DEFAULT_LIMIT)
    })
    // Nominatim reads the language from a query parameter as readily as from the header a browser
    // won't let us set — so a French editor gets "Londres", not "London".
    if (options.language) params.set("accept-language", options.language)
    return `${this.baseUrl}?${params}`
  }

  /** undefined for a result missing a name or usable coordinates — dropped rather than offered as
   * a candidate that would put the witness somewhere they never were. */
  private toMatch(result: NominatimResult): PlaceMatch | undefined {
    const name = result.display_name ?? result.name
    const lat = this.coordinate(result.lat)
    const lng = this.coordinate(result.lon)
    return name && lat !== undefined && lng !== undefined ? { name, lat, lng } : undefined
  }

  /** Guards the empty string specially: `Number("")` is 0, not NaN, so a result with a blank
   * latitude would otherwise pass every plausibility check and drop the witness into the Gulf of
   * Guinea. */
  private coordinate(raw: string | undefined): number | undefined {
    if (raw === undefined || raw.trim() === "") return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }
}
