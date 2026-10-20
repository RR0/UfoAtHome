import type { GeoBounds } from "../GeoBounds.js"
import type { ImageryProvider, ImageryTexture } from "../ImageryProvider.js"
import { dataSourceById } from "../../../engine/source/DataSource.js"
import { IMAGERY_SOURCES } from "../terrainSources.js"
import type { FrozenPatch } from "./FrozenPatches.js"

/** One tile as its source served it. */
interface FrozenTile {
  bytes: Uint8Array
  type: string
}

/** The imagery annex once read: what `<recording>.imagery.zip` holds. */
export interface ImageryAnnexData {
  takenOn: string
  /** Which of IMAGERY_SOURCES served the tiles: the one that is asked to stitch them again, with the same addresses. */
  source: string
  attribution: string
  patches: FrozenPatch[]
  /** The observer map's annex (see FrozenMapImagery): the ground its photograph was asked for, and at how many pixels. No patch then. */
  map?: FrozenMapGround
  /** By the address they were asked at. */
  tiles: Map<string, FrozenTile>
}

/** What the observer map asked its photograph for. */
export interface FrozenMapGround {
  bounds: GeoBounds
  pixels: number
}

interface ImageryIndexFile {
  version: 1
  takenOn: string
  source: string
  attribution: string
  patches: FrozenPatch[]
  map?: FrozenMapGround
  tiles: Record<string, { file: string, type: string }>
}

/**
 * Every tile an imagery source is asked for, kept as it was served — what the imagery annex is made of.
 *
 * The tiles themselves rather than the picture stitched from them: the patches of a drive overlap by most of their ground, and the tiles they
 * share are kept once; and a tile is the source's own file, written again as it came, where a picture would be drawn and compressed again.
 */
export class TileRecorder {
  readonly tiles = new Map<string, FrozenTile>()

  constructor(private readonly fetchImpl: typeof fetch = fetch.bind(globalThis)) {
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const response = await this.fetchImpl(input, init)
    if (response.ok) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const bytes = new Uint8Array(await response.clone().arrayBuffer())
      this.tiles.set(url, { bytes, type: response.headers.get("content-type") ?? "image/jpeg" })
    }
    return response
  }
}

/** The imagery annex: a zip of an `index.json` naming each tile by the address it was asked at, and the tiles. */
export class ImageryAnnex {
  static async encode(annex: ImageryAnnexData): Promise<Uint8Array> {
    const { zipSync, strToU8 } = await import("fflate")
    const files: Record<string, Uint8Array> = {}
    const tiles: ImageryIndexFile["tiles"] = {}
    let n = 0
    for (const [url, tile] of annex.tiles) {
      const file = `tiles/${n++}`
      files[file] = tile.bytes
      tiles[url] = { file, type: tile.type }
    }
    const index: ImageryIndexFile = { version: 1, takenOn: annex.takenOn, source: annex.source, attribution: annex.attribution, patches: annex.patches, map: annex.map, tiles }
    files["index.json"] = strToU8(JSON.stringify(index, null, 1))
    // A photograph is compressed already: stored, not deflated again for nothing.
    return zipSync(files, { level: 0 })
  }

  static decode(files: Record<string, Uint8Array>): ImageryAnnexData {
    const indexBytes = files["index.json"]
    if (!indexBytes) throw new Error("An imagery annex without its index")
    const index = JSON.parse(new TextDecoder().decode(indexBytes)) as ImageryIndexFile
    const tiles = new Map<string, FrozenTile>()
    for (const [url, { file, type }] of Object.entries(index.tiles)) {
      const bytes = files[file]
      if (bytes) tiles.set(url, { bytes, type })
    }
    return { takenOn: index.takenOn, source: index.source, attribution: index.attribution, patches: index.patches, map: index.map, tiles }
  }
}

/**
 * The photograph of the ground as it was frozen: the source that served it, stitching the tiles it served from the annex instead of asking for
 * them. A tile the annex does not hold is not asked for either: it answers as a tile that does not exist does (404), and the patch is then the
 * flat ground a refused photograph always gave.
 */
export class FrozenImageryProvider implements ImageryProvider {
  private provider?: Promise<ImageryProvider>
  private attributionRead?: string

  constructor(private readonly annex: Promise<ImageryAnnexData>, private readonly attributionStated = "") {
  }

  get attribution(): string {
    return this.attributionRead ?? this.attributionStated
  }

  async getImageryTexture(bounds: GeoBounds, resolution: { width: number; height: number }): Promise<ImageryTexture> {
    const provider = await (this.provider ??= this.annex.then(annex => {
      this.attributionRead = annex.attribution
      return dataSourceById(IMAGERY_SOURCES, annex.source).create(FrozenImageryProvider.fetchFrom(annex.tiles))
    }))
    return provider.getImageryTexture(bounds, resolution)
  }

  /** A fetch answered from the tiles alone. */
  static fetchFrom(tiles: ReadonlyMap<string, FrozenTile>): typeof fetch {
    return async input => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const tile = tiles.get(url)
      if (!tile) return new Response(null, { status: 404 })
      return new Response(tile.bytes as BlobPart, { status: 200, headers: { "content-type": tile.type } })
    }
  }
}

/**
 * The observer map's photograph as it was frozen (see FrozenData's `map`): the ground it was taken of, stitched again from the tiles its source
 * served, by that source, and asked of nobody.
 *
 * The map asks for nothing else while it reads this. Its ground is the box the annex was taken of, whatever the reader then does with the map:
 * a zoom into it shows the same photograph larger, and the ground beyond it, zoomed out, is left blank. Asking live for a sharper or a wider one
 * would be the request to a third party that freezing exists to spare.
 */
export class FrozenMapImagery {
  private picture?: Promise<ImageryTexture>
  private attributionRead?: string

  constructor(private readonly annex: Promise<ImageryAnnexData>, private readonly attributionStated = "") {
  }

  get attribution(): string {
    return this.attributionRead ?? this.attributionStated
  }

  /** The photograph, stitched once. Fails when the annex cannot be read or holds no map. */
  getImagery(): Promise<ImageryTexture> {
    return this.picture ??= this.annex.then(annex => {
      if (!annex.map) throw new Error("An imagery annex that holds no map")
      this.attributionRead = annex.attribution
      const provider = dataSourceById(IMAGERY_SOURCES, annex.source).create(FrozenImageryProvider.fetchFrom(annex.tiles))
      return provider.getImageryTexture(annex.map.bounds, { width: annex.map.pixels, height: annex.map.pixels })
    })
  }
}
