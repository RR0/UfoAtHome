import { describe, expect, it } from "vitest"
import { INSTRUMENTS, Instruments } from "../../src/engine/instrument/Instrument.js"
import type { Instrument } from "../../src/engine/instrument/Instrument.js"

describe("Instruments", () => {
  describe("the star a bright light grows, which belongs to the aperture and not to the style", () => {
    it("gives an eye none at all", () => {
      // The correction this exists for: the scene drew a six-pointed Sun for every sighting,
      // including the ones somebody simply looked up at. An eye has no blades and no straight edge
      // to diffract at, so a bright light in it is ROUND — which is what every photograph taken
      // through a wide-open phone lens shows too, and what the reader was seeing in ours instead.
      expect(Instruments.starPointsOf(Instruments.default)).toBe(0)
      expect(Instruments.default.apertureBlades).toBeUndefined()
    })

    it("counts an even blade count once and an odd one twice, which is what parallel edges do", () => {
      // Each straight blade throws a pair of spikes across itself. With an even count the opposite
      // blades are parallel and their spikes land on each other; with an odd count none are, so
      // every blade keeps its own pair. Six blades, six spikes; five blades, ten.
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 6 })).toBe(6)
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 8 })).toBe(8)
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 5 })).toBe(10)
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 7 })).toBe(14)
    })

    it("treats an aperture too round to have corners as having none", () => {
      // Two blades cannot close a polygon, and a lens shot wide open has swung its blades clear of
      // the beam entirely — both are round openings, and a round opening has no edge to diffract at.
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 0 })).toBe(0)
      expect(Instruments.starPointsOf({ id: "x", name: "x", projection: "rectilinear", apertureBlades: 2 })).toBe(0)
    })

    it("gives the camera preset a real count, so a photographed Sun is starred and a seen one is not", () => {
      const camera = INSTRUMENTS.find(instrument => instrument.id === "rectilinear-lens")!
      expect(Instruments.starPointsOf(camera)).toBeGreaterThan(0)
    })
  })
  describe("the format, which is the picture a device actually makes", () => {
    const byId = (id: string): Instrument => INSTRUMENTS.find(instrument => instrument.id === id)!

    it("derives the field from the millimetres rather than being told an angle", () => {
      // 2·atan(h / 2f), and nothing else. The 50 mm lens on a 24 mm-tall frame gives the 27 degrees
      // everybody who has used one knows, and the 43 mm lens on a square 28 mm frame gives 36.
      expect(Instruments.fieldOfViewDeg(byId("slr-35mm-50"))).toBeCloseTo(26.99, 1)
      expect(Instruments.fieldOfViewDeg(byId("instamatic-126"))).toBeCloseTo(36.06, 1)
      // A phone's "26 mm equivalent": 53 degrees tall held sideways, 67 across.
      expect(Instruments.fieldOfViewDeg(byId("phone-landscape"))).toBeCloseTo(53.13, 1)
    })

    it("makes holding a phone upright a different picture, not a rotated one", () => {
      const upright = byId("phone-portrait")
      const sideways = byId("phone-landscape")
      // The same silicon: the two fields are each other's, swapped.
      expect(Instruments.fieldOfViewDeg(upright)).toBeCloseTo(67.38, 1)
      expect(Instruments.aspectOf(upright)).toBeCloseTo(1 / Instruments.aspectOf(sideways), 6)
      // And the upright one is TALLER than it is wide, which no other entry here is.
      expect(Instruments.aspectOf(upright)).toBeLessThan(1)
      expect(Instruments.aspectOf(sideways)).toBeGreaterThan(1)
    })

    it("keeps a square frame square, which is the whole point of stating a format", () => {
      expect(Instruments.aspectOf(byId("instamatic-126"))).toBe(1)
    })

    it("leaves an eye, and a camera nobody identified, with no frame at all", () => {
      // The absence is the statement: an eye has no rectangle, and inventing one for an
      // unidentified camera would be inventing evidence. Both fall back to the scene's own shape.
      expect(Instruments.default.frame).toBeUndefined()
      expect(byId("rectilinear-lens").frame).toBeUndefined()
      expect(Instruments.aspectOf(Instruments.default)).toBeCloseTo(16 / 9, 6)
      expect(Instruments.fieldOfViewDeg(Instruments.default)).toBe(Instruments.UNAIDED_FIELD_DEG)
    })
  })

  describe("the catalogue's dates", () => {
    it("offers nobody a telephone in 1964, and no Instamatic today", () => {
      const ids = (year: number | undefined) => Instruments.availableAt(year).map(instrument => instrument.id)
      expect(ids(1964)).toContain("instamatic-126")
      expect(ids(1964)).toContain("slr-35mm-50")
      expect(ids(1964)).not.toContain("phone-portrait")
      expect(ids(2020)).toContain("phone-portrait")
      expect(ids(2020)).not.toContain("instamatic-126")
      // Before any of them: the eye, and a camera stated so generically that no date bounds it.
      expect(ids(1900)).toEqual(["eye", "rectilinear-lens"])
      // An undated sighting is not an argument for hiding anything.
      expect(ids(undefined).length).toBe(INSTRUMENTS.length)
    })

    it("still resolves a device a file names out of its own time, since the record is the record", () => {
      // availableAt narrows a CHOICE. byId reports what the file claims; correcting it silently
      // would be this project editing testimony.
      expect(Instruments.byId("phone-portrait").id).toBe("phone-portrait")
    })
  })
})
