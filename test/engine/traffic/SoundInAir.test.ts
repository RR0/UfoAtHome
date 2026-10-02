import { describe, expect, test } from "vitest"
import { SoundInAir } from "../../../src/engine/traffic/SoundInAir.js"

describe("SoundInAir", () => {
  test("sound goes at about 340 m/s on a mild day and 331 at freezing", () => {
    expect(SoundInAir.speedOfSound(15)).toBeCloseTo(340.3, 0)
    expect(SoundInAir.speedOfSound(0)).toBeCloseTo(331.3, 0)
    expect(SoundInAir.speedOfSound(30)).toBeCloseTo(349.0, 0)
  })

  // ISO 9613-2, table 2: the attenuation coefficients it prints, dB/km, at the octave bands 63 Hz to 8 kHz,
  // for several temperatures (at 70 % humidity) and humidities (at 15 degrees). The formula was written
  // from ISO 9613-1, a different document, and agrees with every row to a few per cent.
  const ISO_ROWS: [number, number, number[]][] = [
    [10, 0.7, [0.1, 0.4, 1.0, 1.9, 3.7, 9.7, 32.8, 117]],
    [20, 0.7, [0.1, 0.3, 1.1, 2.8, 5.0, 9.0, 22.9, 76.6]],
    [30, 0.7, [0.1, 0.3, 1.0, 3.1, 7.4, 12.7, 23.1, 59.3]],
    [15, 0.2, [0.3, 0.6, 1.2, 2.7, 8.2, 28.2, 88.8, 202]],
    [15, 0.5, [0.1, 0.5, 1.2, 2.2, 4.2, 10.8, 36.2, 129]],
    [15, 0.8, [0.1, 0.3, 1.1, 2.4, 4.1, 8.3, 23.7, 82.8]]
  ]
  test.each(ISO_ROWS)("the air takes the octaves away at the rates ISO 9613 prints, at %i degrees and %f humidity", (temperatureC, relativeHumidity, printed) => {
    SoundInAir.OCTAVES.forEach((frequency, i) => {
      const computed = SoundInAir.absorptionDbPerKm(frequency, { temperatureC, relativeHumidity, pressureKPa: 101.325 })
      // The table gives two or three figures: a tenth of a dB/km is the whole of its precision at the lowest bands.
      expect(Math.abs(computed - printed[i]), `${frequency} Hz: ${computed.toFixed(2)} against ${printed[i]}`).toBeLessThan(Math.max(0.1, printed[i] * 0.05))
    })
  })

  test("the highs go a hundred times faster than the lows", () => {
    expect(SoundInAir.absorptionDbPerKm(8000) / SoundInAir.absorptionDbPerKm(250)).toBeGreaterThan(80)
  })

  test("dry air takes the highs away much faster than damp", () => {
    const dry = SoundInAir.absorptionDbPerKm(4000, { temperatureC: 15, relativeHumidity: 0.2, pressureKPa: 101.325 })
    const damp = SoundInAir.absorptionDbPerKm(4000, { temperatureC: 15, relativeHumidity: 0.8, pressureKPa: 101.325 })
    expect(dry).toBeGreaterThan(damp * 1.5)
  })

  // The octave values IEC 61672 gives.
  test.each([[63, -26.2], [125, -16.1], [250, -8.6], [500, -3.2], [1000, 0], [2000, 1.2], [4000, 1.0], [8000, -1.1]])(
    "the A-weighting at %i Hz is about %f dB", (frequency, expected) => {
      expect(SoundInAir.aWeightingDb(frequency)).toBeCloseTo(expected, 0)
    }
  )

  test("levels add as energies: two equal sounds are three decibels louder", () => {
    expect(SoundInAir.sumDb([60, 60])).toBeCloseTo(63.01, 1)
    expect(SoundInAir.sumDb([60, 40])).toBeCloseTo(60.04, 1)
  })
})
