import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { LunarRelief } from "../src/engine/astronomy/LunarLimb.js"

/**
 * Makes the Moon's limb relief the scene ships (src/assets/lunar-relief.bin.gz) from NASA's LOLA
 * shape map LDEM_16 (scripts/data/lola, see ARCHIVED.md): 16 samples a degree, signed 16-bit heights in
 * half-metres above a sphere of 1737.4 km. Keeps only the band the limb can ever fall in (see
 * LunarRelief.BAND_FROM_DEG), in units of 100 m as signed bytes, gzipped: about 2 MB where the whole map is 33.
 *
 *   node --import tsx scripts/build-lunar-limb.ts
 */
const SOURCE = "scripts/data/lola/LDEM_16.IMG"
const TARGET = "src/assets/lunar-relief.bin.gz"

const raw = readFileSync(SOURCE)
if (raw.length !== LunarRelief.WIDTH * LunarRelief.HEIGHT * 2) throw new Error(`${SOURCE} is ${raw.length} bytes, not a 16 ppd map`)
const grid = new Int8Array(LunarRelief.WIDTH * LunarRelief.HEIGHT)
const ppd = LunarRelief.SAMPLES_PER_DEGREE
let kept = 0
let clipped = 0
for (let row = 0; row < LunarRelief.HEIGHT; row++) {
  const lat = 90 - (row + 0.5) / ppd
  for (let column = 0; column < LunarRelief.WIDTH; column++) {
    let lon = (column + 0.5) / ppd
    if (lon > 180) lon -= 360
    if (!LunarRelief.inBand(lat, lon)) continue
    // Half-metres (the label's SCALING_FACTOR) to hundreds of metres.
    const units = Math.round((raw.readInt16LE((row * LunarRelief.WIDTH + column) * 2) * 0.5) / 1000 / LunarRelief.UNIT_KM)
    if (units > 127 || units < -128) clipped++
    grid[row * LunarRelief.WIDTH + column] = Math.max(-128, Math.min(127, units))
    kept++
  }
}
mkdirSync("src/assets", { recursive: true })
const packed = gzipSync(Buffer.from(grid.buffer), { level: 9 })
writeFileSync(TARGET, packed)
console.log(`${kept} samples kept of ${grid.length} (${((100 * kept) / grid.length).toFixed(1)} %), ${clipped} clipped, ${(packed.length / 1e6).toFixed(2)} MB`)
