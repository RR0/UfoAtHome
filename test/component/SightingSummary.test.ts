import { describe, expect, it } from "vitest"
import { SightingSummary } from "../../src/component/SightingSummary.js"
import { sightingLabels_en } from "../../src/component/messages/SightingLabels_en.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import type { Weather } from "../../src/engine/model/Weather.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"

/**
 * What the strip of chips under both components is allowed to say.
 *
 * Guards a rule that is easy to lose one `push` at a time: a chip states what was APPARENT, not
 * what the file happens to hold. Every weather field of a recording that says nothing about the
 * weather is a zero (see DEFAULT_WEATHER), so without the rule the summary opens with four chips
 * — cover, darkness, wind bearing, wind speed — all of them announcing nothing, ahead of the
 * handful that name the case, the witness and the instrument.
 */
describe("SightingSummary", () => {
  const summary = new SightingSummary(sightingLabels_en, "en")

  const withWeather = (weather: Partial<Weather>): Sighting => {
    const sighting = Sighting.create(undefined, [{ lat: 32.4, lng: -86.3 }])
    sighting.weatherTrack.addKeyframe(0, { ...DEFAULT_WEATHER, ...weather })
    return sighting
  }

  const fields = (sighting: Sighting): string[] => summary.entriesFor(sighting, 0).map(entry => entry.field)
  const valueOf = (sighting: Sighting, field: string): string | undefined =>
    summary.entriesFor(sighting, 0).find(entry => entry.field === field)?.value

  describe("a quantity whose zero means absence", () => {
    it("says nothing about a sky nobody described", () => {
      // The whole point, in the shape the user saw it: an untouched recording used to open with
      // four weather chips stating zeroes.
      const entries = fields(Sighting.create(undefined, [{ lat: 32.4, lng: -86.3 }]))
      expect(entries.filter(field => field.startsWith("cloud") || field.startsWith("wind") || field.startsWith("precipitation"))).toEqual([])
    })

    it("states a cover the reader could see", () => {
      expect(valueOf(withWeather({ cloudCover: 0.35 }), "cloudCover")).toBe("35 %")
    })

    it("drops a cover too thin to round to a whole per cent", () => {
      // Rounded, not raw: the chip would have printed "0 %", which reads as a stated fact.
      expect(fields(withWeather({ cloudCover: 0.004 }))).not.toContain("cloudCover")
    })

    it("drops a calm", () => {
      expect(fields(withWeather({ windSpeed: 0 }))).not.toContain("windSpeed")
    })
  })

  describe("a quantity that only qualifies another", () => {
    it("keeps due north as a bearing while the wind blows", () => {
      // 0 is a real direction here — rule 1 must NOT be applied to it.
      expect(valueOf(withWeather({ windSpeed: 4, windDirectionDeg: 0 }), "windDirection")).toBe("0")
    })

    it("drops the bearing once the air is still", () => {
      expect(fields(withWeather({ windDirectionDeg: 270 }))).not.toContain("windDirection")
    })

    it("keeps white clouds' darkness while there are clouds", () => {
      expect(valueOf(withWeather({ cloudCover: 0.8, cloudDarkness: 0 }), "cloudDarkness")).toBe("0 %")
    })

    it("drops the deck's character and height when there is no deck", () => {
      const entries = fields(withWeather({ cloudDarkness: 0.6, cloudBaseM: 1200 }))
      expect(entries).not.toContain("cloudDarkness")
      expect(entries).not.toContain("cloudBase")
    })

    it("keeps the base once any one of the three decks shows", () => {
      // The decks overlap, so no total is computed from them — any one is enough.
      expect(valueOf(withWeather({ highCloudCover: 0.4, cloudBaseM: 1200 }), "cloudBase")).toBe("1200")
    })

    it("ties the crystals' alignment to the high deck alone, at 0 % as at any other value", () => {
      expect(valueOf(withWeather({ highCloudCover: 0.4, iceCrystalAlignment: 0 }), "iceCrystalAlignment")).toBe("0 %")
      expect(fields(withWeather({ cloudCover: 0.9, iceCrystalAlignment: 0.5 }))).not.toContain("iceCrystalAlignment")
    })

    it("names a rain that falls", () => {
      const raining = withWeather({ precipitationType: "rain", precipitationIntensity: 0.4 })
      expect(valueOf(raining, "precipitationType")).toBe("Rain")
      expect(valueOf(raining, "precipitationIntensity")).toBe("40 %")
    })

    it("names no rain that isn't falling", () => {
      // The renderer draws nothing at zero intensity, so a "Rain" chip would contradict the very
      // picture it sits under.
      expect(fields(withWeather({ precipitationType: "rain", precipitationIntensity: 0 }))).not.toContain("precipitationType")
    })
  })

  describe("a coordinate, where zero is a value and not a gap", () => {
    it("keeps a heading of due north", () => {
      const sighting = Sighting.create(undefined, [{ lat: 32.4, lng: -86.3 }])
      sighting.witnessTrack.addKeyframe(0, { lat: 32.4, lng: -86.3, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 60 })
      expect(valueOf(sighting, "heading")).toBe("0")
      expect(valueOf(sighting, "pitch")).toBe("0")
    })

    it("keeps Greenwich's own offset", () => {
      const sighting = Sighting.create(undefined, [{ lat: 51.5, lng: 0 }])
      sighting.event.utcOffsetHours = 0
      expect(valueOf(sighting, "utcOffsetHours")).toBe("0")
    })

    it("keeps a longitude on the prime meridian", () => {
      const sighting = Sighting.create(undefined, [{ lat: 51.5, lng: 0 }])
      sighting.witnessTrack.addKeyframe(0, { lat: 51.5, lng: 0, elevationM: 0, headingDeg: 12, pitchDeg: 3, fovDeg: 60 })
      expect(valueOf(sighting, "lng")).toBe("0")
    })
  })
})
