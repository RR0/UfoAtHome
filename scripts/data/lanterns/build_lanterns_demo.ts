/**
 * Builds the sky lanterns demo: a dozen lanterns let go from a garden on a winter night, filmed with a phone from a crossroads with
 * traffic lights 1.6 km away, as a loose group of pale points drifting across the sky — over their whole flight, from the first let go
 * to the last gone out (a lantern burns some ten minutes), the phone held still on where they go: rising, carried off by the wind aloft,
 * and dying out one by one.
 *
 * Reproduces the look of a video posted on X on 27 October 2026 (https://x.com/EnigmasEnX/status/2115166526068449372) as "an invasion
 * flotilla": some ten points in a loose, irregular group above a snowy North American crossroads, steady, silent, drifting slowly, filmed
 * handheld past the traffic lights. Neither the place nor the date of that video is known.
 *
 * ASSUMED, all of it: the place (a crossroads with traffic lights in Fargo, North Dakota), the night (New Year's Eve 2025, 00:20, when
 * lanterns are let go), the garden they leave from, when each is let go, each one's flame and fuel cell (the common lantern within the
 * spread of what is sold), the winds and the cold. Computed by the engine: each lantern's flight and light, where it is from the observer.
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
  site: { eastM: -1300, northM: 1000, originElevationM: OBSERVER.elevationM },
  // Twelve let go about every 12 s, the first a minute before the recording starts (already up, so the sky is not empty), each a little
  // unlike the others.
  group: { count: 12, fromT: -60000, untilT: 72000, radiusM: 25, burnS: { min: 570, max: 750 }, insideExcessK: { min: 120, max: 180 }, seed: 7 },
  wind: { towardDeg: 100, speedMS: 1.5 },
  windAloft: { towardDeg: 30, speedMS: 4, atM: 500 },
  airTemperatureC: -12
}

// Every point of every flight while plainly lit and recorded: what the still phone has to hold in its frame, and when the last dies
// out. Plainly: a flame on its last embers, some kilometres off, is no longer a point anyone sees, and minutes of an empty sky after it
// would be the demo's, not the night's.
const SEEN_LIGHT = 0.25
const paths = SkyLantern.releasesOf(launch).map(release => SkyLantern.trajectory(launch, release))
const lit = paths.flatMap(path => path.filter(point => point.t >= 0 && point.light >= SEEN_LIGHT))
const DURATION_S = Math.ceil(Math.max(...lit.map(point => point.t)) / 1000) + 15
const seen = lit.map(at => {
  const ground = Math.hypot(at.x, at.y)
  return { azimuthDeg: (Math.atan2(at.x, at.y) * 180 / Math.PI + 360) % 360, altitudeDeg: Math.atan2(at.z - 1.6, ground) * 180 / Math.PI }
})
const span = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values) })
// Azimuths about their mean direction, which the flights may carry across north.
const toward = Math.atan2(seen.reduce((sum, point) => sum + Math.sin(point.azimuthDeg * Math.PI / 180), 0),
  seen.reduce((sum, point) => sum + Math.cos(point.azimuthDeg * Math.PI / 180), 0)) * 180 / Math.PI
const azimuths = span(seen.map(point => ((point.azimuthDeg - toward + 540) % 360) - 180)), altitudes = span(seen.map(point => point.altitudeDeg))
console.log(`azimuth ${azimuths.min.toFixed(1)}..${azimuths.max.toFixed(1)} about ${toward.toFixed(1)}, altitude ${altitudes.min.toFixed(1)}..${altitudes.max.toFixed(1)}, ${DURATION_S} s`)
const heading = Math.round((toward + (azimuths.min + azimuths.max) / 2 + 360) % 360)
// The frame, vertical field, as wide as the flights need with some sky round them, the ground's lights at its foot (a phone's 16:9).
const ASPECT = 16 / 9, MARGIN_DEG = 4
const horizontal = azimuths.max - azimuths.min + 2 * MARGIN_DEG
const fromWidth = 2 * Math.atan(Math.tan(horizontal * Math.PI / 360) / ASPECT) * 180 / Math.PI
const fov = Math.min(75, Math.round(Math.max(altitudes.max + 2 * MARGIN_DEG, fromWidth)))
const pitch = Math.round(Math.max(fov / 2 - MARGIN_DEG, (altitudes.min + altitudes.max) / 2))

const pose = { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: 1.6, headingDeg: heading, pitchDeg: pitch, fovDeg: fov }
const recording = {
  version: 1,
  id: "sky-test-lanterns",
  summaryTime: 20,
  tags: ["lantern", "misidentification"],
  description: {
    en: "A dozen sky lanterns let go from a garden 1.6 km away, seen from a crossroads: a loose group of orange points rising and drifting silently, until they go out one by one.",
    fr: "Une douzaine de lanternes célestes lâchées d'un jardin à 1,6 km, vues d'un carrefour : un groupe lâche de points orangés qui monte et dérive en silence, jusqu'à s'éteindre un à un.",
    es: "Una docena de farolillos voladores soltados desde un jardín a 1,6 km, vistos desde un cruce: un grupo suelto de puntos anaranjados que sube y deriva en silencio, hasta apagarse uno a uno.",
    it: "Una dozzina di lanterne volanti lasciate andare da un giardino a 1,6 km, viste da un incrocio: un gruppo sparso di punti arancioni che sale e deriva in silenzio, finché si spengono uno a uno."
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
  // Held still: a phone that followed them would take their drift away.
  observerTrack: { keyframes: [{ t: 0, pose }] },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: {
    title: launch.title,
    bodies: [],
    lanterns: [{ ...launch, site: { ...launch.site, eastM: { value: launch.site.eastM, basis: "assumed", rationale: why } } }]
  }
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`heading ${heading}, pitch ${pitch}, field ${fov} → ${OUT}`)
