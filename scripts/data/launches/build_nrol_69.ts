/**
 * Builds the "spiral" test sky: the upper stage of the Falcon 9 that launched NROL-69 (Cape Canaveral, 24 March 2025,
 * 17:48 UTC), braking out of orbit over northern Europe two hours later and venting what was left in its tanks, seen
 * from Angoulême (Charente) between 20:55 and 21:10 local time.
 *
 * Sources:
 * - Charente Libre, Stéphane Urbajtel, "Spectaculaire spirale lumineuse dans le ciel : un astronome explique ce mystère
 *   observé par des dizaines de Charentais", 25 March 2025: seen 24 March between 20:55 and 21:10 (local, UTC+1) from
 *   Barbezieux, Taponnat, Terres-de-Haute-Charente; "a pale blue and white spiral"; the amateur astronomer Eric Barbotin:
 *   first "a slight bluish arc ahead", the gas of the braking burn, then the spirals, the tanks vented asymmetrically.
 * - Marco Langbroek, SeeSat-L, 25 March 2025, "Possible better estimate (Re: NROL-69 orbit estimate)": the orbit below,
 *   900 x 1300 km at 64.4 degrees, deorbit after 1.5 revolutions, fitted to a payload seen near the fuel cloud.
 * - Nick James, SeeSat-L, 24 March 2025: from Chelmsford at 19:53:15 UTC, the expanding cloud rising above the northern
 *   horizon. John (satcom ops H), SeeSat-L: from the Wirral 19:58-20:00 UTC, a faint cloud to the north that became an
 *   hourglass and then started to spin. Jonathan McDowell: the deorbit burn over northern Europe at about 20:00 UTC.
 *
 * The orbit is Langbroek's estimate and the stage is taken to fly it; the instant, length and size of the braking burn,
 * the vent's direction, speed, flow and the stage's spin are ASSUMED (none is published). The Sun, the Earth's shadow,
 * the flight of the exhaust and the scattering are computed by the engine.
 *
 * Writes ../../../public/demo-data/sky-test-nrol-69-spiral.json. Run with `node --import tsx`.
 */
import * as sat from "satellite.js"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public", "demo-data", "sky-test-nrol-69-spiral.json")
const TLE = [
  "1 70001U 25999A   25083.75694444 0.00000000  00000-0  00000+0 0    05",
  "2 70001  64.4000 354.9792 0266073  59.9984  40.8260 13.42225870    05"
]
const OBSERVER = { lat: 45.6484, lng: 0.1562, elevationM: 100, name: "Angoulême, Charente" }
const UTC_OFFSET = 1
/** The recording: 19:55 to 20:05 UTC, while the stage is above Angoulême's horizon. */
const START = Date.UTC(2025, 2, 24, 19, 55, 0)
const DURATION_S = 600
/** The braking burn and the vent, ms of the recording. */
const BURN = { fromT: -90000, untilT: -87000 }
const VENT = { fromT: -75000, untilT: 285000 }
/** What the burn takes off the stage's speed, km/s: enough to bring its perigee into the air from 900 x 1300 km. */
const BRAKE_KM_PER_S = 0.25
const TRACK_STEP_S = 10
const TRACK_FROM_S = -150

const ORBIT = "The stage is taken to fly the orbit Marco Langbroek estimated for NROL-69 (SeeSat-L, 25 March 2025: 900 x 1300 km at 64.4 degrees, fitted to a payload seen near the fuel cloud), propagated with SGP4 until the braking burn, then as a free orbit slowed by it. The stage's own orbit is not published."
const BURN_RATIONALE = "No time is published for the deorbit burn: McDowell puts it over northern Europe at about 20:00 UTC and Nick James saw the cloud rising above Chelmsford's northern horizon at 19:53:15 UTC. Taken as a few seconds of the throttled Merlin Vacuum, the stage turned round so that its exhaust leaves ahead of it, enough to take 0.25 km/s off its speed."
const VENT_RATIONALE = "Eric Barbotin (Charente Libre): after the burn the tanks are emptied, and the propellant freezes and shines as it whirls. The photographs (Charente Libre, Reporterre, L'Actuaire d'Isbergues) show two arms, an S that the Wirral saw first as an hourglass: two opposite vents across the stage's motion. Their speed (0.7 km/s), flow (5 kg/s each for six minutes, the arms reaching the stage in the photographs taken from Charente while the cloud was seen), the share of it that freezes (a tenth, the rest boiling off as gas), how fast each puff spreads (0.15 km/s, a jet opening some twelve degrees into vacuum, so that the arms stay apart for a turn and a quarter and melt into a halo beyond) and the stage's spin (a turn in a minute and a half) are assumed, chosen so that the spiral has the turn and a quarter of distinct arms the photographs show."
const BLUE = "The spiral is pale blue in every photograph and to the eye (Charente Libre: 'a pale blue and white spiral'): ice finer than the wavelength of light scatters blue more than red. A radius of 0.1 micrometre is assumed for it."

const assumed = <T>(value: T, rationale: string) => ({ value, basis: "assumed", rationale })
const stated = <T>(value: T, rationale: string) => ({ value, basis: "stated", rationale })

/** Where the stage is, ECI (TEME) km and km/s, at `ms` UTC: SGP4 before the burn, then a free orbit from the burn on. */
class StageOrbit {
  private readonly record = sat.twoline2satrec(TLE[0], TLE[1])
  private readonly burnAt = START + (BURN.fromT + BURN.untilT) / 2
  private readonly afterBurn: { ms: number; r: number[]; v: number[] }[] = []

  constructor() {
    const state = sat.propagate(this.record, new Date(this.burnAt)) as { position: sat.EciVec3<number>; velocity: sat.EciVec3<number> }
    const r = [state.position.x, state.position.y, state.position.z]
    const v = [state.velocity.x, state.velocity.y, state.velocity.z]
    const speed = Math.hypot(v[0], v[1], v[2])
    const braked = v.map(c => c * (1 - BRAKE_KM_PER_S / speed))
    let s = [...r, ...braked]
    const step = 1
    for (let t = 0; t <= DURATION_S + 200; t += step) {
      this.afterBurn.push({ ms: this.burnAt + t * 1000, r: s.slice(0, 3), v: s.slice(3) })
      s = StageOrbit.rk4(s, step)
    }
  }

  at(ms: number): number[] {
    if (ms <= this.burnAt) {
      const state = sat.propagate(this.record, new Date(ms)) as { position: sat.EciVec3<number> }
      return [state.position.x, state.position.y, state.position.z]
    }
    const i = Math.min(this.afterBurn.length - 1, Math.round((ms - this.burnAt) / 1000))
    return this.afterBurn[i].r
  }

  /** Two bodies and the Earth's oblateness (J2), which turns the orbit's plane a little over ten minutes. */
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
    const k1 = StageOrbit.derivative(s)
    const k2 = StageOrbit.derivative(add(s, k1, h / 2))
    const k3 = StageOrbit.derivative(add(s, k2, h / 2))
    const k4 = StageOrbit.derivative(add(s, k3, h))
    return s.map((c, i) => c + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
  }
}

class Nrol69Sky {
  private readonly orbit = new StageOrbit()

  /** Latitude, longitude, height in km of the stage at `t` ms of the recording. */
  stageAt(t: number): { lat: number; lng: number; altitudeKm: number } {
    const date = new Date(START + t)
    const position = this.orbit.at(START + t)
    const g = sat.eciToGeodetic({ x: position[0], y: position[1], z: position[2] }, sat.gstime(date))
    return { lat: sat.degreesLat(g.latitude), lng: sat.degreesLong(g.longitude), altitudeKm: g.height }
  }

  /** Where the stage is in the observer's sky at `t`, degrees. */
  lookAt(t: number): { azimuthDeg: number; elevationDeg: number } {
    const date = new Date(START + t)
    const position = this.orbit.at(START + t)
    const observer = { latitude: sat.degreesToRadians(OBSERVER.lat), longitude: sat.degreesToRadians(OBSERVER.lng), height: OBSERVER.elevationM / 1000 }
    const look = sat.ecfToLookAngles(observer, sat.eciToEcf({ x: position[0], y: position[1], z: position[2] }, sat.gstime(date)))
    return { azimuthDeg: sat.radiansToDegrees(look.azimuth), elevationDeg: sat.radiansToDegrees(look.elevation) }
  }

  recording(): object {
    const track = []
    for (let s = TRACK_FROM_S; s <= DURATION_S; s += TRACK_STEP_S) {
      const at = this.stageAt(s * 1000)
      track.push({
        t: s * 1000,
        lat: assumed(Number(at.lat.toFixed(4)), ORBIT),
        lng: assumed(Number(at.lng.toFixed(4)), ORBIT),
        altitudeKm: assumed(Number(at.altitudeKm.toFixed(1)), ORBIT)
      })
    }
    const launch = {
      id: "nrol-69",
      title: {
        en: "Upper stage of the NROL-69 launch, deorbited", fr: "Deuxième étage du lancement de NROL-69, désorbité",
        es: "Segunda etapa del lanzamiento de NROL-69, desorbitada", it: "Secondo stadio del lancio di NROL-69, deorbitato"
      },
      vehicle: {
        name: "Falcon 9", mission: "NROL-69",
        engine: {
          thrustKN: stated(934, "SpaceX: a Merlin Vacuum's thrust in vacuum, 934 kN (the Falcon 9 second stage has one)."),
          specificImpulseS: stated(348, "SpaceX: a Merlin Vacuum's specific impulse in vacuum, 348 s."),
          propellant: stated("rp1-lox", "The Falcon 9 burns RP-1 kerosene and liquid oxygen.")
        }
      },
      track,
      jets: [
        {
          id: "deorbit-burn", kind: "burn",
          fromT: assumed(BURN.fromT, BURN_RATIONALE), untilT: assumed(BURN.untilT, BURN_RATIONALE),
          angleDeg: assumed(180, BURN_RATIONALE),
          massKgPerS: assumed(164, "The Merlin Vacuum throttled to 60 percent of its 273 kg/s: a short braking burn of a nearly empty stage. Assumed.")
        },
        ...[0, 180].map(side => ({
          id: `vent-${side}`, kind: "vent",
          fromT: assumed(VENT.fromT, VENT_RATIONALE), untilT: assumed(VENT.untilT, VENT_RATIONALE),
          angleDeg: assumed(90, VENT_RATIONALE),
          azimuthDeg: assumed(side, VENT_RATIONALE),
          spinPeriodS: assumed(90, VENT_RATIONALE),
          speedKmPerS: assumed(0.7, VENT_RATIONALE),
          massKgPerS: assumed(5, VENT_RATIONALE),
          condensedShare: assumed(0.1, VENT_RATIONALE),
          expansionKmPerS: assumed(0.15, VENT_RATIONALE),
          particleRadiusUm: assumed(0.1, BLUE),
          lifetimeS: assumed(900, "The cloud was still seen from Charente a quarter of an hour after it formed (Charente Libre: 20:55 to 21:10).")
        }))
      ]
    }
    const observerTrack = []
    for (let s = 0; s <= DURATION_S; s += 10) {
      const look = this.lookAt(s * 1000)
      observerTrack.push({
        t: s * 1000,
        pose: {
          lat: OBSERVER.lat, lng: OBSERVER.lng, elevationM: OBSERVER.elevationM,
          headingDeg: Number(look.azimuthDeg.toFixed(1)), pitchDeg: Number(Math.max(8, look.elevationDeg).toFixed(1)), fovDeg: 70
        }
      })
    }
    const local = new Date(START + UTC_OFFSET * 3600000)
    const clear = assumed(0, "Dozens of people in Charente photographed the spiral against a dark sky: no cloud is stated, a clear sky is assumed.")
    return {
      version: 1,
      id: "sky-test-nrol-69-spiral",
      tags: ["rocket launch", "fuel dump", "spiral", "Falcon 9", "deorbit"],
      // The card is taken a minute and a half in, when the spiral has its S and its first halo.
      summaryTime: 90,
      image: "https://ufoathome.org/demo-data/share/sky-test-nrol-69-spiral.jpg",
      description: {
        en: "A test sky for a rocket seen from the front and from behind at once: the spiral that dozens of people in Charente saw on 24 March 2025 between 20:55 and 21:10, the upper stage of the Falcon 9 that had launched NROL-69 two hours earlier, braking out of orbit 1 000 km above northern Europe and venting what was left in its tanks while it spun, seen from Angoulême. Not an observer's account: the spiral as physics makes it. The orbit is Marco Langbroek's estimate; the burn, the vent and the spin are assumed; the Sun lighting the exhaust above a dark ground, the flight of every puff and the light are computed.",
        fr: "Un ciel d'essai pour une fusée vue à la fois de face et de dos : la spirale que des dizaines de Charentais ont vue le 24 mars 2025 entre 20 h 55 et 21 h 10, le deuxième étage du Falcon 9 qui avait lancé NROL-69 deux heures plus tôt, freinant pour quitter son orbite à 1 000 km au-dessus du nord de l'Europe et vidant ce qui restait dans ses réservoirs en tournant sur lui-même, vu d'Angoulême. Ce n'est pas le compte rendu d'un observateur : c'est la spirale telle que la physique la fait. L'orbite est l'estimation de Marco Langbroek ; le freinage, la vidange et la rotation sont supposés ; le Soleil qui éclaire l'échappement au-dessus d'un sol dans la nuit, le vol de chaque bouffée et la lumière sont calculés.",
        es: "Un cielo de prueba para un cohete visto a la vez de frente y de espaldas: la espiral que decenas de personas vieron en Charente el 24 de marzo de 2025 entre las 20:55 y las 21:10, la segunda etapa del Falcon 9 que había lanzado NROL-69 dos horas antes, frenando para salir de su órbita a 1 000 km sobre el norte de Europa y vaciando lo que quedaba en sus depósitos mientras giraba, vista desde Angulema. No es el relato de un observador: es la espiral tal como la hace la física. La órbita es la estimación de Marco Langbroek; el frenado, el vaciado y el giro se suponen; el Sol que ilumina el escape sobre un suelo a oscuras, el vuelo de cada bocanada y la luz se calculan.",
        it: "Un cielo di prova per un razzo visto insieme di fronte e da dietro: la spirale che decine di persone videro in Charente il 24 marzo 2025 tra le 20:55 e le 21:10, il secondo stadio del Falcon 9 che aveva lanciato NROL-69 due ore prima, in frenata per lasciare l'orbita a 1 000 km sopra il nord Europa e mentre svuotava ciò che restava nei serbatoi ruotando su se stesso, visto da Angoulême. Non è il resoconto di un osservatore: è la spirale come la fa la fisica. L'orbita è la stima di Marco Langbroek; la frenata, lo svuotamento e la rotazione sono supposti; il Sole che illumina lo scarico sopra un suolo al buio, il volo di ogni sbuffo e la luce sono calcolati."
      },
      time: {
        year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
        hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds()
      },
      utcOffsetHours: UTC_OFFSET,
      durationSeconds: DURATION_S,
      place: [{ lat: OBSERVER.lat, lng: OBSERVER.lng, name: OBSERVER.name }],
      weatherTrack: {
        keyframes: [{
          t: 0, weather: {
            cloudCover: clear, cloudDarkness: 0, cloudBaseM: 2000, lowerCloudCover: 0, highCloudCover: 0,
            precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0, storm: false
          }
        }]
      },
      timeline: { keyframes: [{ t: 0, shapes: [] }], order: [], groups: [] },
      observerTrack: { keyframes: observerTrack },
      soundTrack: { keyframes: [] },
      decor: [],
      skyEvents: { launches: [launch] }
    }
  }
}

const recording = new Nrol69Sky().recording()
writeFileSync(OUT, JSON.stringify(recording, null, 2) + "\n")
console.log("wrote", OUT)
