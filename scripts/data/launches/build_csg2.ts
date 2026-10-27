/**
 * Builds the CSG-2 case: one Falcon 9 upper stage seen twice. First climbing past the Bahamas just after sunset on 31 January 2022,
 * from Nassau, by an observer this case assumes (from Orlando, at first chosen, the engine finds the plume too low in a sky still too
 * bright to be seen: the Sun only 2 to 3 degrees down; from Nassau, 200 km east of the stage's path, it is 5 degrees down and the plume
 * climbs to 30 degrees, between the eye and the set Sun); then, an hour and a half later, braking out of orbit over Kansas and venting its
 * tanks, as Ron Lee saw it from Falcon, Colorado, and reported it on SeeSat-L.
 *
 * Sources:
 * - The launch: COSMO-SkyMed Second Generation FM2 (CSG-2), Falcon 9 from SLC-40, Cape Canaveral, 31 January 2022 at 23:11:14 UTC
 *   (18:11 EST), southbound into a sun-synchronous orbit, with a dogleg to avoid overflying Florida (Space.com, NextSpaceflight).
 * - CSG-2's first elements from Space-Track (51444, 2022-008A), as Laurent Chabin's archive keeps them: the stage's orbit until its
 *   braking burn, which it shared with its payload. Marco Langbroek's prelaunch elset (SeeSat-L, 30 January 2022), which Ron Lee used
 *   to expect the stage, said the same sky to two minutes; his note gives the sequence: a dogleg past Cuba and the Bahamas, an hour's
 *   coast, a 3-second restart near the ascending node, the payload's release, the deorbit area in the Pacific.
 * - Ron Lee, SeeSat-L, 31 January 2022, "Falcon 9 second stage fuel dump observed": "Around 0049 UT [...] Falcon, Colorado USA. Due
 *   east. It may have been visible sooner but I just walked outside. It continued but fainter as it went south. It was roughly two
 *   minutes early on Marco's elset. I knew the timing and sky location would be the same with a one day delay." (The launch slipped
 *   from 30 to 31 January; the date he first gave was corrected to 1 February, 00:49 UT.)
 * - Bob Christy, SeeSat-L, 1 February 2022: it fits the CSG-2 elements from Space-Track; the stage had completed its retro-fire and
 *   hit the atmosphere near 27° S, 114° W at about 01:05 UTC.
 * - Cees Bassa, SeeSat-L, 1 February 2022: photographs of the dump with very distinct spirals, from Oklahoma and Texas among others.
 *
 * ASSUMED: the observer in Nassau (no account of the ascent from there was found); the ascent's path, typical of a Falcon 9 with a
 * southbound dogleg; the instant and size of the braking burn, chosen so that the stage reaches the air at 01:05 UTC; the vents, their
 * speed, flow and the stage's spin, chosen on the photographs of the NROL-69 spiral over Europe (24 March 2025: Charente Libre,
 * Reporterre, L'Actuaire d'Isbergues), the best photographed of them. Computed by the engine: the Sun, the Earth's shadow,
 * the flight of the exhaust and its light.
 *
 * Writes ../../../public/demo-data/{observer-csg2-nassau,observer-csg2-falcon,observer-csg2-oklahoma,case-csg2}.json. Run with `node --import tsx`.
 */
import * as sat from "satellite.js"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data")
/** CSG-2's first elements from Space-Track (51444, 2022-008A, epoch 1 February 2022 11:54 UTC), as Laurent Chabin's archive keeps them. */
const TLE = [
  "1 51444U 22008A   22032.49603126 -.00167004  00000-0 -21508-1 0  9997",
  "2 51444  97.8922 218.1266 0005428 142.3209 301.5218 14.82108802    74"
]
/** The elements are the satellite's own and of the instant they say: no day to shift, no minute to correct. */
const ELSET_LAUNCH = Date.UTC(2022, 0, 31, 23, 11, 14)
const LAUNCH = Date.UTC(2022, 0, 31, 23, 11, 14)
const EARLY_MS = 0
const PAD = { lat: 28.5618, lng: -80.5772 }
const NASSAU = { lat: 25.0480, lng: -77.3554, elevationM: 10, name: "Nassau, Bahamas" }
const FALCON = { lat: 38.9331, lng: -104.6086, elevationM: 2100, name: "Falcon, Colorado" }
const OKLAHOMA_CITY = { lat: 35.4676, lng: -97.5164, elevationM: 370, name: "Oklahoma City, Oklahoma" }

/** A place an observer stands at. */
interface Place {
  lat: number
  lng: number
  elevationM: number
  name: string
}

/** What a view of the stage's end has of its own: its file's key, its observer, its words. */
interface DumpView {
  key: string
  observer: { id: string; title: string | Record<string, string> }
  tags: string[]
  sky: string
  description: Record<string, string>
}
/** The recordings: the ascent seen from Nassau, the dump seen from Falcon. */
const NASSAU_START = Date.UTC(2022, 0, 31, 23, 13, 0)
const NASSAU_S = 480
const FALCON_START = Date.UTC(2022, 1, 1, 0, 47, 30)
const FALCON_S = 480
/** The braking burn (its middle) and the vents, UTC ms; where the stage meets the air (Bob Christy). */
const BURN_AT = Date.UTC(2022, 1, 1, 0, 46, 0)
const VENTS = { from: Date.UTC(2022, 1, 1, 0, 46, 30), until: Date.UTC(2022, 1, 1, 0, 51, 30) }
const REENTRY = { at: Date.UTC(2022, 1, 1, 1, 5, 0), lat: -27, heightKm: 100 }
/** A nearly empty stage under a throttled Merlin Vacuum: what turns a speed change into seconds of burn. */
const STAGE_KG = 6000
const THROTTLED_KN = 560
const THROTTLED_KG_PER_S = 164

/** Seconds after liftoff, kilometres downrange, kilometres up: a typical Falcon 9 ascent, the second stage burning from 155 to 510 s. */
const ASCENT = [
  [0, 0, 0], [30, 0.5, 3], [60, 5, 11], [90, 18, 27], [120, 42, 47], [155, 78, 68], [180, 110, 82],
  [240, 270, 112], [300, 470, 134], [360, 725, 154], [420, 1010, 169], [480, 1320, 180], [510, 1480, 185]
] as const
const SECOND_STAGE = { from: 155, until: 510 }
/** The heading of the ascent, degrees: south-southeast along the coast, then turning south-southwest into the orbit's plane past Cuba. */
const DOGLEG = { from: 160, to: 192 }

const ASCENT_RATIONALE = "No path of the ascent is published beyond its warning areas: assumed to leave Launch Complex 40 south-southeast along the coast and turn south-southwest between the Bahamas and Cuba into the plane of Marco Langbroek's elset (the 'dogleg' that avoids overflying Florida), with the downrange distance and height a Falcon 9 second stage typically has by that second."
const ORBIT_RATIONALE = "CSG-2's own first elements from Space-Track (2022-008A, epoch 1 February 2022 11:54 UTC, kept in Laurent Chabin's archive), which Bob Christy found the dump to fit (SeeSat-L): the stage flew with its payload until its braking burn. Propagated with SGP4 back to the burn, then as a free orbit slowed by it."
const BURN_RATIONALE = "Bob Christy (SeeSat-L): by 00:49 UTC the stage had completed its retro-fire, and it hit the atmosphere near 27 S, 114 W at about 01:05 UTC. The burn's instant (00:46 UTC) is assumed; its size is the one that brings the stage down to 100 km where its track crosses 27 S, a few seconds of the throttled Merlin Vacuum with the stage turned round so that its exhaust leaves ahead of it."
const VENT_RATIONALE = "Cees Bassa (SeeSat-L) relayed photographs of very distinct spirals: the tanks vented while the stage spun. As chosen on the photographs of the NROL-69 spiral over Europe (24 March 2025), the best photographed of them: two opposite vents across the motion, 0.7 km/s, a tenth freezing, each puff spreading at 0.15 km/s, ice of 0.1 micrometre (blue), a turn of the stage in a minute and a half; but 20 kg/s each for five minutes, six tonnes: CSG-2 weighs some 2.2 tonnes, far less than a Falcon 9 puts into that orbit, so much propellant was left to dump. All assumed."

const assumed = <T>(value: T, rationale: string) => ({ value, basis: "assumed", rationale })
const stated = <T>(value: T, rationale: string) => ({ value, basis: "stated", rationale })

/** The upper stage, from the elset and, after the braking burn, as a free orbit. Positions ECI (TEME) km, in the elset's own time. */
class Csg2Stage {
  private readonly record = sat.twoline2satrec(TLE[0], TLE[1])
  private afterBurn: number[][] = []
  readonly brakeKmPerS: number

  constructor() {
    this.brakeKmPerS = this.solveBrake()
    this.afterBurn = this.flyAfterBurn(this.brakeKmPerS)
  }

  /** The instant of the elset whose sky the stage is in at `ms`: a day earlier, two minutes on. */
  private static elsetMs(ms: number): number {
    return ms - (LAUNCH - ELSET_LAUNCH) + EARLY_MS
  }

  /** Where the stage is at `ms` (UTC), latitude, longitude, km up: the Earth turned as it was a day earlier, when the elset's sky was this one. */
  at(ms: number): { lat: number; lng: number; altitudeKm: number; eci: number[] } {
    const eci = ms <= BURN_AT ? this.sgp4(ms) : this.afterBurn[Math.min(this.afterBurn.length - 1, Math.round((ms - BURN_AT) / 1000))]
    const g = sat.eciToGeodetic({ x: eci[0], y: eci[1], z: eci[2] }, sat.gstime(new Date(ms - (LAUNCH - ELSET_LAUNCH))))
    return { lat: sat.degreesLat(g.latitude), lng: sat.degreesLong(g.longitude), altitudeKm: g.height, eci }
  }

  /** Where it is in an observer's sky at `ms`, degrees. */
  lookAt(ms: number, observer: { lat: number; lng: number; elevationM: number }): { azimuthDeg: number; elevationDeg: number } {
    const { eci } = this.at(ms)
    const gmst = sat.gstime(new Date(ms - (LAUNCH - ELSET_LAUNCH)))
    const look = sat.ecfToLookAngles(
      { latitude: sat.degreesToRadians(observer.lat), longitude: sat.degreesToRadians(observer.lng), height: observer.elevationM / 1000 },
      sat.eciToEcf({ x: eci[0], y: eci[1], z: eci[2] }, gmst))
    return { azimuthDeg: sat.radiansToDegrees(look.azimuth), elevationDeg: sat.radiansToDegrees(look.elevation) }
  }

  private sgp4(ms: number): number[] {
    const state = sat.propagate(this.record, new Date(Csg2Stage.elsetMs(ms))) as { position: sat.EciVec3<number>; velocity: sat.EciVec3<number> }
    return [state.position.x, state.position.y, state.position.z, state.velocity.x, state.velocity.y, state.velocity.z]
  }

  /** The flight after a braking burn of `brakeKmPerS`, a state every second from BURN_AT to past the re-entry. */
  private flyAfterBurn(brakeKmPerS: number): number[][] {
    const start = this.sgp4(BURN_AT)
    const speed = Math.hypot(start[3], start[4], start[5])
    let s = [...start.slice(0, 3), ...start.slice(3).map(c => c * (1 - brakeKmPerS / speed))]
    const states: number[][] = []
    for (let t = 0; t <= (REENTRY.at - BURN_AT) / 1000 + 600; t++) {
      states.push(s)
      s = Csg2Stage.rk4(s, 1)
    }
    return states
  }

  /**
   * The braking that brings the stage down to REENTRY.heightKm where its track crosses REENTRY.lat: Bob Christy gives the place, and the
   * hour only as "about". Halved until it is found to a metre per second.
   */
  private solveBrake(): number {
    let low = 0.01
    let high = 2
    while (high - low > 0.001) {
      const brake = (low + high) / 2
      const states = this.flyAfterBurn(brake)
      const crossing = states.findIndex((eci, i) => this.latitudeAt(eci, BURN_AT + i * 1000) <= REENTRY.lat)
      const eci = states[crossing < 0 ? states.length - 1 : crossing]
      const height = Math.hypot(eci[0], eci[1], eci[2]) - 6371
      if (height > REENTRY.heightKm) low = brake
      else high = brake
    }
    return (low + high) / 2
  }

  private latitudeAt(eci: number[], ms: number): number {
    return sat.degreesLat(sat.eciToGeodetic({ x: eci[0], y: eci[1], z: eci[2] }, sat.gstime(new Date(ms - (LAUNCH - ELSET_LAUNCH)))).latitude)
  }

  /** Two bodies and the Earth's oblateness (J2). */
  private static derivative(s: number[]): number[] {
    const [x, y, z] = s
    const mu = 398600.4418, j2 = 1.08263e-3, re = 6378.137
    const r2 = x * x + y * y + z * z
    const r = Math.sqrt(r2)
    const k = -mu / (r2 * r)
    const f = 1.5 * j2 * mu * re * re / (r2 * r2 * r)
    const zz = 5 * z * z / r2
    return [s[3], s[4], s[5], k * x + f * x * (zz - 1), k * y + f * y * (zz - 1), k * z + f * z * (zz - 3)]
  }

  private static rk4(s: number[], h: number): number[] {
    const add = (a: number[], b: number[], k: number) => a.map((c, i) => c + b[i] * k)
    const k1 = Csg2Stage.derivative(s)
    const k2 = Csg2Stage.derivative(add(s, k1, h / 2))
    const k3 = Csg2Stage.derivative(add(s, k2, h / 2))
    const k4 = Csg2Stage.derivative(add(s, k3, h))
    return s.map((c, i) => c + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
  }
}

class Csg2Case {
  private readonly stage = new Csg2Stage()

  /** The vehicle and its engine, as both recordings state them. */
  private static readonly VEHICLE = {
    name: "Falcon 9", mission: "COSMO-SkyMed Second Generation FM2 (CSG-2)",
    engine: {
      thrustKN: stated(934, "SpaceX: a Merlin Vacuum's thrust in vacuum, 934 kN (the Falcon 9 second stage has one)."),
      specificImpulseS: stated(348, "SpaceX: a Merlin Vacuum's specific impulse in vacuum, 348 s."),
      propellant: stated("rp1-lox", "The Falcon 9 burns RP-1 kerosene and liquid oxygen.")
    }
  }
  private static readonly TITLE = {
    en: "Upper stage of the CSG-2 launch", fr: "Deuxième étage du lancement de CSG-2",
    es: "Segunda etapa del lanzamiento de CSG-2", it: "Secondo stadio del lancio di CSG-2"
  }

  /** The ascent, as a great circle from the pad whose heading turns with the distance flown (the dogleg). */
  private ascentAt(seconds: number): { lat: number; lng: number; altitudeKm: number } {
    const table = ASCENT
    let i = 0
    while (i < table.length - 2 && table[i + 1][0] < seconds) i++
    const [t0, d0, h0] = table[i]
    const [t1, d1, h1] = table[i + 1]
    const f = Math.min(1, Math.max(0, (seconds - t0) / (t1 - t0)))
    const downrange = d0 + (d1 - d0) * f
    // Walked in steps of 10 km, each on the heading of its own distance.
    let lat = PAD.lat * Math.PI / 180
    let lng = PAD.lng * Math.PI / 180
    const end = table[table.length - 1][1]
    for (let flown = 0; flown < downrange; flown += 10) {
      const step = Math.min(10, downrange - flown) / 6371
      const heading = (DOGLEG.from + (DOGLEG.to - DOGLEG.from) * Math.min(1, flown / end)) * Math.PI / 180
      const lat2 = Math.asin(Math.sin(lat) * Math.cos(step) + Math.cos(lat) * Math.sin(step) * Math.cos(heading))
      lng += Math.atan2(Math.sin(heading) * Math.sin(step) * Math.cos(lat), Math.cos(step) - Math.sin(lat) * Math.sin(lat2))
      lat = lat2
    }
    return { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI, altitudeKm: h0 + (h1 - h0) * f }
  }

  private static look(observer: { lat: number; lng: number; elevationM: number }, point: { lat: number; lng: number; altitudeKm: number }) {
    const R = 6371
    const [la1, lo1, la2, lo2] = [observer.lat, observer.lng, point.lat, point.lng].map(v => v * Math.PI / 180)
    const d = Math.acos(Math.min(1, Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(lo2 - lo1)))
    const az = (Math.atan2(Math.sin(lo2 - lo1) * Math.cos(la2), Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(lo2 - lo1)) * 180 / Math.PI + 360) % 360
    const r = R + point.altitudeKm
    const el = Math.atan2(r * Math.cos(d) - R, r * Math.sin(d)) * 180 / Math.PI
    return { azimuthDeg: az, elevationDeg: el }
  }

  private static time(ms: number, offsetHours: number) {
    const local = new Date(ms + offsetHours * 3600000)
    return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(), hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds() }
  }

  private static clearSky(rationale: string) {
    const clear = assumed(0, rationale)
    return {
      keyframes: [{
        t: 0, weather: {
          cloudCover: clear, cloudDarkness: 0, cloudBaseM: 2000, lowerCloudCover: 0, highCloudCover: 0,
          precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0, storm: false
        }
      }]
    }
  }

  nassau(): object {
    const launchT = LAUNCH - NASSAU_START
    const track = ASCENT.map(([seconds]) => {
      const at = this.ascentAt(seconds)
      return {
        t: launchT + seconds * 1000,
        lat: assumed(Number(at.lat.toFixed(4)), ASCENT_RATIONALE),
        lng: assumed(Number(at.lng.toFixed(4)), ASCENT_RATIONALE),
        altitudeKm: assumed(at.altitudeKm, ASCENT_RATIONALE)
      }
    })
    const burn = "The second stage's single vacuum engine lights when the first stage's stop, at about T+2:35, and burns until the parking orbit at about T+8:30: typical of a Falcon 9, not stated for this flight. The first stage's own exhaust, lower and in thicker air, is left out."
    const observerTrack = []
    for (let s = 0; s <= NASSAU_S; s += 10) {
      const look = Csg2Case.look(NASSAU, this.ascentAt(Math.max(0, Math.min(510, (NASSAU_START + s * 1000 - LAUNCH) / 1000))))
      observerTrack.push({ t: s * 1000, pose: { lat: NASSAU.lat, lng: NASSAU.lng, elevationM: NASSAU.elevationM, headingDeg: Number(look.azimuthDeg.toFixed(1)), pitchDeg: Number(Math.max(8, look.elevationDeg + 4).toFixed(1)), fovDeg: 70 } })
    }
    return {
      version: 1,
      id: "observer-csg2-nassau",
      image: "https://ufoathome.org/demo-data/share/csg2-nassau.jpg",
      observer: { id: "csg2-nassau", title: { en: "Observer in Nassau (assumed)", fr: "Observateur à Nassau (supposé)", es: "Observador en Nassau (supuesto)", it: "Osservatore a Nassau (supposto)" } },
      tags: ["rocket launch", "space jellyfish", "twilight phenomenon", "Falcon 9", "assumed observer"],
      // The card is taken three minutes in, when the plume is highest and brightest.
      summaryTime: 180,
      description: {
        en: "The CSG-2 launch as an observer in Nassau would have seen it, 31 January 2022 just after sunset: a Falcon 9 from Cape Canaveral flying south past the Bahamas, 200 km to the west, its second stage burning 100 to 185 km up where the Sun still shines, between the eye and the set Sun. No account from there was found: this observer is assumed, put where the physics says the plume could be seen (from Orlando the sky was still too bright and the plume too low), and what it shows is what the engine computes, the Sun, the Earth's shadow, the spreading and the light. The same stage is seen an hour and a half later from Colorado (see the case).",
        fr: "Le lancement de CSG-2 tel qu'un observateur à Nassau l'aurait vu, le 31 janvier 2022 juste après le coucher du Soleil : un Falcon 9 parti de Cap Canaveral passant vers le sud le long des Bahamas, à 200 km à l'ouest, son deuxième étage brûlant entre 100 et 185 km d'altitude, là où le Soleil brille encore, entre l'œil et le Soleil couché. Aucun compte rendu n'a été trouvé de là : cet observateur est supposé, placé là où la physique dit que le panache pouvait se voir (d'Orlando le ciel était encore trop clair et le panache trop bas), et ce qu'il montre est ce que le moteur calcule, le Soleil, l'ombre de la Terre, l'étalement et la lumière. Le même étage est vu une heure et demie plus tard depuis le Colorado (voir le dossier).",
        es: "El lanzamiento de CSG-2 tal como lo habría visto un observador en Nassau, el 31 de enero de 2022 justo después de la puesta del Sol: un Falcon 9 salido de Cabo Cañaveral pasando hacia el sur junto a las Bahamas, a 200 km al oeste, su segunda etapa ardiendo entre 100 y 185 km de altura, donde el Sol aún brilla, entre el ojo y el Sol puesto. No se encontró ningún relato desde allí: este observador se supone, situado donde la física dice que la estela podía verse (desde Orlando el cielo era aún demasiado claro y la estela demasiado baja), y lo que muestra es lo que calcula el motor, el Sol, la sombra de la Tierra, la expansión y la luz. La misma etapa se ve hora y media después desde Colorado (véase el caso).",
        it: "Il lancio di CSG-2 come l'avrebbe visto un osservatore a Nassau, il 31 gennaio 2022 subito dopo il tramonto: un Falcon 9 partito da Cape Canaveral che passa verso sud lungo le Bahamas, 200 km a ovest, il secondo stadio che brucia tra 100 e 185 km di quota, dove il Sole splende ancora, tra l'occhio e il Sole tramontato. Non è stato trovato alcun resoconto da lì: questo osservatore è supposto, posto dove la fisica dice che la scia poteva vedersi (da Orlando il cielo era ancora troppo chiaro e la scia troppo bassa), e ciò che mostra è ciò che il motore calcola, il Sole, l'ombra della Terra, l'espansione e la luce. Lo stesso stadio è visto un'ora e mezza dopo dal Colorado (vedi il caso)."
      },
      time: Csg2Case.time(NASSAU_START, -5),
      utcOffsetHours: -5,
      durationSeconds: NASSAU_S,
      place: [{ lat: NASSAU.lat, lng: NASSAU.lng, name: NASSAU.name }],
      weatherTrack: Csg2Case.clearSky("No account from Nassau: no cloud is stated, a clear sky is assumed."),
      timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
      observerTrack: { keyframes: observerTrack },
      soundTrack: { keyframes: [] },
      decor: [],
      skyEvents: {
        launches: [{
          id: "csg-2", title: Csg2Case.TITLE, vehicle: Csg2Case.VEHICLE, track,
          burnFromT: assumed(launchT + SECOND_STAGE.from * 1000, burn),
          burnUntilT: assumed(launchT + SECOND_STAGE.until * 1000, burn)
        }]
      }
    }
  }

  falcon(): object {
    const said = "Ron Lee, SeeSat-L, 31 January 2022: 'Around 0049 UT [...] Falcon, Colorado USA. Due east. It may have been visible sooner but I just walked outside. It continued but fainter as it went south.'"
    return this.dump(FALCON, -7, {
      key: "falcon",
      observer: { id: "LeeRon", title: "Ron Lee" },
      tags: ["rocket launch", "fuel dump", "spiral", "Falcon 9", "deorbit", "SeeSat-L"],
      sky: `${said} He saw it: no cloud is stated where he looked, a clear sky is assumed.`,
      description: {
        en: `The same CSG-2 upper stage an hour and a half after its launch, 1 February 2022 at 00:49 UTC (17:49 in Colorado, in twilight), as Ron Lee saw it from Falcon, Colorado, and reported it on SeeSat-L: "Due east. It may have been visible sooner but I just walked outside. It continued but fainter as it went south." The stage, 620 km over Kansas, had just braked out of orbit and was venting its tanks while it spun; it hit the air over the Pacific at 01:05 UTC (Bob Christy). The orbit is CSG-2's own, from Space-Track; the burn, the vents and the spin are assumed.`,
        fr: `Le même deuxième étage de CSG-2 une heure et demie après son lancement, le 1er février 2022 à 0 h 49 UTC (17 h 49 au Colorado, au crépuscule), tel que Ron Lee l'a vu depuis Falcon (Colorado) et l'a rapporté sur SeeSat-L : « Plein est. Il était peut-être visible plus tôt mais je venais de sortir. Il a continué, plus faible, en allant vers le sud. » L'étage, à 620 km au-dessus du Kansas, venait de freiner pour quitter son orbite et vidangeait ses réservoirs en tournant ; il a atteint l'air au-dessus du Pacifique à 1 h 05 UTC (Bob Christy). L'orbite est celle de CSG-2 elle-même, d'après Space-Track ; le freinage, les vidanges et la rotation sont supposés.`,
        es: `La misma segunda etapa de CSG-2 hora y media después de su lanzamiento, el 1 de febrero de 2022 a las 00:49 UTC (17:49 en Colorado, en el crepúsculo), tal como Ron Lee la vio desde Falcon (Colorado) y la contó en SeeSat-L: «Al este. Quizá era visible antes pero acababa de salir. Siguió, más débil, yendo hacia el sur.» La etapa, a 620 km sobre Kansas, acababa de frenar para salir de su órbita y purgaba sus depósitos mientras giraba; alcanzó el aire sobre el Pacífico a las 01:05 UTC (Bob Christy). La órbita es la de CSG-2 misma, según Space-Track; el frenado, las purgas y el giro se suponen.`,
        it: `Lo stesso secondo stadio di CSG-2 un'ora e mezza dopo il lancio, il 1° febbraio 2022 alle 00:49 UTC (17:49 in Colorado, nel crepuscolo), come Ron Lee lo vide da Falcon (Colorado) e lo riferì su SeeSat-L: «A est. Forse era visibile prima ma ero appena uscito. È continuato, più debole, andando verso sud.» Lo stadio, a 620 km sopra il Kansas, aveva appena frenato per lasciare l'orbita e scaricava i serbatoi ruotando; raggiunse l'aria sopra il Pacifico alle 01:05 UTC (Bob Christy). L'orbita è quella di CSG-2 stesso, secondo Space-Track; la frenata, gli scarichi e la rotazione sono supposti.`
      }
    })
  }

  /**
   * The same end seen from further east, where the night was further on (the Sun 11 degrees down instead of 6) and the spiral stood out
   * far better: from Oklahoma, where some of the photographs of it Cees Bassa relayed were taken. The observer is assumed. (Wichita, nearer
   * the stage's track, showed it larger still and face on, too much like this view to keep both.)
   */
  oklahoma(): object {
    return this.dump(OKLAHOMA_CITY, -6, {
      key: "oklahoma",
      observer: { id: "csg2-oklahoma", title: { en: "Observer in Oklahoma City (assumed)", fr: "Observateur à Oklahoma City (supposé)", es: "Observador en Oklahoma City (supuesto)", it: "Osservatore a Oklahoma City (supposto)" } },
      tags: ["rocket launch", "fuel dump", "spiral", "Falcon 9", "deorbit", "assumed observer"],
      sky: "Photographs of the spiral were taken in Oklahoma (relayed by Cees Bassa on SeeSat-L): no cloud is stated, a clear sky is assumed.",
      description: {
        en: "The CSG-2 upper stage braking out of orbit and venting its tanks, 1 February 2022 at 00:49 UTC (18:49 in Oklahoma), as an observer in Oklahoma City would have seen it. Photographs of the spiral were taken in Oklahoma that evening (relayed by Cees Bassa on SeeSat-L), but no account from there was found: this observer is assumed. The night is further on than in Colorado, where Ron Lee saw a faint cloud: the Sun is 11 degrees down instead of 6, and the same spiral stands out bright against a dark sky, seen at a slant. The orbit is CSG-2's own, from Space-Track; the burn, the vents and the spin are assumed.",
        fr: "Le deuxième étage de CSG-2 freinant pour quitter son orbite et vidangeant ses réservoirs, le 1er février 2022 à 0 h 49 UTC (18 h 49 en Oklahoma), tel qu'un observateur à Oklahoma City l'aurait vu. Des photographies de la spirale ont été prises en Oklahoma ce soir-là (relayées par Cees Bassa sur SeeSat-L), mais aucun compte rendu n'a été trouvé de là : cet observateur est supposé. La nuit y est plus avancée qu'au Colorado, où Ron Lee a vu un nuage pâle : le Soleil est à 11 degrés sous l'horizon au lieu de 6, et la même spirale ressort, lumineuse, sur un ciel sombre, vue en biais. L'orbite est celle de CSG-2 elle-même, d'après Space-Track ; le freinage, les vidanges et la rotation sont supposés.",
        es: "La segunda etapa de CSG-2 frenando para salir de su órbita y purgando sus depósitos, el 1 de febrero de 2022 a las 00:49 UTC (18:49 en Oklahoma), tal como la habría visto un observador en Oklahoma City. Esa tarde se tomaron fotografías de la espiral en Oklahoma (difundidas por Cees Bassa en SeeSat-L), pero no se encontró ningún relato desde allí: este observador se supone. La noche está más avanzada que en Colorado, donde Ron Lee vio una nube pálida: el Sol está 11 grados bajo el horizonte en lugar de 6, y la misma espiral destaca, luminosa, sobre un cielo oscuro, vista de sesgo. La órbita es la de CSG-2 misma, según Space-Track; el frenado, las purgas y el giro se suponen.",
        it: "Il secondo stadio di CSG-2 che frena per lasciare l'orbita e scarica i serbatoi, il 1° febbraio 2022 alle 00:49 UTC (18:49 in Oklahoma), come l'avrebbe visto un osservatore a Oklahoma City. Quella sera in Oklahoma furono scattate fotografie della spirale (diffuse da Cees Bassa su SeeSat-L), ma non è stato trovato alcun resoconto da lì: questo osservatore è supposto. La notte è più avanzata che in Colorado, dove Ron Lee vide una nube pallida: il Sole è 11 gradi sotto l'orizzonte invece di 6, e la stessa spirale risalta, luminosa, su un cielo scuro, vista di sbieco. L'orbita è quella di CSG-2 stesso, secondo Space-Track; la frenata, gli scarichi e la rotazione sono supposti."
      }
    })
  }

  /** The braking and the vents as seen from `place`, `offsetHours` from UTC: what every view of the stage's end shares; `own` is what is its own. */
  private dump(place: Place, offsetHours: number, own: DumpView): object {
    const track = []
    for (let ms = BURN_AT - 120_000; ms <= FALCON_START + (FALCON_S + 30) * 1000; ms += 10_000) {
      const at = this.stage.at(ms)
      track.push({
        t: ms - FALCON_START,
        lat: assumed(Number(at.lat.toFixed(4)), ORBIT_RATIONALE),
        lng: assumed(Number(at.lng.toFixed(4)), ORBIT_RATIONALE),
        altitudeKm: assumed(Number(at.altitudeKm.toFixed(1)), ORBIT_RATIONALE)
      })
    }
    // Seconds of the throttled engine for that change of speed.
    const burnS = this.stage.brakeKmPerS * 1000 * STAGE_KG / (THROTTLED_KN * 1000)
    const observerTrack = []
    for (let s = 0; s <= FALCON_S; s += 10) {
      const look = this.stage.lookAt(FALCON_START + s * 1000, place)
      observerTrack.push({ t: s * 1000, pose: { lat: place.lat, lng: place.lng, elevationM: place.elevationM, headingDeg: Number(look.azimuthDeg.toFixed(1)), pitchDeg: Number(Math.max(8, look.elevationDeg).toFixed(1)), fovDeg: 70 } })
    }
    return {
      version: 1,
      id: `observer-csg2-${own.key}`,
      image: `https://ufoathome.org/demo-data/share/csg2-${own.key}.jpg`,
      observer: own.observer,
      tags: own.tags,
      // The card is taken three minutes in, when the spiral has its S.
      summaryTime: 180,
      description: own.description,
      time: Csg2Case.time(FALCON_START, offsetHours),
      utcOffsetHours: offsetHours,
      durationSeconds: FALCON_S,
      place: [{ lat: place.lat, lng: place.lng, name: place.name }],
      weatherTrack: Csg2Case.clearSky(own.sky),
      timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
      observerTrack: { keyframes: observerTrack },
      soundTrack: { keyframes: [] },
      decor: [],
      skyEvents: {
        launches: [{
          id: "csg-2", title: Csg2Case.TITLE, vehicle: Csg2Case.VEHICLE, track,
          jets: [
            {
              id: "deorbit-burn", kind: "burn",
              fromT: assumed(Math.round(BURN_AT - FALCON_START - burnS * 500), BURN_RATIONALE),
              untilT: assumed(Math.round(BURN_AT - FALCON_START + burnS * 500), BURN_RATIONALE),
              angleDeg: assumed(180, BURN_RATIONALE),
              massKgPerS: assumed(THROTTLED_KG_PER_S, "The Merlin Vacuum throttled to 60 percent of its 273 kg/s: a short braking burn of a nearly empty stage. Assumed.")
            },
            ...[0, 180].map(side => ({
              id: `vent-${side}`, kind: "vent",
              fromT: assumed(VENTS.from - FALCON_START, VENT_RATIONALE), untilT: assumed(VENTS.until - FALCON_START, VENT_RATIONALE),
              angleDeg: assumed(90, VENT_RATIONALE), azimuthDeg: assumed(side, VENT_RATIONALE), spinPeriodS: assumed(90, VENT_RATIONALE),
              speedKmPerS: assumed(0.7, VENT_RATIONALE), massKgPerS: assumed(20, VENT_RATIONALE), condensedShare: assumed(0.1, VENT_RATIONALE),
              expansionKmPerS: assumed(0.15, VENT_RATIONALE), particleRadiusUm: assumed(0.1, VENT_RATIONALE),
              lifetimeS: assumed(900, VENT_RATIONALE)
            }))
          ]
        }]
      }
    }
  }

  caseFile(): object {
    return {
      id: "CSG2-2022",
      title: "CSG-2",
      time: "2022-01-31 23:11",
      summary: {
        en: "31 January 2022, 23:11 UTC. A Falcon 9 launches the Italian radar satellite CSG-2 south from Cape Canaveral just after sunset. An hour and a half later its upper stage, back over North America on its first orbit, brakes out of orbit and vents its tanks while it spins: Ron Lee sees it due east from Colorado and reports it on SeeSat-L, others photograph spirals from Oklahoma and Texas. One stage, three skies: the plume of the ascent from Nassau, the dump from Falcon, Colorado, as Ron Lee saw it, and from Oklahoma City, where the night was further on and the spiral stood out large and bright (two observers assumed).",
        fr: "31 janvier 2022, 23 h 11 UTC. Un Falcon 9 lance le satellite radar italien CSG-2 vers le sud depuis Cap Canaveral juste après le coucher du Soleil. Une heure et demie plus tard, son deuxième étage, revenu au-dessus de l'Amérique du Nord dès sa première orbite, freine pour quitter son orbite et vidange ses réservoirs en tournant : Ron Lee le voit plein est depuis le Colorado et le rapporte sur SeeSat-L, d'autres photographient des spirales depuis l'Oklahoma et le Texas. Un étage, trois ciels : le panache de la montée depuis Nassau, la vidange depuis Falcon (Colorado) telle que Ron Lee l'a vue, et depuis Oklahoma City, où la nuit était plus avancée et la spirale ressortait, grande et lumineuse (deux observateurs supposés).",
        es: "31 de enero de 2022, 23:11 UTC. Un Falcon 9 lanza el satélite radar italiano CSG-2 hacia el sur desde Cabo Cañaveral justo después de la puesta del Sol. Hora y media más tarde, su segunda etapa, de vuelta sobre América del Norte en su primera órbita, frena para salir de su órbita y purga sus depósitos mientras gira: Ron Lee la ve al este desde Colorado y la cuenta en SeeSat-L, otros fotografían espirales desde Oklahoma y Texas. Una etapa, tres cielos: la estela del ascenso desde Nassau, la purga desde Falcon (Colorado) tal como la vio Ron Lee, y desde Oklahoma City, donde la noche estaba más avanzada y la espiral destacaba, grande y luminosa (dos observadores supuestos).",
        it: "31 gennaio 2022, 23:11 UTC. Un Falcon 9 lancia il satellite radar italiano CSG-2 verso sud da Cape Canaveral subito dopo il tramonto. Un'ora e mezza dopo il suo secondo stadio, tornato sopra il Nord America alla prima orbita, frena per lasciare l'orbita e scarica i serbatoi ruotando: Ron Lee lo vede a est dal Colorado e lo riferisce su SeeSat-L, altri fotografano spirali dall'Oklahoma e dal Texas. Uno stadio, tre cieli: la scia dell'ascesa da Nassau, lo scarico da Falcon (Colorado) come lo vide Ron Lee, e da Oklahoma City, dove la notte era più avanzata e la spirale risaltava, grande e luminosa (due osservatori supposti)."
      },
      events: [
        { type: "event", eventType: "sighting", time: "2022-01-31 23:13", id: "nassau", title: { en: "Observer in Nassau (assumed)", fr: "Observateur à Nassau (supposé)", es: "Observador en Nassau (supuesto)", it: "Osservatore a Nassau (supposto)" }, url: "observer-csg2-nassau.json" },
        { type: "event", eventType: "sighting", time: "2022-02-01 00:47", id: "ron-lee", title: "Ron Lee", url: "observer-csg2-falcon.json" },
        { type: "event", eventType: "sighting", time: "2022-02-01 00:47", id: "oklahoma", title: { en: "Observer in Oklahoma City (assumed)", fr: "Observateur à Oklahoma City (supposé)", es: "Observador en Oklahoma City (supuesto)", it: "Osservatore a Oklahoma City (supposto)" }, url: "observer-csg2-oklahoma.json" }
      ]
    }
  }

  report(): void {
    let ms = BURN_AT
    while (this.stage.at(ms).lat > REENTRY.lat && ms < REENTRY.at + 600_000) ms += 1000
    const reentry = this.stage.at(ms)
    console.log(`brake ${this.stage.brakeKmPerS.toFixed(3)} km/s; at ${new Date(ms).toISOString().slice(11, 19)} UTC ${reentry.lat.toFixed(1)}, ${reentry.lng.toFixed(1)}, ${reentry.altitudeKm.toFixed(0)} km (Bob Christy: about 01:05 UTC, 27 S, 114 W)`)
    for (const ms of [BURN_AT, Date.UTC(2022, 1, 1, 0, 49, 0), FALCON_START + FALCON_S * 1000]) {
      const at = this.stage.at(ms)
      const look = this.stage.lookAt(ms, FALCON)
      console.log(new Date(ms).toISOString().slice(11, 19), at.lat.toFixed(2), at.lng.toFixed(2), at.altitudeKm.toFixed(0), "km; from Falcon az", look.azimuthDeg.toFixed(0), "el", look.elevationDeg.toFixed(0))
    }
    for (const s of [155, 300, 510]) {
      const at = this.ascentAt(s)
      const look = Csg2Case.look(NASSAU, at)
      console.log(`T+${s}`, at.lat.toFixed(2), at.lng.toFixed(2), at.altitudeKm, "km; from Nassau az", look.azimuthDeg.toFixed(0), "el", look.elevationDeg.toFixed(1))
    }
  }
}

const built = new Csg2Case()
built.report()
const write = (name: string, json: object) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(json, null, 2) + "\n")
write("observer-csg2-nassau", built.nassau())
write("observer-csg2-falcon", built.falcon())
write("observer-csg2-oklahoma", built.oklahoma())
write("case-csg2", built.caseFile())
console.log("wrote", OUT)
