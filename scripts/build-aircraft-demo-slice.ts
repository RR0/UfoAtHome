import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { gunzipSync } from "node:zlib"
import { join } from "node:path"
import { AdsbLolArchiveProvider } from "../src/engine/traffic/providers/AdsbLolArchiveProvider.js"
import { AircraftTile } from "../src/engine/traffic/providers/AircraftTile.js"
import { AircraftSlice } from "./AircraftSlice.js"

/**
 * Cuts the aircraft archive down to what a demonstration needs: some UTC hours of one day, the tiles within 150 km of a place, and the
 * descriptions of the aircraft those hours hold. The page finds it beside itself (see AdsbLolArchiveProvider.defaultIndexUrls), so a
 * demo works without the archive being hosted. Several hours are cut together (`15,16`): the hour before a recording holds the
 * aircraft whose trails are still in its sky (see SceneElement.TRAIL_LOOKBACK_MS).
 *
 *   node --import tsx scripts/build-aircraft-demo-slice.ts <archive dir> <out dir> <YYYY-MM-DD> <hour[,hour...]> <lat> <lng>
 */
const [archive, out, day, hourText, latText, lngText] = process.argv.slice(2)
if (!archive || !out || !day || !hourText || !latText || !lngText) {
  console.error("usage: build-aircraft-demo-slice.ts <archive dir> <out dir> <YYYY-MM-DD> <hour[,hour...]> <lat> <lng>")
  process.exit(1)
}
const keys = AdsbLolArchiveProvider.tilesAround({ lat: Number(latText), lng: Number(lngText), heightM: 0 }, AdsbLolArchiveProvider.DEFAULT_RADIUS_KM)
const index = JSON.parse(await readFile(join(archive, "index.json"), "utf8")) as Record<string, unknown>
await mkdir(join(out, day), { recursive: true })
await writeFile(join(out, "index.json"), JSON.stringify({ ...index, from: day, to: day, days: [day] }, null, 1))
// Only the descriptions of the aircraft the tiles hold: the shards of the whole day are most of the size of a slice.
const present = new Set<string>()
for (const hour of hourText.split(",").map(text => text.trim().padStart(2, "0"))) {
  const offsets = JSON.parse(await readFile(join(archive, day, `${hour}.json`), "utf8")) as Record<string, [number, number]>
  const slice = AircraftSlice.of(await readFile(join(archive, day, `${hour}.pack`)), offsets, keys)
  await writeFile(join(out, day, `${hour}.pack`), slice.bytes)
  await writeFile(join(out, day, `${hour}.json`), JSON.stringify(slice.offsets))
  for (const [offset, length] of Object.values(slice.offsets)) {
    for (const position of AircraftTile.decode(gunzipSync(slice.bytes.subarray(offset, offset + length)))) {
      const hex = position.icao.toString(16).padStart(6, "0")
      present.add(position.nonIcao ? `~${hex}` : hex)
    }
  }
  console.log(`${day} ${hour}h: ${Object.keys(slice.offsets).length} of ${keys.length} tiles, ${(slice.bytes.length / 1e6).toFixed(1)} MB`)
}
await mkdir(join(out, day, "aircraft"), { recursive: true })
let described = 0
for (const file of await readdir(join(archive, day, "aircraft"))) {
  const shard = JSON.parse(await readFile(join(archive, day, "aircraft", file), "utf8")) as Record<string, unknown>
  const kept = Object.fromEntries(Object.entries(shard).filter(([key]) => present.has(key)))
  if (Object.keys(kept).length === 0) continue
  described += Object.keys(kept).length
  await writeFile(join(out, day, "aircraft", file), JSON.stringify(kept))
}
console.log(`${described} aircraft described`)
