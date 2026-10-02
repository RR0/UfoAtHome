import type { GeoPoint, SkyPoint } from "../interpretation/Reentry.js"
import { ReentrySighting } from "../interpretation/Reentry.js"
import type { AircraftKind } from "./AircraftModels.js"
import type { AircraftTrack } from "./AircraftProvider.js"
import { AircraftSighting } from "./AircraftSighting.js"
import type { AirConditions } from "./SoundInAir.js"
import { SoundInAir } from "./SoundInAir.js"

/**
 * What an aircraft sounds like at its source: the sound power in each octave band, A-weighted, dB re 1 pW.
 *
 * A DATUM, not a rule: a catalogue of specific aircraft is more entries here, never more code (same
 * principle as LIGHT_RIGS). The one below is a narrow-body turbofan at the thrust of a climb, and its
 * figures are representative, not measured: they were set so that the levels this arithmetic gives at
 * the ground match what is reported of such aircraft overhead (see AircraftHearing.test.ts for the
 * figures it is held to), and they should be replaced by the certification data of a real type when
 * the type is known.
 */
export interface AircraftNoise {
  id: string
  name: string
  /** One figure per band of SoundInAir.OCTAVES. */
  soundPowerA: number[]
  /** What makes it more than a hiss when it is played: see AircraftSoundCharacter. */
  character?: AircraftSoundCharacter
}

/**
 * What a noise has besides its broad spectrum, which is what tells a machine by ear: a rotor's blades beat the air at ten to thirty
 * times a second, a propeller or a piston engine hums at a few tens of hertz, a fan whines, a drone's small rotors whistle. Each is a
 * datum of the class, and a played sound is the broad noise with these laid on it.
 */
export interface AircraftSoundCharacter {
  /** The rate its loudness beats at, Hz, and how much of it: 0 to 1. */
  modulationHz?: number
  modulationDepth?: number
  /** A tone it carries, Hz, and how strong it is against the band it stands in: 0 to 1. It has harmonics, each as strong as its own band lets it be. */
  toneHz?: number
  toneShare?: number
  /**
   * The hum of its engine turning, Hz, and how strong it is against the band it stands in: a turbine spins at fifty to a hundred times a second, and its
   * low tone, with its harmonics, outlasts everything the air takes away: what a distant jet has when its roar is gone, and what tells it from the wind.
   */
  humHz?: number
  humShare?: number
  /**
   * How much its loudness fluctuates, irregularly, as a fraction of it: a jet's roar is rough, crackling with the turbulence of its exhaust and the
   * air it crosses, and a noise that did not fluctuate would be that of a wind tunnel. Defaults to what a jet has.
   */
  roughness?: number
}

/**
 * The noises of the classes of aircraft: a total sound power, dB(A), and the way it falls over the octaves, dB under the total.
 * The totals and the shapes are representative of each class and not measured on any one machine (see AircraftNoise).
 */
const NOISE_CLASSES: { id: string; name: string; kinds: AircraftKind[]; totalDbA: number; shapeDb: number[]; character?: AircraftSoundCharacter }[] = [
  { id: "turbofan-narrow-body", name: "Turbofan airliner, narrow-body", kinds: ["airliner-narrow"], totalDbA: 148, shapeDb: [-32, -17, -9, -6, -5, -7, -12, -22], character: { toneHz: 1800, toneShare: 0.3, humHz: 90, humShare: 0.7 } },
  { id: "turbofan-wide-body", name: "Turbofan airliner, wide-body", kinds: ["airliner-wide"], totalDbA: 151, shapeDb: [-28, -14, -7, -4, -3, -6, -12, -22], character: { toneHz: 1200, toneShare: 0.3, humHz: 70, humShare: 0.7 } },
  { id: "regional-jet", name: "Regional jet", kinds: ["regional-jet"], totalDbA: 144, shapeDb: [-32, -17, -9, -5, -4, -6, -11, -21], character: { toneHz: 1900, toneShare: 0.3, humHz: 95, humShare: 0.7 } },
  { id: "business-jet", name: "Business jet", kinds: ["business-jet"], totalDbA: 141, shapeDb: [-30, -15, -8, -4, -3, -4, -9, -19], character: { toneHz: 2500, toneShare: 0.25, humHz: 110, humShare: 0.7 } },
  // A propeller's blade-passing tone, a few tens of hertz, carries most of what a turboprop sends.
  { id: "turboprop", name: "Turboprop", kinds: ["regional-turboprop", "turboprop-light"], totalDbA: 138, shapeDb: [-14, -9, -8, -6, -8, -13, -20, -28], character: { toneHz: 80, toneShare: 0.5 } },
  { id: "light-piston", name: "Light piston aircraft", kinds: ["light-piston"], totalDbA: 130, shapeDb: [-18, -9, -5, -4, -8, -14, -22, -30], character: { toneHz: 80, toneShare: 0.4 } },
  { id: "ultralight", name: "Ultralight", kinds: ["ultralight"], totalDbA: 124, shapeDb: [-16, -8, -5, -4, -9, -15, -23, -31], character: { toneHz: 140, toneShare: 0.4 } },
  // A rotor's blades beat the air at ten to twenty times a second, and the low harmonics are what carry far.
  { id: "helicopter-light", name: "Light helicopter", kinds: ["helicopter-light"], totalDbA: 134, shapeDb: [-15, -8, -4, -3, -6, -10, -16, -24], character: { modulationHz: 20, modulationDepth: 0.5 } },
  { id: "helicopter-medium", name: "Medium helicopter", kinds: ["helicopter-medium"], totalDbA: 138, shapeDb: [-14, -7, -4, -3, -6, -10, -16, -24], character: { modulationHz: 22, modulationDepth: 0.5 } },
  { id: "helicopter-heavy", name: "Heavy helicopter", kinds: ["helicopter-heavy"], totalDbA: 144, shapeDb: [-12, -6, -4, -4, -7, -11, -17, -25], character: { modulationHz: 17, modulationDepth: 0.5 } },
  { id: "military-jet", name: "Military jet", kinds: ["military-jet"], totalDbA: 152, shapeDb: [-26, -12, -6, -3, -2, -3, -7, -15] },
  { id: "glider", name: "Glider", kinds: ["glider"], totalDbA: 85, shapeDb: [-30, -22, -15, -10, -8, -8, -14, -22] },
  { id: "balloon", name: "Hot-air balloon", kinds: ["balloon"], totalDbA: 100, shapeDb: [-25, -15, -9, -5, -3, -6, -12, -20] },
  // A rotor's whine, thin and high: little under a kilohertz.
  { id: "unmanned", name: "Unmanned aircraft", kinds: ["unmanned"], totalDbA: 88, shapeDb: [-40, -30, -20, -12, -6, -3, -3, -8], character: { toneHz: 450, toneShare: 1 } }
]

export const AIRCRAFT_NOISES: AircraftNoise[] = NOISE_CLASSES.map(noise => ({
  id: noise.id,
  name: noise.name,
  // The shape, brought to the total: energies add, so what is added to every band is the difference between the
  // total wanted and the total the shape makes.
  soundPowerA: noise.shapeDb.map(level => level + noise.totalDbA - SoundInAir.sumDb(noise.shapeDb)),
  character: noise.character
}))

/** What a listener would hear of one aircraft at one instant. */
export interface HeardAircraft {
  track: AircraftTrack
  /** Whether it can be told from the ambient noise at all: some band of it rises above that band of the ambient. */
  audible: boolean
  /** A-weighted level of the whole sound, dB(A), and of each octave band. */
  levelDbA: number
  bandsDbA: number[]
  /** The ambient noise it is heard against, dB(A). */
  ambientDbA: number
  /** How long the sound took to arrive: it left the aircraft this long ago, s. */
  delayS: number
  /** The instant, ms UTC, at which the sound that arrives now left the aircraft. */
  emittedAtMs: number
  /** Where the aircraft was then, which is where the sound seems to come FROM. */
  sound: SkyPoint
  /** Where it is now, which is where it is SEEN. */
  seen: SkyPoint
  /** The angle between the two, degrees: how far behind the aircraft its sound is, on a line along its course. */
  lagDeg: number
  /** The pitch of what is heard, relative to what was made: above 1 while it comes towards the listener, below while it leaves. */
  dopplerRatio: number
  /** The band that carries the most of what is heard, Hz. */
  dominantHz: number
  /** The highest band still above the ambient, Hz: the sound has nothing above it. Low for a distant aircraft, which is a rumble. */
  cutoffHz?: number
}

/** When an aircraft can be heard over a span, and at its loudest. */
export interface HearingProfile {
  track: AircraftTrack
  /** The intervals, ms UTC, in which it is audible. */
  audible: { fromMs: number; untilMs: number }[]
  peakDbA: number
  peakAtMs: number
  /** The delay at the peak, s. */
  peakDelayS: number
}

export interface AircraftHearingOptions {
  air?: AirConditions
  /** The noise of the place, dB(A): about 30 for a quiet rural night, 40 by day, 55 in a town. */
  ambientDbA?: number
  noise?: AircraftNoise
}

/**
 * Whether the noise of an aircraft is heard, when, and how.
 *
 * SOUND IS SLOW, which is the whole of what makes an aircraft heard unlike an aircraft seen. It goes at
 * about 340 m/s: an airliner at 10 km is heard as it was nearly half a minute before, and since it
 * flies at 250 m/s that is some seven kilometres behind where it is seen. The sound that arrives at an
 * instant `t` left the aircraft at the instant τ for which its distance then, divided by the speed of
 * sound, is `t − τ` (solved by iteration: it converges because the aircraft is slower than sound).
 * Everything is worked out from where the aircraft was at τ.
 *
 * ITS LEVEL falls with the spreading of the wavefront (6 dB each time the distance doubles) and with
 * the absorption of the air (ISO 9613-1, band by band): so the highs go first, and what arrives from far
 * away is a low rumble. Heard when some band stands above the same band of the ambient noise.
 *
 * ITS PITCH is shifted by the Doppler effect, by the speed at which the aircraft was coming towards the
 * listener when it made the sound.
 *
 * NOT MODELLED, and each makes it worse for audibility, never better, except where said: the shadow the
 * wind and the temperature gradient cast on a sound from aloft (it can silence an aircraft that
 * should be heard); the attenuation of the ground at low angles (an aircraft near the horizon is
 * heard less than computed); the directivity of the engines (an aircraft is louder behind than ahead);
 * the sound a type makes at the thrust it was really at. A level is an estimate of the order of a few
 * dB at best, and a verdict of "audible" is true within the same margin.
 */
export class AircraftHearing {
  static readonly DEFAULT_AMBIENT_DB_A = 35
  /**
   * How far a band must stand above the ambient's own to be noticed, dB. Not merely to be separable from it by someone listening for it: the sound
   * of a distant aircraft at the noise's own level is the commonest thing that is not heard, and three decibels over it is where it begins to be.
   */
  static readonly DETECTION_MARGIN_DB = 3
  /** The A-weighted shape of an ordinary outdoor noise across the octaves, dB re its total: more in the lows. */
  private static readonly AMBIENT_SHAPE_DB = [-12, -7, -5, -5, -7, -11, -17, -25]
  /** Below this a band is not heard whatever it stands against, dB(A): the threshold of hearing, near enough. */
  private static readonly HEARING_FLOOR_DB_A = 0
  private static readonly ITERATIONS = 30
  private static readonly CONVERGED_MS = 0.5
  private static readonly VELOCITY_STEP_MS = 500

  /** The noise of a kind of aircraft; the narrow-body airliner's, which is most of the sky, for what is not known. */
  static noiseOfKind(kind: AircraftKind): AircraftNoise {
    const noise = NOISE_CLASSES.find(candidate => candidate.kinds.includes(kind))
    return AIRCRAFT_NOISES.find(candidate => candidate.id === (noise?.id ?? "turbofan-narrow-body"))!
  }

  /**
   * What reaches a listener `distanceKm` from the source, in each octave band, dB(A): the source's power less the spreading of the
   * wavefront from a point in free air (20 log r, and the 11 dB of a power spread over a sphere, 4 pi r squared), less the air's
   * absorption band by band.
   */
  static bandsAt(noise: AircraftNoise, distanceKm: number, air: AirConditions = SoundInAir.STANDARD): number[] {
    const spreading = 20 * Math.log10(Math.max(distanceKm * 1000, 1)) + 11
    return SoundInAir.OCTAVES.map((frequency, i) => noise.soundPowerA[i] - spreading - SoundInAir.absorptionDbPerKm(frequency, air) * distanceKm)
  }

  /**
   * Whether anything of a noise could stand above the ambient at `distanceKm`: the nearest an aircraft ever comes is the loudest it is ever
   * heard, so one that cannot be heard there cannot be heard at all, and nothing more need be worked out for it.
   */
  static couldBeHeard(noise: AircraftNoise, distanceKm: number, ambientDbA = AircraftHearing.DEFAULT_AMBIENT_DB_A, air: AirConditions = SoundInAir.STANDARD): boolean {
    const ambient = AircraftHearing.ambientBands(ambientDbA)
    return AircraftHearing.bandsAt(noise, distanceKm, air).some((level, i) => level >= Math.max(ambient[i] + AircraftHearing.DETECTION_MARGIN_DB, AircraftHearing.HEARING_FLOOR_DB_A))
  }

  /** The ambient noise in each band, dB(A), for a total of `ambientDbA`. */
  static ambientBands(ambientDbA: number): number[] {
    const shape = AircraftHearing.AMBIENT_SHAPE_DB
    const total = SoundInAir.sumDb(shape)
    return shape.map(level => ambientDbA + level - total)
  }

  /**
   * What `observer` hears of `track` at `t`. Undefined when the aircraft is not known at the instant the
   * sound left it: it had not been recorded yet, or was in a gap of the record.
   */
  static heardAt(track: AircraftTrack, observer: GeoPoint, t: number, options: AircraftHearingOptions = {}): HeardAircraft | undefined {
    const air = options.air ?? SoundInAir.STANDARD
    const speed = SoundInAir.speedOfSound(air.temperatureC)
    // Where it left from: the instant at which the distance covered by the sound is the time since. The search starts from where the
    // aircraft is, or from the last place it was recorded when it has left the record already: what is heard then left it while it was there.
    const last = track.points[track.points.length - 1]?.t
    if (last === undefined) return undefined
    let emitted = Math.min(t, last)
    let at = AircraftSighting.positionAt(track, emitted)
    if (!at) return undefined
    let sound = ReentrySighting.seenFrom(observer, at.geo)
    for (let i = 0; i < AircraftHearing.ITERATIONS; i++) {
      const next = t - (sound.distanceKm * 1000 * 1000) / speed
      const moved = Math.abs(next - emitted)
      emitted = next
      at = AircraftSighting.positionAt(track, emitted)
      if (!at) return undefined
      sound = ReentrySighting.seenFrom(observer, at.geo)
      if (moved < AircraftHearing.CONVERGED_MS) break
    }
    const now = AircraftSighting.positionAt(track, t)
    const seen = now ? ReentrySighting.seenFrom(observer, now.geo) : sound
    const noise = options.noise ?? AIRCRAFT_NOISES[0]
    const ambientDbA = options.ambientDbA ?? AircraftHearing.DEFAULT_AMBIENT_DB_A
    const ambient = AircraftHearing.ambientBands(ambientDbA)
    const bandsDbA = AircraftHearing.bandsAt(noise, sound.distanceKm, air)
    const audibleBands = bandsDbA.map((level, i) => level >= Math.max(ambient[i] + AircraftHearing.DETECTION_MARGIN_DB, AircraftHearing.HEARING_FLOOR_DB_A))
    const loudest = bandsDbA.indexOf(Math.max(...bandsDbA))
    const highest = audibleBands.lastIndexOf(true)
    return {
      track,
      audible: audibleBands.some(Boolean),
      levelDbA: SoundInAir.sumDb(bandsDbA),
      bandsDbA,
      ambientDbA,
      delayS: (t - emitted) / 1000,
      emittedAtMs: emitted,
      sound,
      seen,
      lagDeg: AircraftHearing.angleBetween(sound, seen),
      dopplerRatio: AircraftHearing.doppler(track, observer, emitted, speed),
      dominantHz: SoundInAir.OCTAVES[loudest],
      cutoffHz: highest < 0 ? undefined : SoundInAir.OCTAVES[highest]
    }
  }

  /**
   * When `track` is heard over a span, and when loudest, sampling every `stepMs`. The intervals are
   * those in which the sound that arrives is above the ambient: they start later than the aircraft is
   * seen, by the delay, and end later than it is gone.
   */
  static profile(track: AircraftTrack, observer: GeoPoint, fromMs: number, untilMs: number, stepMs = 2000, options: AircraftHearingOptions = {}): HearingProfile {
    const audible: { fromMs: number; untilMs: number }[] = []
    let open: { fromMs: number; untilMs: number } | undefined
    let peak: HeardAircraft | undefined
    let peakAtMs = fromMs
    for (let t = fromMs; t <= untilMs; t += stepMs) {
      const heard = AircraftHearing.heardAt(track, observer, t, options)
      if (heard && (!peak || heard.levelDbA > peak.levelDbA)) {
        peak = heard
        peakAtMs = t
      }
      if (heard?.audible) {
        if (open) open.untilMs = t
        else audible.push(open = { fromMs: t, untilMs: t })
      } else open = undefined
    }
    return { track, audible, peakDbA: peak?.levelDbA ?? -Infinity, peakAtMs, peakDelayS: peak?.delayS ?? 0 }
  }

  /** The angle between two directions of a sky, degrees. */
  private static angleBetween(a: SkyPoint, b: SkyPoint): number {
    const unit = (sky: SkyPoint) => {
      const alt = (sky.altitudeDeg * Math.PI) / 180
      const az = (sky.azimuthDeg * Math.PI) / 180
      return [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)]
    }
    const [ax, ay, az] = unit(a)
    const [bx, by, bz] = unit(b)
    return (Math.acos(Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz))) * 180) / Math.PI
  }

  /**
   * The Doppler ratio of the sound that left at `emittedAtMs`: the pitch heard over the pitch made,
   * 1 / (1 − v/c) with v the speed at which the aircraft was closing on the listener then.
   */
  private static doppler(track: AircraftTrack, observer: GeoPoint, emittedAtMs: number, speed: number): number {
    const step = AircraftHearing.VELOCITY_STEP_MS
    const before = AircraftSighting.positionAt(track, emittedAtMs - step)
    const after = AircraftSighting.positionAt(track, emittedAtMs + step)
    if (!before || !after) return 1
    const d0 = ReentrySighting.seenFrom(observer, before.geo).distanceKm * 1000
    const d1 = ReentrySighting.seenFrom(observer, after.geo).distanceKm * 1000
    // Closing speed: how fast the distance shrinks.
    const closing = (d0 - d1) / ((2 * step) / 1000)
    return 1 / (1 - closing / speed)
  }
}
