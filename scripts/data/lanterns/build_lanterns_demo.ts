/**
 * Builds the sky lanterns demo: a dozen lanterns let go from a garden on a winter night, filmed with a phone from a crossroads with
 * traffic lights 1.6 km away, as a loose group of pale points drifting across the sky.
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
const DURATION_S = 60
const why = "Assumed: neither the place nor the date of the video this demo reproduces is known."

const launch: LanternLaunchJson = {
  id: "new-year",
  title: { en: "Sky lanterns", fr: "Lanternes célestes", es: "Farolillos voladores", it: "Lanterne volanti" },
  site: { eastM: -1300, northM: 1000, originElevationM: OBSERVER.elevationM },
  // Twelve let go about every 12 s, from five and a half to three minutes before the recording, each a little unlike the others.
  group: { count: 12, fromT: -330000, untilT: -198000, radiusM: 25, burnS: { min: 570, max: 750 }, insideExcessK: { min: 120, max: 180 }, seed: 7 },
  wind: { towardDeg: 100, speedMS: 1.5 },
  windAloft: { towardDeg: 30, speedMS: 4, atM: 500 },
  airTemperatureC: -12
}

// Where the group is at the start: what the camera looks at.
const points = SkyLantern.releasesOf(launch).map(release => SkyLantern.trajectory(launch, release)).map(path => {
  const at = path.find(point => point.t >= 0)!
  const ground = Math.hypot(at.x, at.y)
  return { azimuthDeg: (Math.atan2(at.x, at.y) * 180 / Math.PI + 360) % 360, altitudeDeg: Math.atan2(at.z - 1.6, ground) * 180 / Math.PI, distanceM: Math.hypot(ground, at.z) }
})
for (const point of points) console.log(`az ${point.azimuthDeg.toFixed(1)}  alt ${point.altitudeDeg.toFixed(1)}  ${(point.distanceM / 1000).toFixed(2)} km`)
const heading = Math.round(points.reduce((sum, point) => sum + point.azimuthDeg, 0) / points.length)
const pitch = Math.round(points.reduce((sum, point) => sum + point.altitudeDeg, 0) / points.length) - 8

const pose = { lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: 1.6, headingDeg: heading, pitchDeg: pitch, fovDeg: 60 }
const recording = {
  version: 1,
  id: "sky-test-lanterns",
  summaryTime: 20,
  tags: ["lantern", "misidentification"],
  description: {
    en: "A dozen sky lanterns let go from a garden 1.6 km away, seen from a crossroads: a loose group of orange points drifting silently.",
    fr: "Une douzaine de lanternes célestes lâchées d'un jardin à 1,6 km, vues d'un carrefour : un groupe lâche de points orangés qui dérive en silence.",
    es: "Una docena de farolillos voladores soltados desde un jardín a 1,6 km, vistos desde un cruce: un grupo suelto de puntos anaranjados que deriva en silencio.",
    it: "Una dozzina di lanterne volanti lasciate andare da un giardino a 1,6 km, viste da un incrocio: un gruppo sparso di punti arancioni che deriva in silenzio."
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
  observerTrack: { keyframes: [{ t: 0, pose }, { t: DURATION_S * 1000, pose: { ...pose, headingDeg: heading + 6 } }] },
  soundTrack: { keyframes: [] },
  decor: [],
  interpretation: {
    title: launch.title,
    bodies: [],
    lanterns: [{ ...launch, site: { ...launch.site, eastM: { value: launch.site.eastM, basis: "assumed", rationale: why } } }]
  }
}
writeFileSync(OUT, JSON.stringify(recording, null, 1) + "\n")
console.log(`heading ${heading}, pitch ${pitch} → ${OUT}`)
