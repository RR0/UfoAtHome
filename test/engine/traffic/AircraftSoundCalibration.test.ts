import { describe, expect, test } from "vitest"
import { AircraftAudio } from "../../../src/audio/AircraftAudio.js"
import { AIRCRAFT_NOISES, AircraftHearing } from "../../../src/engine/traffic/AircraftHearing.js"
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
}

const recordings = reference.recordings as Reference[]
/** A band of a recording this far under its whole is its background or its encoder's floor, not the aircraft: not held to. */
const FLOOR_DB = -40
/** The lowest band counts half: a microphone's own response falls there. */
const LOWEST_BAND_WEIGHT = 0.5

/** What AircraftAudio plays of a class at `distanceKm`, band by band, dB under the whole: carried by the air, A-weighted, then unweighted to be played. */
function playedShapeDb(noiseClass: string, distanceKm: number): number[] {
  const noise = AIRCRAFT_NOISES.find(candidate => candidate.id === noiseClass)!
  // In a silence, so that nothing is masked and the shape is the sound's own.
  const amplitudes = TrafficSound.bandAmplitudes(AircraftHearing.bandsAt(noise, distanceKm), -100)
  const played = amplitudes.map((amplitude, band) => 20 * Math.log10(amplitude * AircraftAudio.unweighting(SoundInAir.OCTAVES[band])))
  const total = SoundInAir.sumDb(played)
  return played.map(level => level - total)
}

/** How far a recording is from what is played of its class at the distance that fits it best (which nobody wrote down), dB root mean square. */
function bestFit(recording: Reference): { distanceKm: number; rmsDb: number } {
  let best = { distanceKm: 0, rmsDb: Infinity }
  for (let distanceKm = 0.05; distanceKm < 30; distanceKm *= 1.05) {
    const played = playedShapeDb(recording.noiseClass!, distanceKm)
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
const jetsPassing = outdoor.filter(recording => recording.regime === "overflight" && recording.noiseClass?.startsWith("turbofan"))

describe("what is played of an aircraft, held to recordings of aircraft", () => {
  test("there are recordings of jets passing over to be held to", () => {
    expect(jetsPassing.length).toBeGreaterThanOrEqual(4)
  })

  test.each(jetsPassing.map(recording => [recording.title, recording] as const))("a jet passing over (%s) sounds as recorded, at some distance, within 2 dB in every band", (_, recording) => {
    expect(bestFit(recording).rmsDb).toBeLessThan(2)
  })

  test("the lows are what the recordings have: a jet is a rumble under a roar, not a hiss", () => {
    // Played as the air carries it to a kilometre, 63 and 125 Hz are within a few dB of the loudest band, as in every recording of a jet passing.
    const played = playedShapeDb("turbofan-narrow-body", 1)
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
})
