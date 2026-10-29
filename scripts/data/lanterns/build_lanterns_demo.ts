/**
 * Builds the sky lanterns demo: a dozen lanterns let go from a garden on a winter night, filmed with a phone by one of those letting them
 * go, a few steps from where they leave the ground: over their whole flight, from the first let go to the last gone out (a lantern burns
 * some ten minutes), the phone following the group as a hand does, a little late: lanterns a metre tall rising past the eye, then carried
 * off by the wind aloft until they are a loose group of points far off, dying out one by one.
 *
 * The group's look far off reproduces a video posted on X on 27 October 2026 (https://x.com/EnigmasEnX/status/2115166526068449372) as "an
 * invasion flotilla": some ten points in a loose, irregular group above a snowy North American town, steady, silent, drifting slowly.
 * Neither the place nor the date of that video is known.
 *
 * ASSUMED, all of it: the place (a garden in Fargo, North Dakota), the night (New Year's Eve 2025, 00:20, when lanterns are let go), when
 * each is let go, each one's flame and fuel cell (the common lantern within the spread of what is sold), the winds and the cold, and how
 * the phone follows them. Computed by the engine: each lantern's flight and light, where it is from the observer.
 *
 * Writes ../../../public/demo-data/sky-test-lanterns.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SkyLantern } from "../../../src/engine/interpretation/SkyLantern.js"
import type { LanternLaunchJson } from "../../../src/engine/interpretation/SkyLantern.js"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-lanterns.json")
const OBSERVER = { lat: 46.8606, lng: -96.8240, elevationM: 275, name: "Fargo, North Dakota" }
const why = "Assumed: neither the place nor the date of the video this demo reproduces is known."

const launch: LanternLaunchJson = {
  id: "new-year",
  title: { en: "Sky lanterns", fr: "Lanternes célestes", es: "Farolillos voladores", it: "Lanterne volanti" },
  // A few steps downwind of the phone: what they leave from is in front of it.
  site: { eastM: 14, northM: -3, originElevationM: OBSERVER.elevationM },
  // The first let go two metres in front of the phone, by whoever stands beside the one filming: it climbs past the phone, which looks up
  // into its mouth, at its flame, the brightest thing of the night and the one that throws a ghost in a phone's picture.
  releases: [{ t: 0, eastM: -12, northM: 3, seed: 3 }],
  // Eleven more let go about every 8 s after it, from round a small lawn, each a little unlike the others.
  group: { count: 11, fromT: 8000, untilT: 90000, radiusM: 5, burnS: { min: 570, max: 750 }, insideExcessK: { min: 120, max: 180 }, seed: 7 },
  // Near calm at the ground, as a clear winter night often is: they climb nearly straight up before the wind aloft takes them.
  wind: { towardDeg: 100, speedMS: 0.4 },
  windAloft: { towardDeg: 30, speedMS: 4, atM: 500 },
  airTemperatureC: -12
}

// Every point of every flight while plainly lit: what the phone follows, and when the last dies out. Plainly: a flame on its last embers,
// some kilometres off, is no longer a point anyone sees, and minutes of an empty sky after it would be the demo's, not the night's.
const SEEN_LIGHT = 0.25
const EYE_M = 1.6
const paths = SkyLantern.releasesOf(launch).map(release => SkyLantern.trajectory(launch, release))
const lit = paths.flatMap(path => path.filter(point => point.t >= 0 && point.light >= SEEN_LIGHT))
const DURATION_S = Math.ceil(Math.max(...lit.map(point => point.t)) / 1000) + 15

// Where the phone points: at the group, every second, as a hand follows it — late, never quite on it. The group is the mean direction of
// its lit lanterns, each a unit vector from the eye weighed by the light it sends there (as the inverse square of its distance): the eye
// goes to the brightest, and a lantern climbing past the phone holds it until it is up and away.
const STEP_MS = 1000, LAG_S = 2.5, FOV_DEG = 62
const groupAt = (t: number) => {
  const sum = { x: 0, y: 0, z: 0 }
  for (const point of lit) {
    if (Math.abs(point.t - t) > SkyLantern.SAMPLE_MS / 2) continue
    const d = Math.hypot(point.x, point.y, point.z - EYE_M)
    const weight = point.light / (d * d * d)
    sum.x += point.x * weight; sum.y += point.y * weight; sum.z += (point.z - EYE_M) * weight
  }
  return sum.x === 0 && sum.y === 0 && sum.z === 0 ? undefined : sum
}
const keyframes: { t: number, pose: object }[] = []
// Before the first leaves the ground, the phone is on it, held a little below the horizon.
const first = launch.releases![0]
let aim = { x: launch.site.eastM + first.eastM!, y: launch.site.northM + first.northM!, z: 0.5 - EYE_M }
const keep = Math.exp(-STEP_MS / 1000 / LAG_S)
for (let t = 0; t <= DURATION_S * 1000; t += STEP_MS) {
  const group = groupAt(t)
  if (group) {
    const n = Math.hypot(group.x, group.y, group.z), a = Math.hypot(aim.x, aim.y, aim.z)
    aim = { x: keep * aim.x / a + (1 - keep) * group.x / n, y: keep * aim.y / a + (1 - keep) * group.y / n, z: keep * aim.z / a + (1 - keep) * group.z / n }
  }
  const heading = (Math.atan2(aim.x, aim.y) * 180 / Math.PI + 360) % 360
  // Kept clear of straight up, where a heading no longer means anything, and with the horizon in the frame's foot when they are low.
  const pitch = Math.min(70, Math.atan2(aim.z, Math.hypot(aim.x, aim.y)) * 180 / Math.PI)
  keyframes.push({ t, pose: { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: EYE_M, headingDeg: Math.round(heading * 10) / 10, pitchDeg: Math.round(pitch * 10) / 10, fovDeg: FOV_DEG } })
}
const pitches = keyframes.map(keyframe => (keyframe.pose as { pitchDeg: number }).pitchDeg)
console.log(`pitch ${Math.min(...pitches)}..${Math.max(...pitches)}, ${keyframes.length} keyframes, ${DURATION_S} s`)

const recording = {
  version: 1,
  id: "sky-test-lanterns",
  summaryTime: 20,
  tags: ["lantern", "misidentification"],
  description: {
    en: "A dozen sky lanterns let go from a garden, filmed by one of those letting them go: they rise past the eye, then drift off on the wind until they are a loose group of orange points far away, going out one by one.",
    fr: "Une douzaine de lanternes célestes lâchées d'un jardin, filmées par l'un de ceux qui les lâchent : elles montent devant lui, puis dérivent au vent jusqu'à n'être plus au loin qu'un groupe lâche de points orangés, qui s'éteignent un à un.",
    es: "Una docena de farolillos voladores soltados desde un jardín, filmados por uno de quienes los sueltan: suben ante él y luego derivan con el viento hasta ser a lo lejos un grupo suelto de puntos anaranjados, que se apagan uno a uno.",
    it: "Una dozzina di lanterne volanti lasciate andare da un giardino, filmate da uno di quelli che le lasciano andare: salgono davanti a lui, poi derivano col vento finché sono in lontananza un gruppo sparso di punti arancioni, che si spengono uno a uno."
  },
  time: { year: 2026, month: 1, day: 1, hour: 0, minute: 20, second: 0 },
  utcOffsetHours: -6,
  durationSeconds: DURATION_S,
  place: [{ lat: OBSERVER.lat, lng: OBSERVER.lng, name: OBSERVER.name }],
  instrument: "phone-landscape",
  // Filmed: a video frame is exposed for at most a thirtieth of a second.
  exposureSeconds: 1 / 30,
  weatherTrack: {
    keyframes: [{
      t: 0,
      weather: {
        cloudCover: { value: 0, basis: "assumed", rationale: why },
        cloudDarkness: 0,
        cloudBaseM: 2000,
        lowerCloudCover: 0,
        highCloudCover: 0,
        precipitationType: "none",
        precipitationIntensity: 0,
        windDirectionDeg: (launch.wind!.towardDeg + 180) % 360,
        windSpeed: launch.wind!.speedMS,
        storm: false
      }
    }]
  },
  timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
  observerTrack: { keyframes },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: {
    title: launch.title,
    bodies: [],
    lanterns: [{ ...launch, site: { ...launch.site, eastM: { value: launch.site.eastM, basis: "assumed", rationale: why } } }]
  }
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`→ ${OUT}`)
