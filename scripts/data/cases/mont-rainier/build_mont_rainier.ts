/**
 * Writes Kenneth Arnold's sighting of 24 June 1947 near Mount Rainier (public/demo-data/observer-arnold.json), its case
 * (case-mont-rainier.json), and the reading of it as a chain of American white pelicans (interpretation-mont-rainier-pelicans.json).
 *
 * Sources: Arnold's own report to the AAF (rr0.org time/1/9/4/7/07/12/Arnold_Report_AAF), and the map of the rr0.org dossier
 * (science/crypto/ufo/enquete/dossier/MontRainier/Carte.kml) for his assumed path and for where it puts the first and the last object.
 * Everything else is ASSUMED and says so in its rationale.
 *
 * What the witness said is turned into what a witness file holds, directions and angular sizes (see the angular-only rule): each object's
 * direction at each second is that of the point the dossier's map puts it at, seen from where Arnold was, on a ground that curves away under
 * the line of sight (refraction included, as the scene draws it). His own reading, nine craft of some fifteen metres flying from Rainier to
 * Adams, is the witness's interpretation in the same file.
 *
 * The pelican reading is solved, not drawn: the leader is put on Arnold's line of sight to Rainier's southern edge at 14:59:00, flying level at
 * a pelican's cruising speed, and the distance and heading are those that put it on his line of sight to Adams' southern crest 1 min 42 s
 * later. Where that lands it (a kilometre or so from his aircraft, not twenty miles) is the finding.
 *
 * Run with: node --import tsx scripts/data/cases/mont-rainier/build_mont_rainier.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { inflateSync } from "node:zlib"

const here = path.dirname(fileURLToPath(import.meta.url))
const demoData = path.join(here, "..", "..", "..", "..", "public", "demo-data")
const tileCache = path.join(here, "tiles")

type Text = Record<"en" | "fr", string>
const said = (value: unknown, basis: string, en: string, fr: string) => ({ value, basis, rationale: { en, fr } })

// ---- Ground heights, from the same AWS Terrarium tiles the scene reads (zoom 12, some 25 m a pixel) ----

class Png {
  /** An 8-bit RGB or RGBA PNG, non-interlaced: what a Terrarium tile is. Its pixels as RGB triples. */
  static decode(buffer: Buffer): { width: number, height: number, rgb: Uint8Array } {
    let offset = 8
    let width = 0, height = 0, channels = 3
    const idat: Buffer[] = []
    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset)
      const type = buffer.toString("ascii", offset + 4, offset + 8)
      const data = buffer.subarray(offset + 8, offset + 8 + length)
      if (type === "IHDR") {
        width = data.readUInt32BE(0)
        height = data.readUInt32BE(4)
        if (data[8] !== 8 || data[12] !== 0) throw new Error("Only 8-bit non-interlaced PNGs")
        channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0
        if (!channels) throw new Error(`PNG colour type ${data[9]}`)
      } else if (type === "IDAT") idat.push(data)
      else if (type === "IEND") break
      offset += 12 + length
    }
    const raw = inflateSync(Buffer.concat(idat))
    const stride = width * channels
    const out = new Uint8Array(height * stride)
    for (let y = 0; y < height; y++) {
      const filter = raw[y * (stride + 1)]
      for (let x = 0; x < stride; x++) {
        const value = raw[y * (stride + 1) + 1 + x]
        const left = x >= channels ? out[y * stride + x - channels] : 0
        const up = y > 0 ? out[(y - 1) * stride + x] : 0
        const upLeft = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels] : 0
        let predicted = 0
        switch (filter) {
          case 0: predicted = 0; break
          case 1: predicted = left; break
          case 2: predicted = up; break
          case 3: predicted = (left + up) >> 1; break
          case 4: {
            const p = left + up - upLeft, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft)
            predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
            break
          }
        }
        out[y * stride + x] = (value + predicted) & 255
      }
    }
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0; i < width * height; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = out[i * channels + c]
    return { width, height, rgb }
  }
}

class Terrarium {
  private static readonly ZOOM = 12
  private readonly tiles = new Map<string, { width: number, rgb: Uint8Array }>()

  async load(points: { lat: number, lng: number }[]): Promise<void> {
    mkdirSync(tileCache, { recursive: true })
    for (const { lat, lng } of points) {
      const { x, y } = Terrarium.tileOf(lat, lng)
      const key = `${x}/${y}`
      if (this.tiles.has(key)) continue
      const file = path.join(tileCache, `${Terrarium.ZOOM}-${x}-${y}.png`)
      if (!existsSync(file)) {
        const response = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Terrarium.ZOOM}/${x}/${y}.png`)
        if (!response.ok) throw new Error(`Terrarium tile ${key}: ${response.status}`)
        writeFileSync(file, Buffer.from(await response.arrayBuffer()))
      }
      this.tiles.set(key, Png.decode(readFileSync(file)))
    }
  }

  /** The ground's height above the sea at a point, metres: bilinear between the pixels of its tile. */
  heightAt(lat: number, lng: number): number {
    const { x, y, fx, fy } = Terrarium.tileOf(lat, lng)
    const tile = this.tiles.get(`${x}/${y}`)
    if (!tile) throw new Error(`No tile for ${lat}, ${lng}`)
    const px = Math.min(254, Math.floor(fx * 256)), py = Math.min(254, Math.floor(fy * 256))
    const h = (i: number, j: number) => {
      const k = ((py + j) * tile.width + px + i) * 3
      return tile.rgb[k] * 256 + tile.rgb[k + 1] + tile.rgb[k + 2] / 256 - 32768
    }
    const u = fx * 256 - px, v = fy * 256 - py
    return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v
  }

  private static tileOf(lat: number, lng: number): { x: number, y: number, fx: number, fy: number } {
    const n = 2 ** Terrarium.ZOOM
    const xf = (lng + 180) / 360 * n
    const latRad = lat * Math.PI / 180
    const yf = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    return { x: Math.floor(xf), y: Math.floor(yf), fx: xf - Math.floor(xf), fy: yf - Math.floor(yf) }
  }
}

// ---- Geometry ----

const M_PER_DEG = 111_320
/** The Earth's radius as a line of sight bends round it (see TerrainReach.SIGHT_EARTH_RADIUS_M). */
const SIGHT_R = 6_371_000 * 7 / 6
const FT = 0.3048

interface Geo { lat: number, lng: number, altM: number }

/** Azimuth, elevation and distance of `to` seen from `from`, on a ground curving away under the line of sight. */
function lookAt(from: Geo, to: Geo): { azimuthDeg: number, altitudeDeg: number, distanceM: number } {
  const lat = (from.lat + to.lat) / 2
  const east = (to.lng - from.lng) * M_PER_DEG * Math.cos(lat * Math.PI / 180)
  const north = (to.lat - from.lat) * M_PER_DEG
  const level = Math.hypot(east, north)
  const up = to.altM - from.altM - level * level / (2 * SIGHT_R)
  return {
    azimuthDeg: ((Math.atan2(east, north) * 180 / Math.PI) + 360) % 360,
    altitudeDeg: Math.atan2(up, level) * 180 / Math.PI,
    distanceM: Math.hypot(level, up)
  }
}

function offset(point: Geo, eastM: number, northM: number, upM = 0): Geo {
  return { lat: point.lat + northM / M_PER_DEG, lng: point.lng + eastM / (M_PER_DEG * Math.cos(point.lat * Math.PI / 180)), altM: point.altM + upM }
}

function between(a: Geo, b: Geo, f: number): Geo {
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, altM: a.altM + (b.altM - a.altM) * f }
}

const r2 = (v: number) => Math.round(v * 100) / 100
const r3 = (v: number) => Math.round(v * 1000) / 1000
const r6 = (v: number) => Math.round(v * 1e6) / 1e6
/** A millimetre of latitude: what the eye's position is written to, which its cabin has to follow to the millimetre (a micro-degree is 11 cm). */
const r8 = (v: number) => Math.round(v * 1e8) / 1e8

// ---- What the sources say ----

/** Arnold's path on the dossier's map (Carte.kml, "Trajectoire de Kenneth Arnold"), from the end of his turn over Elbe eastwards: points 34 to 46. */
const ROUTE: [number, number][] = [
  [-122.2184, 46.7935], [-122.1941, 46.8017], [-122.1707, 46.8076], [-122.1419, 46.8125], [-122.1192, 46.8172], [-122.0893, 46.8214],
  [-122.0663, 46.825], [-122.0197, 46.8268], [-121.9791, 46.8236], [-121.9455, 46.8142], [-121.9016, 46.7906], [-121.8521, 46.7493],
  [-121.6846, 46.5683]
]
/** "I climbed back up to an altitude of approximately 9,200 feet." */
const ARNOLD_ALT_M = 9200 * FT
/** ASSUMED: a CallAir A-3 cruising at some 100 mph. */
const ARNOLD_SPEED_MS = 44.7
/** "I hadn't flown more than two or three minutes on my course when a bright flash reflected on my airplane": t = 0, at 14:58. */
const ON_COURSE_S = 150
/** Where the dossier's map puts the first object as it passes Rainier's southern edge (14:59:00) and the last as it passes Adams' southern crest
 * (1 min 42 s later), at the height it gives them. */
const FIRST_AT_RAINIER: Geo = { lat: 46.846073, lng: -121.763962, altM: 2800 }
const LAST_AT_ADAMS: Geo = { lat: 46.19207, lng: -121.489044, altM: 2888 }
/** "approximately 9,500 foot elevation". */
const OBJECTS_ALT_M = 9500 * FT
const T_RAINIER_S = 60
const T_ADAMS_S = 162
/** "the chain of these saucer like objects were at least five miles long" */
const CHAIN_M = 5 * 1609.34
const COUNT = 9
/**
 * The most his size can be taken to be by the law of its error, as the hypothesis the most favourable to his seeing them: measured against
 * a gauge held up (his cowling tool, against the DC-4's engines), a size is within 20 % of what it was (WitnessError, "sizeGauge").
 */
const FAVOURABLE_SIZE = 1.2
const DURATION_S = 180

// ---- Arnold's flight ----

function routeLength(): { points: Geo[], at: number[] } {
  const points = ROUTE.map(([lng, lat]) => ({ lat, lng, altM: ARNOLD_ALT_M }))
  const at = [0]
  for (let i = 1; i < points.length; i++) {
    const d = lookAt(points[i - 1], points[i])
    at.push(at[i - 1] + Math.hypot(d.distanceM, 0))
  }
  return { points, at }
}
const route = routeLength()

/** Where Arnold is `t` seconds into the recording, and the heading he flies. */
/**
 * Where Arnold is `t` seconds into the recording: on the dossier's path with its corners rounded (the mean of where the path puts him over
 * four seconds), as an aircraft turns. On the path's own corners the eye, which the scene moves along a curve between two keyframes, and his
 * cabin, which it moves along a straight line, parted by most of a metre, and the eye went out through the cabin's side.
 */
function arnoldAt(t: number): { at: Geo, headingDeg: number } {
  const steps = 16, spanS = 4
  let lat = 0, lng = 0
  for (let i = 0; i <= steps; i++) {
    const p = onRoute(t - spanS / 2 + spanS * i / steps).at
    lat += p.lat
    lng += p.lng
  }
  const at = { lat: lat / (steps + 1), lng: lng / (steps + 1), altM: ARNOLD_ALT_M }
  return { at, headingDeg: onRoute(t).headingDeg }
}

function onRoute(t: number): { at: Geo, headingDeg: number } {
  const along = (ON_COURSE_S + t) * ARNOLD_SPEED_MS
  let i = 1
  while (i < route.at.length - 1 && route.at[i] < along) i++
  const f = (along - route.at[i - 1]) / (route.at[i] - route.at[i - 1])
  return { at: between(route.points[i - 1], route.points[i], f), headingDeg: lookAt(route.points[i - 1], route.points[i]).azimuthDeg }
}

// ---- The objects, as Arnold places them ----

/** The leader passes Rainier's southern edge at 60 s; the last, CHAIN_M behind it, passes Adams' crest at 162 s. */
/**
 * Where the first is as it passes Rainier's southern edge and the last as it passes Adams' crest: on Arnold's line of sight to the points the
 * map gives, as near him as keeps the whole chain over the relief (see fitChainToRelief). The map's points are on the mountains themselves,
 * where the ground at Rainier is some 4,000 m: at the 9,500 feet he gives them the chain flew through Rainier, which hid it, where he says "I
 * observed their outline against the snow quite plainly". In front of the snow, they were between him and it.
 */
let chainStart: Geo = FIRST_AT_RAINIER, chainEnd: Geo = LAST_AT_ADAMS
let lineM = lookAt(chainStart, chainEnd).distanceM
let objectSpeed = (lineM + CHAIN_M) / (T_ADAMS_S - T_RAINIER_S)
const setChain = (start: Geo, end: Geo) => {
  chainStart = start
  chainEnd = end
  lineM = lookAt(chainStart, chainEnd).distanceM
  objectSpeed = (lineM + CHAIN_M) / (T_ADAMS_S - T_RAINIER_S)
}
/** How far over the relief the chain keeps everywhere, metres: ASSUMED. */
const CHAIN_CLEARANCE_M = 150
/**
 * How they moved along their way: "a peculiar weaving motion 'like the tail of a Chinese kite'" (Bequette, East Oregonian, 1947-06-26),
 * "weaving and ducking in and out [...] They looked like they were rocking" (Oregon Journal, 1947-06-27), "swerved in and out of the high
 * mountain peaks" (report to the AAF). A wave running down the chain from its head, as down a kite's tail: each object swerves across its
 * way and dips, and rocks, a little after the one ahead of it. How far, how often and how fast the wave runs are not said: ASSUMED, a
 * swerve of 150 m and a dip of 60 m (a third and an eighth of a degree at twenty-five kilometres), every six seconds, one wave the length
 * of the chain.
 */
const WEAVE = { acrossM: 150, upM: 60, periodS: 6, rollDeg: 25 }
function weaveOf(k: number, t: number): { across: number, up: number, roll: number } {
  const phase = 2 * Math.PI * (t / WEAVE.periodS - k / (COUNT - 1))
  return { across: WEAVE.acrossM * Math.sin(phase), up: WEAVE.upM * Math.sin(2 * phase), roll: WEAVE.rollDeg * Math.cos(phase) }
}

function objectAt(k: number, t: number): Geo {
  const behindM = k * CHAIN_M / (COUNT - 1)
  const alongM = (t - T_RAINIER_S) * objectSpeed - behindM
  const p = between(chainStart, chainEnd, alongM / lineM)
  // Across their way: to the right of the course from Rainier to Adams.
  const course = lookAt(chainStart, chainEnd).azimuthDeg * Math.PI / 180
  const weave = weaveOf(k, t)
  return offset({ ...p, altM: OBJECTS_ALT_M }, weave.across * Math.cos(course), -weave.across * Math.sin(course), weave.up)
}

// ---- Flashes: "two or three of them every few seconds would dip or change their course slightly, just enough for the sun to strike them" ----

function mulberry(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry(1947)
const flashes: number[][] = Array.from({ length: COUNT }, () => [])
for (let t = 1; t < DURATION_S; t += 3) {
  const howMany = 2 + Math.floor(random() * 2)
  for (let n = 0; n < howMany; n++) flashes[Math.floor(random() * COUNT)].push(t + random() * 2.5)
}
/** A flash is a glint, not a glow: a tenth of a second or so at its brightest (ASSUMED), between keyframes of its own just before and after. */
const FLASH_S = 0.1
const flashingAt = (k: number, t: number) => flashes[k].some(f => Math.abs(t - f) < FLASH_S / 2)
/** Every flash's own instants: just before it, its height and just after, ms-rounded, in seconds; and those of each object's own. */
const instantsOf = (times: number[]) => times.flatMap(f => [f - FLASH_S, f, f + FLASH_S].map(t => Math.round(t * 1000) / 1000))
const flashInstants = instantsOf(flashes.flat())
const ownFlashInstants = flashes.map(times => new Set(instantsOf(times)))

/**
 * The posts of the cabin's windscreen frame that stand across what is ahead and to the right of the pilot's eye, measured in the scene from
 * his seat in the Piper (the stand-in's frame, not the CallAir's, of which nothing is known): the left one, by his shoulder, the middle post and the right one, each a
 * vertical-ish bar `distanceM` from the eye, centred `azimuthDeg` right of the nose at the horizon and leaning `slantDegPerDeg` further right
 * per degree above it, `halfDeg` wide each side.
 */
const CABIN_POSTS = [
  { azimuthDeg: -32, slantDegPerDeg: 0.25, halfDeg: 5, distanceM: 0.36 },
  { azimuthDeg: 19.6, slantDegPerDeg: 0.8, halfDeg: 2.2, distanceM: 0.82 },
  { azimuthDeg: 65.4, slantDegPerDeg: 0.25, halfDeg: 1.3, distanceM: 0.82 }
]
/** How far a seated pilot leans his head aside, metres, and how far past a post's edge he keeps what he looks at, degrees: ASSUMED. */
const LEAN_MAX_M = 0.15, LEAN_STEP_M = 0.01, POST_MARGIN_DEG = 0.6
/** Over how many seconds each side his head goes from one lean to the next: ASSUMED. */
const LEAN_SMOOTH_S = 2

/**
 * How far Arnold leans his head to his right (negative: to his left), metres, at `t`, to see the objects past his windscreen's posts: none
 * if none is behind one, and the least that clears the most of them, the one he watches first.
 */
function leanAt(t: number, watched: number): { leanM: number } {
  let best = 0, bestCost = hiddenCost(t, watched, 0)
  for (let step = LEAN_STEP_M; step <= LEAN_MAX_M + 1e-9 && bestCost > 0; step += LEAN_STEP_M) {
    for (const lean of [-step, step]) {
      const cost = hiddenCost(t, watched, lean)
      if (cost < bestCost) { best = lean; bestCost = cost }
    }
  }
  return { leanM: best }
}

/** How many of the objects the posts hide from Arnold at `t` with his head leant `lean` metres to his right, the one he watches as ten. */
function hiddenCost(t: number, watched: number, lean: number): number {
  const { at } = arnoldAt(t)
  const eye = { ...at, altM: ARNOLD_ALT_M }
  const heading = lookAt(arnoldAt(t - 1).at, arnoldAt(t + 1).at).azimuthDeg
  const seen = Array.from({ length: COUNT }, (_, k) => {
    const look = lookAt(eye, objectAt(k, t))
    return { k, rel: ((look.azimuthDeg - heading + 540) % 360) - 180, alt: look.altitudeDeg }
  })
  return seen.reduce((cost, { k, rel, alt }) => {
    const behind = CABIN_POSTS.some(post => {
      const c = (post.azimuthDeg + post.slantDegPerDeg * alt) * Math.PI / 180
      const apparent = Math.atan2(post.distanceM * Math.sin(c) - lean, post.distanceM * Math.cos(c)) * 180 / Math.PI
      return Math.abs(rel - apparent) < post.halfDeg + POST_MARGIN_DEG
    })
    return cost + (behind ? (k === watched ? 10 : 1) : 0)
  }, 0)
}

/** A pilot's field, wider than a lens's: what keeps the frame of his windscreen in sight as he looks ahead (ASSUMED). */
const WIDE_FIELD_DEG = 75
/**
 * The field while he watches them, vertical: the eye resolves a minute of arc, and a screen of six hundred pixels shows one a pixel only
 * at ten degrees. At 75 a pixel was 4.4 minutes: the objects, "a black thin line" 2.4 minutes long, were half a pixel, and what Arnold
 * saw and described could not be seen. The field of what he looked at, not of his eye: what was round it he saw no sharper than the
 * picture at 75 shows it.
 */
const ACUITY_FIELD_DEG = 10
/** When his eye settles on them, and when it lets go once the last is past Adams, seconds; and how long each takes: ASSUMED. */
const FOCUS_FROM_S = 3, FOCUS_UNTIL_S = T_ADAMS_S + 6, FOCUS_TAKES_S = 3

/** The field he sees at `t`, vertical degrees: wide, and as narrow as his eye's acuity while he watches them. */
function fieldAt(t: number): number {
  const ease = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c) }
  const focus = ease((t - FOCUS_FROM_S) / FOCUS_TAKES_S) * (1 - ease((t - FOCUS_UNTIL_S) / FOCUS_TAKES_S))
  return WIDE_FIELD_DEG + (ACUITY_FIELD_DEG - WIDE_FIELD_DEG) * focus
}

/** Halfway between the first object and the last at `t`. */
function chainMiddleAt(t: number): Geo {
  const first = objectAt(0, t), last = objectAt(COUNT - 1, t)
  return { lat: (first.lat + last.lat) / 2, lng: (first.lng + last.lng) / 2, altM: (first.altM + last.altM) / 2 }
}

/**
 * Brings each end of the chain along Arnold's line of sight towards him, by hundredths of the way, the least that keeps every object over the
 * relief by CHAIN_CLEARANCE_M all through the recording: what he saw of them, their directions, is the same; only how far along it changes.
 */
function fitChainToRelief(terrarium: Terrarium, samples: number[]): { start: number, end: number } {
  const clear = () => samples.every(t => Array.from({ length: COUNT }, (_, k) => objectAt(k, t))
    .every(p => p.altM - terrarium.heightAt(p.lat, p.lng) >= CHAIN_CLEARANCE_M))
  const along = (from: Geo, to: Geo, f: number) => ({ ...between(from, to, f), altM: OBJECTS_ALT_M })
  const fromRainier = arnoldAt(T_RAINIER_S).at, fromAdams = arnoldAt(T_ADAMS_S).at
  let best: { start: number, end: number, sum: number } | undefined
  for (let i = 0; i <= 50; i++) {
    for (let j = 0; j <= 50; j++) {
      const start = 1 - i / 100, end = 1 - j / 100
      if (best && start + end <= best.sum) continue
      setChain(along(fromRainier, FIRST_AT_RAINIER, start), along(fromAdams, LAST_AT_ADAMS, end))
      if (clear()) best = { start, end, sum: start + end }
    }
  }
  if (!best) throw new Error("No chain over the relief within half of the way")
  setChain(along(fromRainier, FIRST_AT_RAINIER, best.start), along(fromAdams, LAST_AT_ADAMS, best.end))
  return best
}

async function main(): Promise<void> {
  const samples = Array.from({ length: DURATION_S + 1 }, (_, t) => t)
  // What the flashes are drawn at: every second, and the instants of each flash, so that a flash is as short as it is.
  const flashSamples = [...new Set([...samples, ...flashInstants.filter(t => t > 0 && t < DURATION_S)])].sort((a, b) => a - b)
  const terrarium = new Terrarium()
  await terrarium.load(samples.map(t => arnoldAt(t).at))
  // The ground under the chain, all the way from Rainier to Adams and between them and him.
  const box: { lat: number, lng: number }[] = []
  for (let lat = 46.0; lat <= 47.6; lat += 0.02) for (let lng = -122.4; lng <= -121.3; lng += 0.02) box.push({ lat, lng })
  await terrarium.load(box)
  const fit = fitChainToRelief(terrarium, samples)
  console.log(`chain brought ${Math.round((1 - fit.start) * 100)} % nearer at Rainier and ${Math.round((1 - fit.end) * 100)} % at Adams, to keep ${CHAIN_CLEARANCE_M} m over the relief`)
  const origin = arnoldAt(0).at
  const originGround = terrarium.heightAt(origin.lat, origin.lng)
  const local = (p: Geo) => ({
    eastM: r2((p.lng - origin.lng) * M_PER_DEG * Math.cos(origin.lat * Math.PI / 180)),
    northM: r2((p.lat - origin.lat) * M_PER_DEG)
  })
  // A decor's track is laid out as the scene lays the decor round an observer who moves: east in metres of the latitude it is at, not of the
  // origin's. With the origin's, the cabin slid 1.5 m back along the seven kilometres flown, and the eye went out through its rear.
  const decorLocal = (p: Geo) => ({
    eastM: r2((p.lng - origin.lng) * M_PER_DEG * Math.cos(p.lat * Math.PI / 180)),
    northM: r2((p.lat - origin.lat) * M_PER_DEG)
  })

  // The witness, looking at the leader while it is in sight, at the last of them after.
  const watchedAt = (t: number) => t < T_ADAMS_S - 20 ? 0 : COUNT - 1
  // His head, leant aside to see past the frame of his windscreen: a pilot whose view of what he watches is cut by a post moves his head
  // the few centimetres it takes (see CABIN_POSTS). Straight ahead, the chain came along his nose with its leader behind the middle post,
  // and the two after it: what he described could not be seen.
  const leans = samples.map(t => leanAt(t, watchedAt(t)).leanM)
  const smoothed = leans.map((_, i) => {
    let sum = 0, n = 0
    for (let j = Math.max(0, i - LEAN_SMOOTH_S); j <= Math.min(leans.length - 1, i + LEAN_SMOOTH_S); j++, n++) sum += leans[j]
    return sum / n
  })
  // Smoothed, a head going from one side to the other went past the post with the chain behind it: where the smoothed lean hides more than
  // the one found, the head is where that one has it.
  const leanOf = (i: number) => {
    const t = samples[i]
    return hiddenCost(t, watchedAt(t), smoothed[i]) > hiddenCost(t, watchedAt(t), leans[i]) ? leans[i] : smoothed[i]
  }
  const stillHidden = samples.filter((t, i) => hiddenCost(t, watchedAt(t), leanOf(i)) > 0)
  console.log(`head leant aside up to ${Math.max(...leans.map(Math.abs)).toFixed(2)} m; objects still behind a post at ${stillHidden.length} s of ${samples.length}`)
  const observerKeys = samples.map((t, i) => {
    const { at: route } = arnoldAt(t)
    const h = lookAt(arnoldAt(t - 1).at, arnoldAt(t + 1).at).azimuthDeg * Math.PI / 180
    const lean = leanOf(i)
    const at = { ...offset(route, lean * Math.cos(h), -lean * Math.sin(h)), altM: route.altM }
    const eye = { ...at, altM: ARNOLD_ALT_M }
    const watched = watchedAt(t)
    // Once his eye is on them, the middle of the chain: the whole of it in a field as narrow as his eye's acuity (see fieldAt).
    const narrow = fieldAt(t) < WIDE_FIELD_DEG
    const look = narrow ? lookAt(eye, chainMiddleAt(t)) : lookAt(eye, objectAt(watched, t))
    return {
      t: t * 1000,
      pose: {
        lat: r8(at.lat), lng: r8(at.lng),
        // Stated against the ground where the recording starts, the same all along: the scene puts him at `altitudeM` over whatever relief it
        // draws, and his cabin is stated against this (see ObserverPose.altitudeM).
        elevationM: t === 0
          ? said(r2(ARNOLD_ALT_M - originGround), "derived", "\"approximately 9,200 feet\" above the sea, less the ground where the recording starts (AWS Terrarium tiles)", "« environ 9 200 pieds » au-dessus de la mer, moins le sol où commence l'enregistrement (tuiles AWS Terrarium)")
          : r2(ARNOLD_ALT_M - originGround),
        altitudeM: t === 0
          ? said(r2(ARNOLD_ALT_M), "stated", "\"I climbed back up to an altitude of approximately 9,200 feet\"", "« je remontai à une altitude d'environ 9 200 pieds »")
          : r2(ARNOLD_ALT_M),
        headingDeg: r2(look.azimuthDeg), pitchDeg: r2(look.altitudeDeg),
        fovDeg: r2(fieldAt(t))
      }
    }
  })

  // His aircraft, round his eye: a Piper PA-28 Cadet stands in for his CallAir A-3 (no model of it to be had). In the model the pilot's eye is
  // 1.3 m ahead of its middle, 0.28 m left of its axis and 0.335 m above its middle: behind the left yoke, 0.65 m from the panel (the eyes are
  // at the front of a head over a body sitting on the seat), a little over 0.2 m under the roof. The decor states where the model's middle is.
  const cabinTrack = samples.map(t => {
    // Round the eye as it is written, and pointing the way it goes over two seconds: the route's own heading turns at once at each of its
    // corners, and the cabin with it, a quarter of a metre at the eye.
    const raw = arnoldAt(t).at
    const at = { lat: r8(raw.lat), lng: r8(raw.lng), altM: raw.altM }
    const headingDeg = lookAt(arnoldAt(t - 1).at, arnoldAt(t + 1).at).azimuthDeg
    const h = headingDeg * Math.PI / 180
    // From the eye back to the model's middle, and to its right.
    const back = 1.3, right = 0.28
    const middle = offset(at, -back * Math.sin(h) + right * Math.cos(h), -back * Math.cos(h) - right * Math.sin(h))
    return { t: t * 1000, ...decorLocal(middle), altitudeM: r2(ARNOLD_ALT_M - originGround + 1.6 - 0.335), headingDeg: r2(headingDeg) }
  })

  // "There was a DC-4 to the left and to the rear of me approximately fifteen miles distance, and I should judge, at 14,000 foot elevation."
  // Where it went is not said: ASSUMED flying east, as he was, at a DC-4's cruise of some 100 m/s.
  const dc4Start = (() => {
    const { at, headingDeg } = arnoldAt(0)
    const bearing = (headingDeg - 135) * Math.PI / 180
    return offset(at, 15 * 1609.34 * Math.sin(bearing), 15 * 1609.34 * Math.cos(bearing))
  })()
  await terrarium.load(samples.map(t => offset(dc4Start, t * 100, 0)))
  const dc4Track = samples.filter(t => t % 10 === 0).map(t => {
    const p = offset(dc4Start, t * 100, 0)
    return { t: t * 1000, ...decorLocal(p), altitudeM: r2(14000 * FT - terrarium.heightAt(p.lat, p.lng)), headingDeg: 90 }
  })

  // ---- The account: each object's direction, as the points the dossier's map puts them at, seen from where he was ----
  const sourceIds = Array.from({ length: COUNT }, (_, k) => `object-${k + 1}`)
  // "they seemed smaller than the DC-4; but, I should judge their span would have been as wide as the furtherest engines on each side of the
  // fuselage of the DC-4", that DC-4 fifteen miles off: a DC-4's outer engines are some 17 m apart, 0.04° at 15 miles.
  const widthDeg = 17 / (15 * 1609.34) * 180 / Math.PI
  const polygon = Array.from({ length: 25 }, (_, i) => {
    // His drawing: rounded in front, a point at the back; "their thickness was about 1/20th their width".
    const a = Math.PI * (i / 24)
    return i <= 16
      ? { x: r2(50 - 50 * Math.cos(a * 24 / 16 * 0.5 * 2 > Math.PI ? Math.PI : a * 24 / 16)), y: r2(2.5 - 2.5 * Math.sin(a * 24 / 16)) }
      : { x: r2(100 - (i - 16) / 8 * 50), y: r2(2.5 + 2.5 * (i - 16) / 8) }
  })
  const keyframes = flashSamples.map(t => {
    const eye = { ...arnoldAt(t).at, altM: ARNOLD_ALT_M }
    return {
      t: Math.round(t * 1000),
      shapes: sourceIds.map((sourceId, k) => {
        const look = lookAt(eye, objectAt(k, t))
        const flash = flashingAt(k, t)
        const shape: Record<string, unknown> = {
          aim: t === T_RAINIER_S && k === 0
            ? said({ azimuthDeg: r3(look.azimuthDeg), altitudeDeg: r3(look.altitudeDeg) }, "derived",
              "\"one minute to 3 P.M. as the first object of this formation passed the southern edge of Mt. Rainier\": the direction of that edge as the dossier's map places it, from where he is assumed to be",
              "« une minute avant 15 h, quand le premier objet de cette formation passa le bord sud du mont Rainier » : la direction de ce bord tel que la carte du dossier le place, depuis là où on le suppose")
            : t === T_ADAMS_S && k === COUNT - 1
              ? said({ azimuthDeg: r3(look.azimuthDeg), altitudeDeg: r3(look.altitudeDeg) }, "derived",
                "\"As the last unit of this formation passed the southern most high snow-covered crest of Mt. Adams [...] one minute and forty-two seconds\"",
                "« Quand le dernier de cette formation passa la crête enneigée la plus au sud du mont Adams [...] une minute et quarante-deux secondes »")
              : { azimuthDeg: r3(look.azimuthDeg), altitudeDeg: r3(look.altitudeDeg) },
          angular: { widthDeg: r3(widthDeg), heightDeg: r3(flash ? widthDeg : widthDeg / 20) },
          // "They looked like they were rocking": the outline tilts as the object rocks (see WEAVE).
          angle: r3(weaveOf(k, t).roll * Math.PI / 180),
          kind: "polygon",
          points: polygon,
          bounds: { x: 300, y: 178, width: 100, height: 5 },
          color: flash ? "#ffffff" : "#1c1c1c",
          // "Mirror Bright" as they flip: a flash.
          brightness: flash ? 1 : 0,
          // A point of light, not a disc: its glare reaches little past it.
          haloScale: flash ? 0.4 : 0,
          transparency: 0,
          title: { en: `Object ${k + 1}`, fr: `Objet ${k + 1}` }
        }
        // After the first, a keyframe states only what changes (the rest holds from the one before): where it is and how it rocks, and
        // about a flash of its own, how bright and how big. Stated in full each time, the file was thirteen megabytes.
        if (t !== 0) {
          const own = ownFlashInstants[k].has(Math.round(t * 1000) / 1000)
          for (const key of Object.keys(shape)) {
            if (key === "aim" || key === "angle") continue
            if (own && (key === "angular" || key === "color" || key === "brightness" || key === "haloScale")) continue
            delete shape[key]
          }
        }
        if (t === 0 && k === 0) {
          shape.color = said("#1c1c1c", "stated", "\"When these objects were flying approximately straight and level, they were just a black thin line\"", "« Quand ces objets volaient à peu près droit et à plat, ce n'était qu'un mince trait noir »")
          shape.angular = said({ widthDeg: r3(widthDeg), heightDeg: r3(widthDeg / 20) }, "stated",
            "\"their span would have been as wide as the furtherest engines on each side of the fuselage of the DC-4\" (some 17 m apart, fifteen miles off), measured against a cowling tool held up; \"their thickness was about 1/20th their width\"",
            "« leur envergure aurait été aussi large que les moteurs les plus éloignés de chaque côté du fuselage du DC-4 » (quelque 17 m, à quinze miles), mesuré contre un outil de capot tenu à bout de bras ; « leur épaisseur était d'environ 1/20 de leur largeur »")
        }
        return { sourceId, shape }
      })
    }
  })

  const description: Text = {
    en: "\"I hadn't flown more than two or three minutes on my course when a bright flash reflected on my airplane. [...] I observed a chain of nine peculiar looking aircraft flying from north to south at approximately 9,500 foot elevation [...] They flew like many times I have observed geese to fly in a rather diagonal chain-like line as if they were linked together. [...] What kept bothering me as I watched them flip and flash in the sun right along their path was the fact that I couldn't make out any tail on them.\" (Report to the AAF, July 1947.)",
    fr: "« Je n'avais pas volé plus de deux ou trois minutes sur mon cap quand un éclair brillant se refléta sur mon avion. [...] J'observai une chaîne de neuf appareils d'aspect étrange volant du nord au sud à environ 9 500 pieds [...] Ils volaient comme j'ai souvent vu voler des oies, en une ligne plutôt diagonale, comme une chaîne dont ils seraient les maillons. [...] Ce qui continuait de me tracasser, tandis que je les regardais basculer et étinceler au soleil tout le long de leur trajet, c'était que je ne pouvais leur distinguer aucune queue. » (Rapport à l'AAF, juillet 1947.)"
  }
  const witnessInterpretation = {
    title: { en: "Nine craft some fifteen metres across, flying from Rainier to Adams (his own reading)", fr: "Neuf engins d'une quinzaine de mètres, volant du Rainier à l'Adams (sa propre lecture)" },
    bodies: sourceIds.map((sourceId, k) => ({
      id: `craft-${k + 1}`,
      explains: [sourceId],
      model: { id: "ellipsoid" },
      track: [...new Set([...samples, ...[...ownFlashInstants[k]].filter(t => t > 0 && t < DURATION_S)])].sort((a, b) => a - b).map(t => ({
        t: Math.round(t * 1000),
        ...local(objectAt(k, t)),
        altitudeM: r2(OBJECTS_ALT_M - originGround),
        ...(t === 0 ? {
          sizeM: { widthM: r2(14 * FAVOURABLE_SIZE), lengthM: r2(15 * FAVOURABLE_SIZE), heightM: r2(0.7 * FAVOURABLE_SIZE) },
          // "just a black thin line" when level, "Mirror Bright" when they flipped: a dark plate seen from a little below, its underside in
          // its own shade, and the Sun's glint off it when it tilted, given as light (see the keyframes' luminanceCdM2). Polished, its
          // underside would mirror the sunlit forest under it, as bright as the sky behind: no black line.
          appearance: { color: "#2a2c30", albedo: 0.08, haloScale: 0.3 },
          attitude: { headingDeg: r2(lookAt(chainStart, chainEnd).azimuthDeg), pitchDeg: 0, rollDeg: 0 }
        } : {}),
        // "flip and flash in the sun": banked for an instant, and as bright then as "if someone had started an arc light" (Bequette): some
        // 10⁸ cd/m², ASSUMED from his comparison.
        attitude: { headingDeg: r2(lookAt(chainStart, chainEnd).azimuthDeg), pitchDeg: 0, rollDeg: r2(flashingAt(k, t) ? 40 : weaveOf(k, t).roll) },
        ...(t === 0 ? {} : { appearance: { luminanceCdM2: flashingAt(k, t) ? 1e8 : 0 } })
      }))
    }))
  }

  const weather = {
    cloudCover: said(0, "stated", "\"The sky and air was clear as crystal\"", "« Le ciel et l'air étaient clairs comme du cristal »"),
    visibilityKm: said(120, "assumed", "\"the air was so clear that it was very easy to see objects and determine their approximate shape and size at almost fifty miles\"; he followed the flashes to Mt Adams, some 90 km off", "« l'air était si clair qu'il était très facile de voir des objets et d'en juger la forme et la taille à près de cinquante miles » ; il suivit les éclats jusqu'au mont Adams, à quelque 90 km"),
    cloudDarkness: 0, lowerCloudCover: 0, highCloudCover: 0, precipitationType: "none", precipitationIntensity: 0,
    windSpeed: said(2, "assumed", "\"The air was so smooth that day\"", "« L'air était si calme ce jour-là »"), windDirectionDeg: 270, storm: false
  }

  const decor = [
    {
      id: "callair", kind: "aircraft",
      title: { en: "His aircraft", fr: "Son avion" },
      note: { en: "A Piper PA-28 stands in for his CallAir A-3.", fr: "Un Piper PA-28 tient lieu de son CallAir A-3." },
      eastM: cabinTrack[0].eastM, northM: cabinTrack[0].northM, headingDeg: cabinTrack[0].headingDeg, sizeM: { widthM: 10.55, lengthM: 7.15, heightM: 2.73 },
      model: { id: "helijah-piper-pa28-cadet" }, track: cabinTrack,
      // Everything he saw, he saw out of it: its frame hides them, and where they overlap it on the picture they are beyond it, not in front.
      occludesSourceIds: sourceIds
    },
    // The summits he timed them by: named where the pointer finds them (see DecorKind "peak"); the relief is the mountain.
    {
      id: "mount-rainier", kind: "peak", title: { en: "Mount Rainier (4,392 m)", fr: "Mont Rainier (4 392 m)" },
      ...decorLocal({ lat: 46.8529, lng: -121.7604, altM: 0 }), sizeM: { widthM: 16000, lengthM: 16000, heightM: 1 }
    },
    {
      id: "mount-adams", kind: "peak", title: { en: "Mount Adams (3,743 m)", fr: "Mont Adams (3 743 m)" },
      ...decorLocal({ lat: 46.2024, lng: -121.4906, altM: 0 }), sizeM: { widthM: 14000, lengthM: 14000, heightM: 1 }
    },
    {
      id: "dc4", kind: "aircraft",
      title: { en: "DC-4 \"to the left and to the rear of me approximately fifteen miles\"", fr: "DC-4 « à ma gauche et en arrière, à environ quinze miles »" },
      eastM: dc4Track[0].eastM, northM: dc4Track[0].northM, headingDeg: dc4Track[0].headingDeg, sizeM: { widthM: 35.8, lengthM: 28.6, heightM: 8.4 },
      model: { id: "poly-google-airliner" }, track: dc4Track
    }
  ]

  const recording = {
    version: 4,
    id: "1947-06-24-ArnoldKennethE",
    time: "1947-06-24T14:58:00",
    utcOffsetHours: -7,
    timeZone: "America/Los_Angeles",
    durationSeconds: DURATION_S,
    summaryTime: T_RAINIER_S + 20,
    place: { name: "Cascade Range, between Mount Rainier and Mount Adams, Washington", locations: [{ lat: r6(origin.lat), lng: r6(origin.lng) }] },
    observer: { id: "ArnoldKennethE", title: "Kenneth Arnold" },
    account: {
      observerOccupation: { en: "businessman and private pilot", fr: "homme d'affaires et pilote privé" },
      source: said("letter", "stated", "his written report to the AAF, sent in July 1947, two weeks after", "son rapport écrit à l'AAF, envoyé en juillet 1947, deux semaines après")
    },
    description,
    tags: ["pilot", "daylight disc", "formation"],
    sources: [{ title: "Sighting report (to the AAF)", authors: ["Kenneth Arnold"], url: "https://rr0.org/time/1/9/4/7/07/12/Arnold_Report_AAF/", publication: { time: "1947-07-12" } }],
    instrument: "eye",
    observerTrack: { keyframes: observerKeys },
    timeline: { keyframes, order: sourceIds, groups: [{ id: "chain", members: sourceIds }] },
    milestones: [
      { t: 0, label: "A", note: { en: "A flash on his aircraft: he finds a chain of nine objects north of Rainier.", fr: "Un éclair sur son avion : il découvre une chaîne de neuf objets au nord du Rainier." } },
      { t: T_RAINIER_S * 1000, label: "B", note: { en: "14:59: the first passes Rainier's southern edge. He starts timing.", fr: "14 h 59 : le premier passe le bord sud du Rainier. Il déclenche son chronométrage." } },
      { t: T_ADAMS_S * 1000, label: "C", note: { en: "1 min 42 s later: the last passes Adams' southern crest.", fr: "1 min 42 s plus tard : le dernier passe la crête sud de l'Adams." } }
    ],
    soundTrack: { keyframes: [] },
    decor,
    weatherTrack: { keyframes: [{ t: 0, weather }] },
    interpretation: witnessInterpretation
  }
  writeFileSync(path.join(demoData, "observer-arnold.json"), JSON.stringify(recording) + "\n")
  // ---- His later account: the same flight, the objects drawn as the crescent he showed in the 1960s ----
  // The dossier's sketch of how his drawing changed (Shapes.jpg: 1947 round, 1950 round in front and pointed behind, "196x" a crescent,
  // "bat-like") and the drawing itself (CrescentShape.jpg), its dark round spot left out (an outline has no hole). Its exact date is not
  // known: the 1960s. Everything else of what he says is taken to be what he said in 1947.
  const crescent = (() => {
    const outer = Array.from({ length: 17 }, (_, i) => {
      const u = i / 16
      return { x: r2(100 * u), y: r2(5 * (1 - 0.95 * Math.sin(Math.PI * u))) }
    })
    // Its trailing edge, between the two tips: hollowed on each side of a point at the middle, as a bat's wings.
    const inner = [{ x: 78, y: 2.75 }, { x: 58, y: 5 }, { x: 30, y: 2.75 }]
    return [...outer, ...inner]
  })()
  // His own reading kept: the same craft, as he went on describing them.
  const later = JSON.parse(JSON.stringify(recording)) as typeof recording
  later.id = "1947-06-24-ArnoldKennethE-1960s"
  later.account = {
    observerOccupation: recording.account.observerOccupation,
    source: said("letter", "stated", "the crescent he drew and showed in the 1960s (the photograph and the sketch of the rr0.org dossier); its exact date is not known",
      "le croissant qu'il dessina et montra dans les années 1960 (la photographie et le croquis du dossier rr0.org) ; sa date exacte n'est pas connue")
  }
  later.description = {
    en: "The same flight as he told it later: the nine objects drawn as crescents, \"bat-like\", rather than as the rounded fans of his 1947 report.",
    fr: "Le même vol tel qu'il le raconta plus tard : les neuf objets dessinés en croissants, « comme des chauves-souris », plutôt qu'en éventails arrondis comme dans son rapport de 1947."
  }
  for (const keyframe of later.timeline.keyframes as { shapes: { shape: Record<string, unknown> }[] }[]) {
    for (const { shape } of keyframe.shapes) if (shape.points) shape.points = crescent
  }
  writeFileSync(path.join(demoData, "observer-arnold-1960s.json"), JSON.stringify(later) + "\n")


  // ---- The pelicans: solved ----
  // A white pelican cruises at some 10 to 18 m/s with the wind, and loses a metre a second or so in its glides (ASSUMED ranges): the speed and
  // the rate of climb are solved for within them, with the distance and the heading.
  const eyeAt = (t: number) => ({ ...arnoldAt(t).at, altM: ARNOLD_ALT_M })
  const see1 = lookAt(eyeAt(T_RAINIER_S), objectAt(0, T_RAINIER_S))
  const see2 = lookAt(eyeAt(T_ADAMS_S), objectAt(COUNT - 1, T_ADAMS_S))
  const missOf = (d: number, heading: number, speed: number, climb = 0) => {
    const a = see1.azimuthDeg * Math.PI / 180, e = see1.altitudeDeg * Math.PI / 180
    const start = offset(eyeAt(T_RAINIER_S), d * Math.cos(e) * Math.sin(a), d * Math.cos(e) * Math.cos(a), d * Math.sin(e))
    const h = heading * Math.PI / 180, run = speed * (T_ADAMS_S - T_RAINIER_S)
    const seen = lookAt(eyeAt(T_ADAMS_S), offset(start, run * Math.sin(h), run * Math.cos(h), climb * (T_ADAMS_S - T_RAINIER_S)))
    const dAz = ((seen.azimuthDeg - see2.azimuthDeg + 540) % 360) - 180
    return { error: Math.hypot(dAz, seen.altitudeDeg - see2.altitudeDeg), dAz, dAlt: seen.altitudeDeg - see2.altitudeDeg }
  }
  // Distance and speed trade against each other (nearer and slower, or farther and faster, cross the same two lines of sight): of the
  // flights that fit to within a twentieth of a degree, the one at the speed nearest a white pelican's ordinary 13 m/s.
  const solveAt = (speed: number) => {
    let found = { error: Infinity, d: 0, heading: 0, speed, climb: 0 }
    for (let d = 100; d <= 20000; d += d < 2000 ? 10 : 50) {
      for (let heading = 0; heading < 360; heading += 1) {
        for (let climb = -1.5; climb <= 0.5; climb += 0.25) {
          const { error } = missOf(d, heading, speed, climb)
          if (error < found.error) found = { error, d, heading, speed, climb }
        }
      }
    }
    const coarse = found
    for (let d = coarse.d - 60; d <= coarse.d + 60; d += 2) {
      for (let heading = coarse.heading - 1.5; heading <= coarse.heading + 1.5; heading += 0.1) {
        for (let climb = Math.max(-1.5, coarse.climb - 0.25); climb <= Math.min(0.5, coarse.climb + 0.25); climb += 0.02) {
          const { error } = missOf(d, heading, speed, climb)
          if (error < found.error) found = { error, d, heading, speed, climb }
        }
      }
    }
    return found
  }
  let best = solveAt(13)
  for (const speed of [12, 14, 11, 15, 10, 16, 17, 18]) {
    if (best.error < 0.05) break
    const tried = solveAt(speed)
    if (tried.error < best.error) best = tried
  }
  const miss = missOf(best.d, best.heading, best.speed, best.climb)
  console.log(`miss: az ${miss.dAz.toFixed(3)}°, alt ${miss.dAlt.toFixed(3)}°`)
  const pelicanSpeed = best.speed
  const a = see1.azimuthDeg * Math.PI / 180, e = see1.altitudeDeg * Math.PI / 180
  const birdStart = offset(eyeAt(T_RAINIER_S), best.d * Math.cos(e) * Math.sin(a), best.d * Math.cos(e) * Math.cos(a), best.d * Math.sin(e))
  const birdAt = (t: number) => {
    const run = pelicanSpeed * (t - T_RAINIER_S), h = best.heading * Math.PI / 180
    return offset(birdStart, run * Math.sin(h), run * Math.cos(h), best.climb * (t - T_RAINIER_S))
  }
  const birdPath = [0, T_RAINIER_S, T_ADAMS_S, DURATION_S].map(t => { const p = birdAt(t); return { t: t * 1000, ...local(p), altitudeM: r2(p.altM - originGround) } })
  console.log(`pelicans: ${best.d} m from him at 14:59, heading ${best.heading.toFixed(1)}° at ${best.speed.toFixed(1)} m/s climbing ${best.climb.toFixed(2)} m/s, off by ${best.error.toFixed(3)}° at 15:00:42; ${r2(birdStart.altM)} m above the sea`)

  const pelicans = {
    ...recording,
    id: "1947-06-24-ArnoldKennethE-pelicans",
    interpretation: {
      title: {
        en: `A chain of nine American white pelicans, ${Math.round(best.d / 10) * 10} m from him, flapping and gliding`,
        fr: `Une chaîne de neuf pélicans d'Amérique, à ${Math.round(best.d / 10) * 10} m de lui, battant des ailes et planant`
      },
      bodies: [],
      birds: [{
        id: "pelicans",
        species: "american-white-pelican",
        count: COUNT,
        // "in a rather diagonal chain-like line": an echelon.
        formation: { kind: "echelon", spacing: 1.2 },
        path: birdPath,
        originElevationM: r2(originGround),
        explainsEach: sourceIds,
        seed: 24
      }]
    }
  }
  writeFileSync(path.join(demoData, "interpretation-mont-rainier-pelicans.json"), JSON.stringify(pelicans) + "\n")

  const caseJson = {
    id: "MontRainier1947",
    title: "Mount Rainier",
    summary: {
      en: "24 June 1947, 14:59. Flying east at 9,200 ft, Kenneth Arnold watches a chain of nine flashing objects cross from Mount Rainier to Mount Adams in 1 min 42 s. Replayed from his report, with his own reading and the pelican one solved from his timings.",
      fr: "24 juin 1947, 14 h 59. En vol vers l'est à 9 200 pieds, Kenneth Arnold voit une chaîne de neuf objets étincelants passer du mont Rainier au mont Adams en 1 min 42 s. Rejoué d'après son rapport, avec sa propre lecture et celle des pélicans, résolue à partir de ses chronométrages."
    },
    time: "1947-06-24 14:59",
    events: [
      { type: "event", eventType: "sighting", id: "arnold", time: "1947-06-24 14:58", title: "Kenneth Arnold", url: "observer-arnold.json" },
      { type: "event", eventType: "sighting", id: "arnold-1960s", time: "1947-06-24 14:58", title: { en: "Kenneth Arnold, as he drew them in the 1960s", fr: "Kenneth Arnold, tels qu'il les dessina dans les années 1960" }, url: "observer-arnold-1960s.json" },
      {
        type: "event", eventType: "sighting", interpretationOf: "arnold",
        title: pelicans.interpretation.title,
        url: "interpretation-mont-rainier-pelicans.json"
      }
    ]
  }
  // The pelicans read against his later account too: the same birds, set against the crescents.
  const laterPelicans = { ...JSON.parse(JSON.stringify(later)), id: "1947-06-24-ArnoldKennethE-1960s-pelicans", interpretation: pelicans.interpretation }
  writeFileSync(path.join(demoData, "interpretation-mont-rainier-1960s-pelicans.json"), JSON.stringify(laterPelicans) + "\n")
  caseJson.events.push({ type: "event", eventType: "sighting", interpretationOf: "arnold-1960s", title: pelicans.interpretation.title, url: "interpretation-mont-rainier-1960s-pelicans.json" } as never)
  writeFileSync(path.join(demoData, "case-mont-rainier.json"), JSON.stringify(caseJson, null, 1) + "\n")
  const first = lookAt(eyeAt(T_RAINIER_S), objectAt(0, T_RAINIER_S))
  console.log(`objects at ${Math.round(objectSpeed)} m/s; leader at 14:59 az ${first.azimuthDeg.toFixed(1)} alt ${first.altitudeDeg.toFixed(2)} at ${(first.distanceM / 1000).toFixed(1)} km; last at Adams az ${see2.azimuthDeg.toFixed(1)} alt ${see2.altitudeDeg.toFixed(2)} at ${(see2.distanceM / 1000).toFixed(1)} km`)
}

void main()
