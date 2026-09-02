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
/**
 * Where naming stops, and it is the data that says where.
 *
 * Of the 25 791 stars this catalog carries, only 377 have a proper name at all. Counted per
 * magnitude: at 3.0, 178 of 179 stars can be named or designated; at 4.0, 499 of 523; at 6.0 only
 * 2 726 of 5 070, the rest having nothing to be called but a catalog number, which answers nothing
 * for a witness asking what that bright thing was.
 *
 * Cut at 3.0 rather than 4.0 — the brightest 179, which is what "a big star" means to someone
 * reporting one. The 344 between the two are visible but unremarkable, and carrying them cost
 * 7 kB gzipped for names nobody was hovering.
 */
const NAMED_MAGNITUDE_LIMIT = 3.0
const HYG_SUN_ID = "0" // HYG's own row 0 is the Sun itself — rendered separately, not a "star".

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(scriptDir, "data", "hygdata_v41.csv")
const outDir = path.join(scriptDir, "..", "src", "assets")
const binPath = path.join(outDir, "stars-mag7.5.bin")
const namedPath = path.join(scriptDir, "..", "src", "engine", "astronomy", "brightStarCatalog.ts")
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


/** HYG writes a Bayer letter as a three-letter abbreviation ("Alp", "The"). */
const GREEK_LETTERS: Record<string, string> = {
  Alp: "\u03b1", Bet: "\u03b2", Gam: "\u03b3", Del: "\u03b4", Eps: "\u03b5", Zet: "\u03b6",
  Eta: "\u03b7", The: "\u03b8", Iot: "\u03b9", Kap: "\u03ba", Lam: "\u03bb", Mu: "\u03bc",
  Nu: "\u03bd", Xi: "\u03be", Omi: "\u03bf", Pi: "\u03c0", Rho: "\u03c1", Sig: "\u03c3",
  Tau: "\u03c4", Ups: "\u03c5", Phi: "\u03c6", Chi: "\u03c7", Psi: "\u03c8", Ome: "\u03c9"
}

/**
 * The IAU genitive of every constellation a mag <= 4 star without a proper name falls in — what
 * turns HYG's "Alp"+"Ori" into the form a star chart prints, "α Orionis". Latin, so it is the same
 * in every language this project speaks and needs no translation.
 *
 * Sixty-four entries rather than all eighty-eight: the build fails loudly (see brightStarName)
 * rather than emitting a half-designation if a constellation ever turns up that isn't here.
 */
const CONSTELLATION_GENITIVES: Record<string, string> = {
  And: "Andromedae", Aps: "Apodis", Aql: "Aquilae", Aqr: "Aquarii", Ara: "Arae", Aur: "Aurigae",
  Boo: "Bo\u00f6tis", CMa: "Canis Majoris", Cap: "Capricorni", Car: "Carinae", Cas: "Cassiopeiae",
  Cen: "Centauri", Cep: "Cephei", Cet: "Ceti", Cir: "Circini", Col: "Columbae",
  CrB: "Coronae Borealis", Crt: "Crateris", Crv: "Corvi", Cyg: "Cygni", Dor: "Doradus",
  Dra: "Draconis", Eri: "Eridani", Gem: "Geminorum", Gru: "Gruis", Her: "Herculis",
  Hor: "Horologii", Hya: "Hydrae", Hyi: "Hydri", Ind: "Indi", Lac: "Lacertae", Leo: "Leonis",
  Lep: "Leporis", Lib: "Librae", Lup: "Lupi", Lyn: "Lyncis", Mon: "Monocerotis", Mus: "Muscae",
  Oct: "Octantis", Oph: "Ophiuchi", Ori: "Orionis", Pav: "Pavonis", Peg: "Pegasi", Per: "Persei",
  Phe: "Phoenicis", Pic: "Pictoris", Psc: "Piscium", Pup: "Puppis", Pyx: "Pyxidis", Ret: "Reticuli",
  Sco: "Scorpii", Sct: "Scuti", Ser: "Serpentis", Sge: "Sagittae", Sgr: "Sagittarii", Tau: "Tauri",
  Tel: "Telescopii", TrA: "Trianguli Australis", Tri: "Trianguli", Tuc: "Tucanae",
  UMa: "Ursae Majoris", Vel: "Velorum", Vir: "Virginis", Vol: "Volantis"
}

/**
 * The proper names French writes differently, and only those.
 *
 * Short on purpose: most of these names are Arabic-derived and are written identically in both
 * languages (Sirius, Rigel, Procyon, Aldebaran's neighbours…), so only the accented forms differ.
 * Everything absent from this table keeps its international form, which is the form French
 * astronomy uses too — an invented translation would be worse than none.
 */
const FRENCH_STAR_NAMES: Record<string, string> = {
  Betelgeuse: "B\u00e9telgeuse",
  Vega: "V\u00e9ga",
  Altair: "Alta\u00efr",
  Aldebaran: "Ald\u00e9baran",
  Regulus: "R\u00e9gulus",
  Antares: "Antar\u00e8s"
}

const SUPERSCRIPTS = ["\u2070", "\u00b9", "\u00b2", "\u00b3", "\u2074", "\u2075", "\u2076", "\u2077", "\u2078", "\u2079"]

/**
 * What to call a star: its proper name if it has one, else the Bayer or Flamsteed designation a
 * chart would print, else nothing at all — 24 of the 523 stars this side of magnitude 4 have
 * neither, and a catalog row number identifies nothing for the reader this is for.
 */
function brightStarName(proper: string, bayer: string, flamsteed: string, constellation: string): string | undefined {
  if (proper) return proper
  const genitive = CONSTELLATION_GENITIVES[constellation]
  if (!genitive) {
    if (constellation && (bayer || flamsteed)) {
      throw new Error(`No IAU genitive for constellation "${constellation}" — add it to CONSTELLATION_GENITIVES`)
    }
    return undefined
  }
  if (bayer) {
    // "Del-1" is delta-one, two stars sharing a letter — written with a superscript on a chart.
    const [letter, index] = bayer.split("-")
    const greek = GREEK_LETTERS[letter]
    if (!greek) throw new Error(`Unknown Bayer letter "${letter}" — add it to GREEK_LETTERS`)
    return `${greek}${index ? SUPERSCRIPTS[Number(index)] ?? index : ""} ${genitive}`
  }
  if (flamsteed) return `${flamsteed} ${genitive}`
  return undefined
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
  const properIndex = header.indexOf("proper")
  const bayerIndex = header.indexOf("bayer")
  const flamIndex = header.indexOf("flam")
  const conIndex = header.indexOf("con")
  if ([idIndex, raIndex, decIndex, magIndex, ciIndex, properIndex, bayerIndex, flamIndex, conIndex].includes(-1)) {
    throw new Error("hygdata_v41.csv is missing an expected column (id/ra/dec/mag/ci/proper/bayer/flam/con)")
  }

  const ra: number[] = []
  const dec: number[] = []
  const mag: number[] = []
  const ci: number[] = []
  const named: { name: string; french: string; raHours: number; decDeg: number; mag: number }[] = []

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

    // The named table carries its own positions rather than an index into the binary above: an
    // index would have to be regenerated in lockstep with every change of MAGNITUDE_LIMIT, and
    // the hover test reads this table alone anyway (525 entries against 25 791 — see
    // SceneRenderer.pickStarAt, which cannot raycast a Points cloud).
    if (magValue <= NAMED_MAGNITUDE_LIMIT) {
      const name = brightStarName(
        fields[properIndex].trim(), fields[bayerIndex].trim(), fields[flamIndex].trim(), fields[conIndex].trim()
      )
      if (name !== undefined) {
        named.push({ name, french: FRENCH_STAR_NAMES[name] ?? name, raHours: raValue, decDeg: decValue, mag: magValue })
      }
    }
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

  named.sort((a, b) => a.mag - b.mag)
  const namedSource = `/**
 * The stars bright enough to be mistaken for something, with what to call them.
 *
 * GENERATED by scripts/build-star-catalog.ts from the same HYG rows as the binary catalog beside
 * it — edit that script, not this file. Cut at magnitude ${NAMED_MAGNITUDE_LIMIT}: the brightest stars are what "a big
 * star" means to whoever is reporting one, and naming stops paying quickly below them — 178 of the
 * 179 this side of the cut can be named, against 2 726 of 5 070 at magnitude 6.
 *
 * Positions are J2000 right ascension in hours and declination in degrees, the same frame and
 * units as the binary catalog, so equatorialToHorizontal treats them identically — rounded to four
 * decimals, which is a third of an arcsecond, against a hover threshold of nearly two degrees and
 * a binary catalog that only carries Float32 anyway.
 *
 * HYG Database v4.1, CC BY-SA (https://github.com/astronexus/HYG-Database).
 */
export interface BrightStar {
  /** Its proper name where it has one, else the designation a star chart prints ("\u03b1 Orionis"). */
  name: { en: string; fr: string }
  raHours: number
  decDeg: number
  mag: number
}

export const BRIGHT_STARS: BrightStar[] = [
${named.map(star => `  { name: { en: ${JSON.stringify(star.name)}, fr: ${JSON.stringify(star.french)} }, raHours: ${star.raHours.toFixed(4)}, decDeg: ${star.decDeg.toFixed(4)}, mag: ${star.mag} }`).join(",\n")}
]
`
  writeFileSync(namedPath, namedSource)

  console.log(`Wrote ${count} stars (mag <= ${MAGNITUDE_LIMIT}) to ${binPath} (${buffer.byteLength} bytes)`)
  console.log(`Wrote ${named.length} named stars (mag <= ${NAMED_MAGNITUDE_LIMIT}) to ${namedPath}`)
}

main()
