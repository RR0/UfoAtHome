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

  it("is written to the file and read back from it", () => {
    const sighting = Sighting.create({ year: 1999, month: 8, day: 11 })
    expect(toSightingJson(sighting).filter).toBeUndefined()
    sighting.filterId = "solar-visual"
    const json = toSightingJson(sighting)
    expect(json.filter).toBe("solar-visual")
    expect(fromSightingJson(json).filter.id).toBe("solar-visual")
  })
})
