import { describe, expect, test } from "vitest"
import { AircraftSoundAnalysis } from "../../scripts/AircraftSoundAnalysis.js"

const RATE = 22050

function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function whiteNoise(seconds: number, random: () => number): Float32Array {
  return Float32Array.from({ length: RATE * seconds }, () => random() * 2 - 1)
}

describe("AircraftSoundAnalysis", () => {
  test("white noise has as much power per hertz everywhere, so each octave, twice as wide as the one under it, has 3 dB more", () => {
    const shape = AircraftSoundAnalysis.measure(whiteNoise(10, seeded(1)), RATE, seeded(2)).octaveShapeDb
    for (let band = 1; band < 7; band++) expect(shape[band] - shape[band - 1]).toBeCloseTo(3, 0)
    // The highest octave is cut at 11 kHz, half the sampling rate, and has less.
    expect(shape[7]).toBeLessThan(shape[6] + 3)
  })

  test("finds a line in a noise, at its frequency, and none in the noise alone", () => {
    const random = seeded(3)
    const noise = whiteNoise(10, random)
    const lined = Float32Array.from(noise, (value, i) => value + 0.3 * Math.sin((2 * Math.PI * 240 * i) / RATE))
    const tones = AircraftSoundAnalysis.measure(lined, RATE, seeded(4)).tones
    expect(tones[0]?.hz).toBeGreaterThan(237)
    expect(tones[0]?.hz).toBeLessThan(243)
    expect(AircraftSoundAnalysis.measure(noise, RATE, seeded(4)).tones).toEqual([])
  })

  test("a noise whose loudness is beaten flickers more than the same noise unbeaten, which flickers by what any noise does", () => {
    const noise = whiteNoise(10, seeded(5))
    const steady = AircraftSoundAnalysis.measure(noise, RATE, seeded(6))
    // The noise's own flicker over 10 ms, about as much as its unmodulated copy has.
    expect(steady.fluctuationDb).toBeCloseTo(steady.unmodulatedFluctuationDb, 0)
    // Beaten at 8 Hz by half its amplitude: several decibels more, which its unmodulated copy has not.
    const beaten = Float32Array.from(noise, (value, i) => value * (1 + 0.5 * Math.sin((2 * Math.PI * 8 * i) / RATE)))
    const measured = AircraftSoundAnalysis.measure(beaten, RATE, seeded(6))
    expect(measured.fluctuationDb).toBeGreaterThan(measured.unmodulatedFluctuationDb + 2)
  })

  test("the unmodulated copy keeps the spectrum", () => {
    const random = seeded(7)
    // A noise mostly in the lows: each sample the average of the last sixteen.
    const raw = whiteNoise(5, random)
    const low = Float32Array.from(raw, (_, i) => raw.slice(Math.max(0, i - 15), i + 1).reduce((a, b) => a + b, 0) / 16)
    const before = AircraftSoundAnalysis.octaveShapeDb(AircraftSoundAnalysis.averageSpectrum(low), RATE)
    const after = AircraftSoundAnalysis.octaveShapeDb(AircraftSoundAnalysis.averageSpectrum(AircraftSoundAnalysis.unmodulated(low, seeded(8))), RATE)
    before.slice(0, 6).forEach((level, band) => expect(after[band]).toBeCloseTo(level, 0))
  })

  test("measures the beat of a noise at a piston engine's rate, and none in a noise that has none", () => {
    const noise = whiteNoise(8, seeded(7))
    const beaten = noise.map((sample, i) => sample * (1 + 0.3 * Math.cos(2 * Math.PI * 80 * i / RATE)))
    const measured = AircraftSoundAnalysis.modulation(beaten, RATE)
    expect(measured.hz).toBeCloseTo(80, 0)
    expect(measured.depth).toBeGreaterThan(0.25)
    expect(measured.depth).toBeLessThan(0.35)
    expect(AircraftSoundAnalysis.modulation(noise, RATE).depth).toBeLessThan(0.1)
  })
})
