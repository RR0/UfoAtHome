/**
 * One-off build step (not part of `build`/`prepublishOnly`) that converts a locally-downloaded
 * HYG Database v4.1 CSV (https://github.com/astronexus/HYG-Database, CC BY-SA) into the compact
 * binary star catalog asset `<rr0-scene>` fetches at runtime. Filtered to magnitude <= 7.5
 * (naked-eye visibility — these are human eyewitness reports, not instrument-assisted
 * observations, so catalog entries no witness could ever have seen aren't worth carrying).
 *
 * Run with: npm run build:stars
 * Expects the raw CSV at scripts/data/hygdata_v41.csv (gitignored — download it yourself from
 * the HYG-Database repo's hyg/CURRENT/hygdata_v41.csv, or see README.md's stars section).
 *
 * Binary layout (must stay in sync with StarCatalog.ts's loadStarCatalog, nothing else enforces
 * this): four Float32Array sections concatenated back-to-back, each `count` elements long, in
 * this order: ra (hours), dec (degrees), mag (apparent magnitude), ci (B-V color index).
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const MAGNITUDE_LIMIT = 7.5
const HYG_SUN_ID = "0" // HYG's own row 0 is the Sun itself — rendered separately, not a "star".

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(scriptDir, "data", "hygdata_v41.csv")
const outDir = path.join(scriptDir, "..", "src", "assets")
const binPath = path.join(outDir, "stars-mag7.5.bin")
const jsonPath = path.join(outDir, "stars-mag7.5.json")

/** Parses one CSV line into fields, honoring double-quoted fields (with "" as an escaped quote) —
 * a plain split(",") would break on any quoted field containing a comma. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      fields.push(field)
      field = ""
    } else {
      field += c
    }
  }
  fields.push(field)
  return fields
}

function main(): void {
  const csv = readFileSync(csvPath, "utf-8")
  const lines = csv.split("\n").filter(line => line.length > 0)
  const header = parseCsvLine(lines[0])
  const idIndex = header.indexOf("id")
  const raIndex = header.indexOf("ra")
  const decIndex = header.indexOf("dec")
  const magIndex = header.indexOf("mag")
  const ciIndex = header.indexOf("ci")
  if ([idIndex, raIndex, decIndex, magIndex, ciIndex].includes(-1)) {
    throw new Error("hygdata_v41.csv is missing an expected column (id/ra/dec/mag/ci)")
  }

  const ra: number[] = []
  const dec: number[] = []
  const mag: number[] = []
  const ci: number[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    if (fields[idIndex] === HYG_SUN_ID) continue

    const magValue = Number.parseFloat(fields[magIndex])
    if (!Number.isFinite(magValue) || magValue > MAGNITUDE_LIMIT) continue

    const raValue = Number.parseFloat(fields[raIndex])
    const decValue = Number.parseFloat(fields[decIndex])
    if (!Number.isFinite(raValue) || !Number.isFinite(decValue)) continue

    const ciValue = Number.parseFloat(fields[ciIndex])

    ra.push(raValue)
    dec.push(decValue)
    mag.push(magValue)
    ci.push(Number.isFinite(ciValue) ? ciValue : 0)
  }

  const count = ra.length
  const buffer = Buffer.concat([
    Buffer.from(new Float32Array(ra).buffer),
    Buffer.from(new Float32Array(dec).buffer),
    Buffer.from(new Float32Array(mag).buffer),
    Buffer.from(new Float32Array(ci).buffer)
  ])

  writeFileSync(binPath, buffer)
  writeFileSync(
    jsonPath,
    JSON.stringify({ count, sourceVersion: "hygdata_v41", magnitudeLimit: MAGNITUDE_LIMIT, generatedAt: new Date().toISOString() }, null, 2)
  )

  console.log(`Wrote ${count} stars (mag <= ${MAGNITUDE_LIMIT}) to ${binPath} (${buffer.byteLength} bytes)`)
}

main()
