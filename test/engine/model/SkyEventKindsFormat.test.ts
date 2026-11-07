import { describe, expect, it } from "vitest"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"

describe("the events of the sky of a kind a module brings", () => {
  it("are read and written back as they were, beside the built-in kinds, whether or not this page knows the kind", () => {
    const skyEvents = { ballLightning: [{ id: "b1", sizeM: 0.3 }], beams: [{ id: "l", path: [{ eastM: 0, northM: 0, altitudeM: 1 }, { eastM: 100, northM: 0, altitudeM: 50 }], wavelengthNm: 532, powerW: 1 }] }
    const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 3, timeline: { keyframes: [] }, skyEvents } as never))))
    expect(written.skyEvents).toEqual(skyEvents)
  })

  it("leave out a kind that states nothing", () => {
    const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 3, timeline: { keyframes: [] }, skyEvents: { ballLightning: [] } }))))
    expect(written.skyEvents).toBeUndefined()
  })
})
