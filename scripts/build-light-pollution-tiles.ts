/**
 * Cuts the World Atlas of the artificial night sky brightness (Falchi et al. 2016) into the small
 * tiles the editor looks a place's night sky up in — see AtlasLightPollutionProvider.
 *
 * The atlas is one 3 GB GeoTIFF of 32-bit floats, the artificial zenith brightness in mcd/m² every
 * 30 arcseconds from 60°S to 85°N. Nobody's browser can be asked to open that for one point, and
 * the service that answers points for it wants a key; so the recipe this project applies to every
 * dataset it did not produce (the roads, the orbital elements): take a copy, keep the credit with
 * it, and serve it from ufoathome.org.
 *
 * WHAT IS KEPT. Each cell as one byte, the artificial brightness on a logarithmic scale: code 0 for
 * anything under a hundredth of the natural sky (it moves the zenith by a hundredth of a magnitude,
 * which nothing downstream can show), and above that SUBDIVISIONS codes per factor of ten. At 60 a
 * decade, one code is 0.04 magnitudes of artificial light, and at most half that in the total sky
 * the recording states — finer than the atlas itself claims to be.
 *
 * One file per square of TILE_DEG degrees, raw-deflated, north row first; a square with no cell
 * above code 0 is not written, and the index says which squares exist, so that "the atlas has
 * nothing here" (a natural sky) and "the tile could not be fetched" stay different answers.
 *
 * Run with: node --import tsx scripts/build-light-pollution-tiles.ts <World_Atlas_2015.tif> [--step N] [--dry-run]
 * The GeoTIFF comes from https://doi.org/10.5880/GFZ.1.4.2016.001 (World_Atlas_2015.zip).
 */
import { fromFile, type GeoTIFFImage } from "geotiff"
import { deflateRawSync } from "node:zlib"
import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

class LightPollutionTiler {
  /** Degrees on a side of one tile. */
  static readonly TILE_DEG = 2
  /** The atlas's own cell, in degrees: 30 arcseconds. */
  static readonly CELL_DEG = 1 / 120
  /** The smallest artificial brightness kept, mcd/m²: a hundredth of the natural sky's 0.171 — see
   * the file's doc comment. */
  static readonly FLOOR_MCD = 0.00171168
  /** Codes per factor of ten above the floor. */
  static readonly SUBDIVISIONS = 60
  static readonly NORTH = 85
  static readonly SOUTH = -60

  constructor(private readonly image: GeoTIFFImage, private readonly step: number) {
  }

  /** The byte a brightness is kept as. */
  static code(mcd: number): number {
    if (!(mcd >= LightPollutionTiler.FLOOR_MCD)) return 0
    const code = 1 + Math.round(LightPollutionTiler.SUBDIVISIONS * Math.log10(mcd / LightPollutionTiler.FLOOR_MCD))
    return Math.min(code, 255)
  }

  /** The atlas's columns and rows for a degree of longitude and latitude (the cell's north-west
   * corner), from its own geotransform. */
  private pixelOf(lng: number, lat: number): { x: number; y: number } {
    const [originX, originY] = this.image.getOrigin()
    const [resX, resY] = this.image.getResolution()
    return { x: Math.round((lng - originX) / resX), y: Math.round((lat - originY) / resY) }
  }

  /**
   * One band of tiles, TILE_DEG high, read as one window across the whole world: the GeoTIFF is
   * tiled 128 × 128, and reading it square by square would decode every one of those several times.
   * Cells are averaged over `step` × `step` as LIGHT, never as codes.
   */
  async band(northDeg: number): Promise<Map<number, Uint8Array>> {
    const cells = Math.round(LightPollutionTiler.TILE_DEG / LightPollutionTiler.CELL_DEG)
    const top = this.pixelOf(-180, northDeg).y
    const rows = Math.min(cells, this.image.getHeight() - top)
    const width = this.image.getWidth()
    const [raster] = (await this.image.readRasters({ window: [0, top, width, top + rows] })) as unknown as Float32Array[]
    const side = cells / this.step
    const tiles = new Map<number, Uint8Array>()
    for (let tileX = 0; tileX < 360 / LightPollutionTiler.TILE_DEG; tileX++) {
      const tile = new Uint8Array(side * side)
      let any = false
      for (let row = 0; row < side; row++) {
        for (let column = 0; column < side; column++) {
          let sum = 0
          let count = 0
          for (let dy = 0; dy < this.step; dy++) {
            const y = row * this.step + dy
            if (y >= rows) continue
            for (let dx = 0; dx < this.step; dx++) {
              const x = tileX * cells + column * this.step + dx
              if (x >= width) continue
              const value = raster[y * width + x]
              // The no-data value is the most negative float; oceans are 0.
              if (value > 0) sum += value
              count++
            }
          }
          const code = count > 0 ? LightPollutionTiler.code(sum / count) : 0
          tile[row * side + column] = code
          if (code > 0) any = true
        }
      }
      if (any) tiles.set(tileX, tile)
    }
    return tiles
  }

  /** "N32W118": the tile's south-west corner, the SRTM way. */
  static nameOf(southDeg: number, westDeg: number): string {
    const lat = `${southDeg < 0 ? "S" : "N"}${String(Math.abs(southDeg)).padStart(2, "0")}`
    const lng = `${westDeg < 0 ? "W" : "E"}${String(Math.abs(westDeg)).padStart(3, "0")}`
    return lat + lng
  }

  async run(out: string, dryRun: boolean): Promise<void> {
    const columns = 360 / LightPollutionTiler.TILE_DEG
    const rows = (LightPollutionTiler.NORTH - LightPollutionTiler.SOUTH) / LightPollutionTiler.TILE_DEG
    // Which tiles exist, one bit each, row 0 the northernmost band — see the index below.
    const present = new Uint8Array(Math.ceil((columns * Math.ceil(rows)) / 8))
    let written = 0
    let bytes = 0
    if (!dryRun) {
      // The tiles and the index only: the README beside them (source, licence) is written by hand.
      await mkdir(out, { recursive: true })
      for (const name of await readdir(out)) {
        if (name.endsWith(".bin") || name === "index.json") await rm(path.join(out, name))
      }
    }
    for (let bandIndex = 0; bandIndex < Math.ceil(rows); bandIndex++) {
      const north = LightPollutionTiler.NORTH - bandIndex * LightPollutionTiler.TILE_DEG
      const south = north - LightPollutionTiler.TILE_DEG
      const tiles = await this.band(north)
      for (const [tileX, tile] of tiles) {
        const west = -180 + tileX * LightPollutionTiler.TILE_DEG
        const compressed = deflateRawSync(tile, { level: 9 })
        const bit = bandIndex * columns + tileX
        present[bit >> 3] |= 1 << (bit & 7)
        written++
        bytes += compressed.length
        if (!dryRun) await writeFile(path.join(out, `${LightPollutionTiler.nameOf(south, west)}.bin`), compressed)
      }
      process.stdout.write(`\r${north}°: ${written} tiles, ${(bytes / 1e6).toFixed(1)} MB`)
    }
    process.stdout.write("\n")
    const index = {
      version: 1,
      source: "Falchi, F., Cinzano, P., Duriscoe, D., Kyba, C. C. M., Elvidge, C. D., Baugh, K., Portnov, B., Rybnikova, N. A., Furgoni, R. (2016): Supplement to: The New World Atlas of Artificial Night Sky Brightness. GFZ Data Services. https://doi.org/10.5880/GFZ.1.4.2016.001",
      paper: "Falchi et al. (2016), The new world atlas of artificial night sky brightness, Science Advances 2(6), e1600377. https://doi.org/10.1126/sciadv.1600377",
      licence: "CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/",
      quantity: "artificial zenith sky brightness, mcd/m², V band, 2015",
      tileDeg: LightPollutionTiler.TILE_DEG,
      cells: Math.round(LightPollutionTiler.TILE_DEG / LightPollutionTiler.CELL_DEG) / this.step,
      north: LightPollutionTiler.NORTH,
      south: LightPollutionTiler.SOUTH,
      floorMcd: LightPollutionTiler.FLOOR_MCD,
      subdivisions: LightPollutionTiler.SUBDIVISIONS,
      present: Buffer.from(present).toString("base64")
    }
    if (!dryRun) await writeFile(path.join(out, "index.json"), JSON.stringify(index, null, 1) + "\n", "utf8")
    console.log(`${written} tiles, ${(bytes / 1e6).toFixed(1)} MB${dryRun ? " (dry run, nothing written)" : ` in ${out}`}`)
  }
}

const args = process.argv.slice(2)
const source = args.find(arg => !arg.startsWith("--"))
if (!source) throw new Error("Usage: build-light-pollution-tiles.ts <World_Atlas_2015.tif> [--step N] [--dry-run]")
const stepAt = args.indexOf("--step")
const step = stepAt >= 0 ? Number(args[stepAt + 1]) : 1
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const image = await (await fromFile(source)).getImage()
await new LightPollutionTiler(image, step).run(path.join(root, "public", "light-pollution"), args.includes("--dry-run"))
