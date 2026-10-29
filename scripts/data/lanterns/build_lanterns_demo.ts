/**
 * Builds the sky lanterns demo: a dozen lanterns let go at dusk from a rooftop terrace of Nimman, at the foot of Doi Suthep in Chiang Mai, on
 * the evening of Yi Peng, the festival when thousands are, filmed with a phone by one of those letting them go, a few steps from where they
 * leave the terrace, above the roofs round it:
 * over their whole flight, from the first let go to the last gone out (a lantern burns some ten minutes), the phone following the brightest
 * as a hand does, a little late: the first rising past the eye, the phone panning up from the hands that held it, then all carried off by
 * the wind aloft towards the mountain, dark against the last of the sunset, until they are a loose group of points far off, dying out one
 * by one.
 *
 * The group's look far off is that of a video posted on X on 27 October 2026 (https://x.com/EnigmasEnX/status/2115166526068449372) as "an
 * invasion flotilla": some ten points in a loose, irregular group, steady, silent, drifting slowly.
 *
 * ASSUMED, all of it: the terrace (12 m up), when each is let go, each one's flame and fuel cell (the common lantern within the spread of what is sold),
 * the winds (the north-east monsoon of November, light at the ground) and the warmth, and how the phone follows them. The evening is Yi
 * Peng 2025 (5 November). Computed by the engine: each lantern's flight and light, where it is from the observer, the dusk, the mountain.
 *
 * Writes ../../../public/demo-data/sky-test-lanterns.json. Run with `node --import tsx`.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SkyLantern } from "../../../src/engine/interpretation/SkyLantern.js"
import type { LanternLaunchJson } from "../../../src/engine/interpretation/SkyLantern.js"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-lanterns.json")
const OBSERVER = { lat: 18.7955, lng: 98.9555, elevationM: 320, name: "Chiang Mai, foot of Doi Suthep" }
const why = "Assumed: a rooftop terrace from which lanterns are let go on the evening of Yi Peng."
/** How high the terrace is above the street, m: four floors, above the roofs round it, which would hide the mountain. */
const TERRACE_M = 12

const launch: LanternLaunchJson = {
  id: "new-year",
  title: { en: "Sky lanterns", fr: "Lanternes célestes", es: "Farolillos voladores", it: "Lanterne volanti" },
  // A few steps downwind of the phone: what they leave from is in front of it.
  // The far end of the terrace, some eight metres west of the phone, towards the mountain.
  site: { eastM: -8, northM: 1, altitudeM: TERRACE_M, originElevationM: OBSERVER.elevationM },
  // The first let go two metres in front of the phone, by whoever stands beside the one filming: it climbs past the phone, which looks up
  // into its mouth, at its flame, the brightest thing of the night and the one that throws a ghost in a phone's picture.
  releases: [{ t: 0, eastM: 6, northM: -1, seed: 3 }],
  // Eleven more let go about every 8 s after it, across the terrace, each a little unlike the others. Each is held until it pulls upwards:
  // in air this warm, only the hotter of what is sold rises, and those let go are those.
  group: { count: 11, fromT: 8000, untilT: 90000, radiusM: 3, burnS: { min: 570, max: 750 }, insideExcessK: { min: 145, max: 185 }, seed: 7 },
  // A light breeze at the ground, from the north-east monsoon of the dry season, stronger aloft: they climb slowly in the warm air and
  // drift off towards the mountain, low over it.
  wind: { towardDeg: 250, speedMS: 1.2 },
  windAloft: { towardDeg: 235, speedMS: 3.5, atM: 500 },
  airTemperatureC: 24
}

// Every point of every flight while plainly lit: what the phone follows, and when the last dies out. Plainly: a flame on its last embers,
// some kilometres off, is no longer a point anyone sees, and minutes of an empty sky after it would be the demo's, not the night's.
const SEEN_LIGHT = 0.25
const EYE_M = TERRACE_M + 1.6
const paths = SkyLantern.releasesOf(launch).map(release => SkyLantern.trajectory(launch, release))
const lit = paths.flatMap(path => path.filter(point => point.t >= 0 && point.light >= SEEN_LIGHT))
const DURATION_S = Math.ceil(Math.max(...lit.map(point => point.t)) / 1000) + 15

// Where the phone points: at the group, every second, as a hand follows it — late, never quite on it. The group is the mean direction of
// its lit lanterns, each a unit vector from the eye weighed by the square of the light it sends there (that light as the inverse square of
// its distance): the eye goes to the brightest, and a lantern climbing past the phone holds it until it is up and away, rather than those
// still on the lawn; when they are alike, it is their mean.
const STEP_MS = 1000, LAG_S = 2.5, FOV_DEG = 62, MOST_PITCH_DEG = 28
const groupAt = (t: number) => {
  const sum = { x: 0, y: 0, z: 0 }
  for (const point of lit) {
    if (Math.abs(point.t - t) > SkyLantern.SAMPLE_MS / 2) continue
    const d = Math.hypot(point.x, point.y, point.z - EYE_M)
    const weight = (point.light / (d * d)) ** 2 / d
    sum.x += point.x * weight; sum.y += point.y * weight; sum.z += (point.z - EYE_M) * weight
  }
  return sum.x === 0 && sum.y === 0 && sum.z === 0 ? undefined : sum
}
const keyframes: { t: number, pose: object }[] = []
// Before the first leaves the ground, the phone is on it, held a little below the horizon.
const first = launch.releases![0]
let aim = { x: launch.site.eastM + first.eastM!, y: launch.site.northM + first.northM!, z: TERRACE_M + 0.5 - EYE_M }
const keep = Math.exp(-STEP_MS / 1000 / LAG_S)
for (let t = 0; t <= DURATION_S * 1000; t += STEP_MS) {
  const group = groupAt(t)
  if (group) {
    const n = Math.hypot(group.x, group.y, group.z), a = Math.hypot(aim.x, aim.y, aim.z)
    aim = { x: keep * aim.x / a + (1 - keep) * group.x / n, y: keep * aim.y / a + (1 - keep) * group.y / n, z: keep * aim.z / a + (1 - keep) * group.z / n }
  }
  const heading = (Math.atan2(aim.x, aim.y) * 180 / Math.PI + 360) % 360
  // Never raised so far that the mountain leaves the frame's foot: whoever films keeps the place in the picture, the lanterns high in it.
  const pitch = Math.min(MOST_PITCH_DEG, Math.atan2(aim.z, Math.hypot(aim.x, aim.y)) * 180 / Math.PI)
  keyframes.push({ t, pose: { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: TERRACE_M, headingDeg: Math.round(heading * 10) / 10, pitchDeg: Math.round(pitch * 10) / 10, fovDeg: FOV_DEG } })
}
const pitches = keyframes.map(keyframe => (keyframe.pose as { pitchDeg: number }).pitchDeg)
console.log(`pitch ${Math.min(...pitches)}..${Math.max(...pitches)}, ${keyframes.length} keyframes, ${DURATION_S} s`)

const recording = {
  version: 1,
  id: "sky-test-lanterns",
  // The picture the demo is summed up by: the group above the mountain, against the last of the dusk.
  summaryTime: 115,
  tags: ["lantern", "misidentification"],
  description: {
    en: "A dozen sky lanterns let go at dusk on the evening of Yi Peng, at the foot of Doi Suthep in Chiang Mai, filmed by one of those letting them go: they rise past the eye, then drift off towards the mountain until they are a loose group of orange points far away, going out one by one.",
    fr: "Une douzaine de lanternes célestes lâchées au crépuscule le soir de Yi Peng, au pied du Doi Suthep à Chiang Mai, filmées par l'un de ceux qui les lâchent : elles montent devant lui, puis dérivent vers la montagne jusqu'à n'être plus au loin qu'un groupe lâche de points orangés, qui s'éteignent un à un.",
    es: "Una docena de farolillos voladores soltados al anochecer la noche de Yi Peng, al pie del Doi Suthep en Chiang Mai, filmados por uno de quienes los sueltan: suben ante él y luego derivan hacia la montaña hasta ser a lo lejos un grupo suelto de puntos anaranjados, que se apagan uno a uno.",
    it: "Una dozzina di lanterne volanti lasciate andare al crepuscolo la sera di Yi Peng, ai piedi del Doi Suthep a Chiang Mai, filmate da uno di quelli che le lasciano andare: salgono davanti a lui, poi derivano verso la montagna finché sono in lontananza un gruppo sparso di punti arancioni, che si spengono uno a uno."
  },
  // Yi Peng 2025, some forty minutes after sunset (17:40): the last of the light in the west, behind the mountain.
  time: { year: 2025, month: 11, day: 5, hour: 18, minute: 20, second: 0 },
  utcOffsetHours: 7,
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
  // The building whose roof the terrace is: the phone and the lanterns on it, the street four floors down.
  decor: [{
    id: "terrace", kind: "building", eastM: -3, northM: 0, headingDeg: 0, floors: 4, lit: true,
    title: { en: "Rooftop terrace", fr: "Toit-terrasse", es: "Azotea", it: "Terrazza sul tetto" },
    sizeM: { widthM: 22, lengthM: 14, heightM: TERRACE_M }
  }],
  interpretation: {
    title: launch.title,
    bodies: [],
    lanterns: [{ ...launch, site: { ...launch.site, eastM: { value: launch.site.eastM, basis: "assumed", rationale: why } } }]
  }
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`→ ${OUT}`)
