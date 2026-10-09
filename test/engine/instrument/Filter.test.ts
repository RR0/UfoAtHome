import { describe, expect, it } from "vitest"
import { Filters } from "../../../src/engine/instrument/Filter.js"
import { Sighting } from "../../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"

describe("a filter in front of the instrument", () => {
  it("is none unless the recording names one, and unknown names fall back to none", () => {
    expect(Filters.byId(undefined)).toBe(Filters.NONE)
    expect(Filters.byId("from-the-future")).toBe(Filters.NONE)
    expect(Filters.byId("solar-visual").opticalDensity).toBe(5)
  })

  it("lets through ten to the minus density of the light", () => {
    expect(Filters.transmittance(Filters.SOLAR_VISUAL)).toBeCloseTo(1e-5, 12)
    expect(Filters.magnitudes(Filters.SOLAR_VISUAL)).toBeCloseTo(12.5, 10)
    expect(Filters.transmittance(Filters.NONE)).toBe(1)
  })

  it("is a pose field: written to the file, read back, and held between keyframes", () => {
    const sighting = Sighting.create({ year: 1999, month: 8, day: 11 })
    const pose = { elevationM: 0, pitchDeg: 40, fovDeg: 5 }
    sighting.observerTrack.addKeyframe(0, { ...pose, filter: "solar-visual" })
    sighting.observerTrack.addKeyframe(60000, { ...pose, filter: "none" })
    sighting.observerTrack.addKeyframe(120000, { ...pose })
    const back = fromSightingJson(toSightingJson(sighting))
    const at = (t: number) => Filters.byId(back.observerTrack.getInterpolatedPoseAt(t)?.filter).id
    expect(at(0)).toBe("solar-visual")
    // Held, never blended: not half a pair of glasses a minute in.
    expect(at(30000)).toBe("solar-visual")
    expect(at(59999)).toBe("solar-visual")
    expect(at(60000)).toBe("none")
    expect(at(90000)).toBe("none")
  })
})
