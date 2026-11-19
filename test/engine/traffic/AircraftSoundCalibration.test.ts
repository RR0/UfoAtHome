import { describe, expect, test } from "vitest"
import { AircraftAudio } from "../../../src/audio/AircraftAudio.js"
import { CabinHearing } from "../../../src/engine/traffic/CabinHearing.js"
import { ObserverRide } from "../../../src/engine/place/ObserverRide.js"
import { AIRCRAFT_NOISES, AircraftHearing, type AircraftNoise, type FlightRegime } from "../../../src/engine/traffic/AircraftHearing.js"
import { SoundInAir } from "../../../src/engine/traffic/SoundInAir.js"
import { TrafficSound } from "../../../src/engine/traffic/TrafficSound.js"
import reference from "./aircraft-sound-reference.json"

interface Reference {
  title: string
  noiseClass?: string
  regime?: string
  inside?: boolean
  octaveShapeDb: number[]
  fluctuationDb: number
  unmodulatedFluctuationDb: number
  modulation: { hz: number; depth: number }
}

const recordings = reference.recordings as Reference[]
/** A band of a recording this far under its whole is its background or its encoder's floor, not the aircraft: not held to. */
const FLOOR_DB = -40
/** The lowest band counts half: a microphone's own response falls there. */
const LOWEST_BAND_WEIGHT = 0.5

/** A class's noise, at its own thrust or at another's. */
function noiseOf(noiseClass: string, regime: FlightRegime = "overflight"): AircraftNoise {
  return AircraftHearing.inRegime(AIRCRAFT_NOISES.find(candidate => candidate.id === noiseClass)!, regime)
}

/** What AircraftAudio plays of a noise at `distanceKm`, band by band, dB under the whole: carried by the air, A-weighted, then unweighted to be played. */
function playedShapeDb(noise: AircraftNoise, distanceKm: number): number[] {
  // In a silence, so that nothing is masked and the shape is the sound's own.
  const amplitudes = TrafficSound.bandAmplitudes(AircraftHearing.bandsAt(noise, distanceKm), -100)
  const played = amplitudes.map((amplitude, band) => 20 * Math.log10(amplitude * AircraftAudio.unweighting(SoundInAir.OCTAVES[band])))
  const total = SoundInAir.sumDb(played)
  return played.map(level => level - total)
}

/** How far a recording is from what is played of its class at the distance that fits it best (which nobody wrote down), dB root mean square. */
function bestFit(recording: Reference, noise = noiseOf(recording.noiseClass!)): { distanceKm: number; rmsDb: number } {
  let best = { distanceKm: 0, rmsDb: Infinity }
  for (let distanceKm = 0.05; distanceKm < 30; distanceKm *= 1.05) {
    const played = playedShapeDb(noise, distanceKm)
    let squares = 0
    let weights = 0
    recording.octaveShapeDb.forEach((measured, band) => {
      // Not held to, and skipped rather than weighed at nothing: a band the air has emptied is played at minus infinity.
      if (measured < FLOOR_DB) return
      const weight = band === 0 ? LOWEST_BAND_WEIGHT : 1
      squares += weight * (measured - played[band]) ** 2
      weights += weight
    })
    const rmsDb = Math.sqrt(squares / weights)
    if (rmsDb < best.rmsDb) best = { distanceKm, rmsDb }
  }
  return best
}

const outdoor = recordings.filter(recording => !recording.inside)
const jets = outdoor.filter(recording => recording.noiseClass?.startsWith("turbofan"))
const jetsPassing = jets.filter(recording => recording.regime === "overflight")
const jetsTakingOff = jets.filter(recording => recording.regime === "takeoff")

describe("what is played of an aircraft, held to recordings of aircraft", () => {
  test("there are recordings of jets passing over to be held to", () => {
    expect(jetsPassing.length).toBeGreaterThanOrEqual(4)
  })

  test.each(jetsPassing.map(recording => [recording.title, recording] as const))("a jet passing over (%s) sounds as recorded, at some distance, within 2 dB in every band", (_, recording) => {
    expect(bestFit(recording).rmsDb).toBeLessThan(2)
  })

  // Not the one approach: its shape is not the regime's (see TURBOFAN_REGIMES), the ear doubting it.
  test.each(jetsTakingOff.map(recording => [recording.regime!, recording.title, recording] as const))("a jet at the thrust of a %s (%s) sounds as recorded within 4 dB, and nearer than its class at a climb's", (regime, _, recording) => {
    const atItsThrust = bestFit(recording, noiseOf(recording.noiseClass!, regime as FlightRegime)).rmsDb
    expect(atItsThrust).toBeLessThan(4)
    expect(atItsThrust).toBeLessThan(bestFit(recording).rmsDb)
  })

  const pistons = outdoor.filter(recording => recording.noiseClass === "light-piston" || recording.noiseClass === "piston-heavy")

  test("there are recordings of propellers to be held to: two light, one heavy", () => {
    expect(pistons.filter(recording => recording.noiseClass === "light-piston").length).toBeGreaterThanOrEqual(2)
    expect(pistons.some(recording => recording.noiseClass === "piston-heavy")).toBe(true)
  })

  // The two of small aircraft differ by as much from each other: the class is half-way between them.
  test.each(pistons.map(recording => [recording.noiseClass!, recording.title, recording] as const))("a %s passing (%s) sounds as recorded, at some distance, within 3.5 dB", (_, __, recording) => {
    expect(bestFit(recording).rmsDb).toBeLessThan(3.5)
  })

  test("a piston engine beats its noise at its firing rate, as the nearest recording of its class does, and a jet does not", () => {
    /** The index of the beat played: a gain swelling between 1 and 1 - depth. */
    const played = (noiseClass: string) => {
      const depth = noiseOf(noiseClass).character?.modulationDepth ?? 0
      return depth / 2 / (1 - depth / 2)
    }
    for (const noiseClass of ["light-piston", "piston-heavy"]) {
      const strongest = Math.max(...pistons.filter(recording => recording.noiseClass === noiseClass).map(recording => recording.modulation.depth))
      expect(Math.abs(played(noiseClass) - strongest)).toBeLessThan(0.05)
      // Above what any jet beats, which is the measure's own floor.
      expect(strongest).toBeGreaterThan(Math.max(...jets.map(recording => recording.modulation.depth)))
    }
    const fighter = pistons.find(recording => recording.noiseClass === "piston-heavy")!
    expect(noiseOf("piston-heavy").character?.modulationHz).toBeCloseTo(fighter.modulation.hz, -1)
    for (const noiseClass of ["turbofan-narrow-body", "turbofan-wide-body"]) expect(noiseOf(noiseClass).character?.modulationDepth ?? 0).toBe(0)
  })

  test("a take-off's shape is not a jet passing over's: each regime fits its own recordings better than the other's", () => {
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
    const fit = (recordings: Reference[], regime: FlightRegime) => mean(recordings.map(recording => bestFit(recording, noiseOf(recording.noiseClass!, regime)).rmsDb))
    expect(fit(jetsPassing, "overflight")).toBeLessThan(fit(jetsPassing, "takeoff"))
    expect(fit(jetsTakingOff, "takeoff")).toBeLessThan(fit(jetsTakingOff, "overflight"))
  })

  test("the lows are what the recordings have: a jet is a rumble under a roar, not a hiss", () => {
    // Played as the air carries it to a kilometre, 63 and 125 Hz are within a few dB of the loudest band, as in every recording of a jet passing.
    const played = playedShapeDb(noiseOf("turbofan-narrow-body"), 1)
    const loudest = Math.max(...played)
    expect(played[0]).toBeGreaterThan(loudest - 12)
    expect(played[1]).toBeGreaterThan(loudest - 4)
    for (const recording of jetsPassing) expect(recording.octaveShapeDb[0]).toBeGreaterThan(Math.max(...recording.octaveShapeDb) - 12)
  })

  test("outside, an aircraft's loudness hardly flickers beyond what any noise of its spectrum does: its roughness is to stay small", () => {
    // Most of the flicker measured over 10 ms is the noise's own: a noise of the same spectrum, unmodulated, has nearly all of it. So the
    // roughness that AircraftAudio lays on (DEFAULT_ROUGHNESS) is the small remainder, not the whole that is measured.
    const classed = outdoor.filter(recording => recording.noiseClass)
    for (const recording of classed) expect(recording.fluctuationDb - recording.unmodulatedFluctuationDb).toBeLessThan(1.5)
  })

  describe("inside a jet's cabin", () => {
    const cabins = recordings.filter(recording => recording.inside)
    /** What is played of a cabin, band by band, dB under the whole, in a silence. */
    const cabinShapeDb = (kind: "airliner-narrow" | "business-jet") => {
      const voice = CabinHearing.voice({ kind }, { ambientDbA: -100 })!
      const played = voice.bandAmplitudes.map((amplitude, band) => 20 * Math.log10(amplitude * AircraftAudio.unweighting(SoundInAir.OCTAVES[band])))
      const total = SoundInAir.sumDb(played)
      return played.map(level => level - total)
    }
    const rmsDb = (played: number[], recording: Reference) => {
      let squares = 0
      let weights = 0
      recording.octaveShapeDb.forEach((measured, band) => {
        if (measured < FLOOR_DB) return
        const weight = band === 0 ? LOWEST_BAND_WEIGHT : 1
        squares += weight * (measured - played[band]) ** 2
        weights += weight
      })
      return Math.sqrt(squares / weights)
    }
    /** The engines' noise taken through the shell, which is what a cabin was heard as before it was held to these. */
    const throughShellDb = () => {
      const noise = AircraftHearing.noiseOfKind("airliner-narrow")
      const insulation = ObserverRide.insulationDb({ kind: "airliner-narrow" })
      const amplitudes = TrafficSound.bandAmplitudes(noise.soundPowerA.map((level, band) => level - insulation[band]), -100)
      const played = amplitudes.map((amplitude, band) => 20 * Math.log10(amplitude * AircraftAudio.unweighting(SoundInAir.OCTAVES[band])))
      const total = SoundInAir.sumDb(played)
      return played.map(level => level - total)
    }

    test("there are recordings made in a cabin to be held to", () => {
      expect(cabins.length).toBeGreaterThanOrEqual(2)
    })

    test.each(cabins.map(recording => [recording.title, recording] as const))("sounds as recorded in a cabin (%s), within 6 dB, and nearer than its engines through the shell", (_, recording) => {
      for (const kind of ["airliner-narrow", "business-jet"] as const) expect(rmsDb(cabinShapeDb(kind), recording)).toBeLessThan(6)
      expect(rmsDb(cabinShapeDb("airliner-narrow"), recording)).toBeLessThan(rmsDb(throughShellDb(), recording))
    })

    test("is a rumble: above 500 Hz, every band is 20 dB under the loudest", () => {
      const played = cabinShapeDb("airliner-narrow")
      const loudest = Math.max(...played)
      for (const level of played.slice(4)) expect(level).toBeLessThan(loudest - 20)
    })
  })
})
