import { describe, expect, it } from "vitest"
import { INSTRUMENTS, Instruments } from "../../src/engine/instrument/Instrument.js"

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
})
