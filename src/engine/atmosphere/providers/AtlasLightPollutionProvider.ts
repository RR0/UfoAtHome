import type { LightPollutionLookup, LightPollutionProvider } from "../LightPollutionProvider.js"

/** Where the tiles live when the page itself doesn't carry a copy — same arrangement as the roads
 * (see ArchivedRoadProvider). */
export const UFOATHOME_LIGHT_POLLUTION_INDEX_URL = "https://ufoathome.org/light-pollution/index.json"

/** What scripts/build-light-pollution-tiles.ts writes beside the tiles. */
interface AtlasIndex {
  version: number
  tileDeg: number
  cells: number
  north: number
  south: number
  floorMcd: number
  subdivisions: number
  /** One bit per tile, row 0 the northernmost band, base64. */
  present: string
}

export interface AtlasLightPollutionProviderOptions {
  fetchImpl?: typeof fetch
  /** Where the index is looked for, in order; the tiles are beside whichever answered. Mainly for tests. */
  indexUrls?: string[]
}

/**
 * The World Atlas of the artificial night sky brightness (Falchi et al. 2016), read from the tiles
 * `npm run build:light-pollution` cuts it into (see that script for the encoding).
 *
 * One point costs one tile of a few kilobytes, fetched once per session and kept: the editor asks
 * again every time the place moves, and a walk of a few hundred metres stays in the same one.
 */
export class AtlasLightPollutionProvider implements LightPollutionProvider {
  readonly year = 2015
  readonly citation =
    "World Atlas of the artificial night sky brightness (Falchi et al. 2016, doi:10.1126/sciadv.1600377; data doi:10.5880/GFZ.1.4.2016.001, CC BY-NC 4.0)"

  /** The natural sky the atlas adds its artificial brightness to, mcd/m² — 22.0 mag/arcsec². */
  static readonly NATURAL_MCD = 0.171168

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private index?: Promise<{ index: AtlasIndex; base: string; present: Uint8Array } | undefined>
  private readonly tiles = new Map<string, Promise<Uint8Array | undefined>>()

  constructor(options: AtlasLightPollutionProviderOptions = {}) {
    // fetch.bind(globalThis): an unbound fetch loses the `this` it requires once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? AtlasLightPollutionProvider.defaultIndexUrls()
  }

  /** Beside the page first — the development server, or a site carrying its own copy — then ufoathome.org. */
  static defaultIndexUrls(): string[] {
    const here = typeof location === "undefined" ? undefined : new URL("/light-pollution/index.json", location.href).href
    return [...new Set([here, UFOATHOME_LIGHT_POLLUTION_INDEX_URL].filter((url): url is string => url !== undefined))]
  }

  /** The total zenith sky, mag/arcsec², for an artificial brightness in mcd/m²: the atlas's own
   * conversion (lightpollutionmap.info FAQ 31), whose natural 0.171168 mcd/m² is 22.0. */
  static magPerArcsec2Of(artificialMcdPerM2: number): number {
    return -2.5 * Math.log10((artificialMcdPerM2 + AtlasLightPollutionProvider.NATURAL_MCD) / 108000000)
  }

  /** The artificial brightness a tile's byte stands for — the inverse of the build script's code(). */
  static mcdOf(code: number, index: Pick<AtlasIndex, "floorMcd" | "subdivisions">): number {
    return code === 0 ? 0 : index.floorMcd * 10 ** ((code - 1) / index.subdivisions)
  }

  async lookUp(lat: number, lng: number): Promise<LightPollutionLookup> {
    const loaded = await this.loadIndex()
    if (!loaded) return { status: "failed" }
    const { index, base, present } = loaded
    if (!(lat < index.north && lat >= index.south)) return { status: "outside" }
    const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180
    const band = Math.floor((index.north - lat) / index.tileDeg)
    const column = Math.floor((wrapped + 180) / index.tileDeg)
    const bit = band * (360 / index.tileDeg) + column
    if (!(present[bit >> 3] & (1 << (bit & 7)))) return { status: "natural" }
    const north = index.north - band * index.tileDeg
    const west = -180 + column * index.tileDeg
    const name = AtlasLightPollutionProvider.nameOf(north - index.tileDeg, west)
    const tile = await this.tile(`${base}${name}.bin`)
    if (!tile) return { status: "failed" }
    const cellDeg = index.tileDeg / index.cells
    const row = Math.min(index.cells - 1, Math.floor((north - lat) / cellDeg))
    const cell = Math.min(index.cells - 1, Math.floor((wrapped - west) / cellDeg))
    const artificialMcdPerM2 = AtlasLightPollutionProvider.mcdOf(tile[row * index.cells + cell], index)
    if (artificialMcdPerM2 === 0) return { status: "natural" }
    return {
      status: "found",
      lightPollution: Math.round(AtlasLightPollutionProvider.magPerArcsec2Of(artificialMcdPerM2) * 100) / 100,
      artificialMcdPerM2,
      lat: north - (row + 0.5) * cellDeg,
      lng: west + (cell + 0.5) * cellDeg
    }
  }

  /** "N32W118": a tile's south-west corner, the build script's naming. */
  static nameOf(southDeg: number, westDeg: number): string {
    const lat = `${southDeg < 0 ? "S" : "N"}${String(Math.abs(southDeg)).padStart(2, "0")}`
    const lng = `${westDeg < 0 ? "W" : "E"}${String(Math.abs(westDeg)).padStart(3, "0")}`
    return lat + lng
  }

  private loadIndex(): Promise<{ index: AtlasIndex; base: string; present: Uint8Array } | undefined> {
    this.index ??= (async () => {
      for (const url of this.indexUrls) {
        try {
          const response = await this.fetchImpl(url)
          if (!response.ok) continue
          const index = (await response.json()) as AtlasIndex
          const present = Uint8Array.from(atob(index.present), character => character.charCodeAt(0))
          return { index, base: new URL(".", url).href, present }
        } catch {
          // The next place it might be.
        }
      }
      return undefined
    })()
    // A failure is not kept: the next question may find the network back.
    void this.index.then(loaded => {
      if (!loaded) this.index = undefined
    })
    return this.index
  }

  private tile(url: string): Promise<Uint8Array | undefined> {
    let tile = this.tiles.get(url)
    if (!tile) {
      tile = (async () => {
        try {
          const response = await this.fetchImpl(url)
          if (!response.ok || !response.body) return undefined
          const inflated = response.body.pipeThrough(new DecompressionStream("deflate-raw"))
          return new Uint8Array(await new Response(inflated).arrayBuffer())
        } catch {
          return undefined
        }
      })()
      this.tiles.set(url, tile)
      void tile.then(bytes => {
        if (!bytes) this.tiles.delete(url)
      })
    }
    return tile
  }
}
