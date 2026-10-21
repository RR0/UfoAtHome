import { describe, expect, test } from "vitest"
import { SkyEvents } from "../../../src/engine/model/SkyEvents.js"
import type { InterpretationJson } from "../../../src/engine/interpretation/Interpretation.js"
import { Sighting } from "../../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"

const beam = { id: "b", path: [{ lat: 48, lng: 2, altitudeM: 100 }, { lat: 48.1, lng: 2.1, altitudeM: 80 }], wavelengthNm: 532, powerW: 10 }
const launch = { id: "l", track: [{ t: 0, lat: 28, lng: -80, altitudeKm: 0 }, { t: 60000, lat: 30, lng: -78, altitudeKm: 150 }] }

describe("SkyEvents", () => {
  test("takes the events a recording wrote in its interpretation out of it, which is left out where nothing else of it is left", () => {
    const legacy = { title: "Old", bodies: [], beams: [beam], launches: [launch] } as unknown as InterpretationJson
    const read = SkyEvents.read(undefined, legacy)
    expect(read.skyEvents).toEqual({ beams: [beam], launches: [launch] })
    // A title is kept: it may be the observer's own words.
    expect(read.interpretation).toEqual({ title: "Old", bodies: [] })
    expect(SkyEvents.read(undefined, { bodies: [], beams: [beam] } as unknown as InterpretationJson).interpretation).toBeUndefined()
  })

  test("keeps an interpretation that states no event as it is, and adds what the recording states of its own", () => {
    const interpretation: InterpretationJson = { bodies: [] , title: "Craft" }
    const read = SkyEvents.read({ beams: [beam] }, interpretation)
    expect(read.interpretation).toBe(interpretation)
    expect(read.skyEvents).toEqual({ beams: [beam] })
  })

  test("is read from a recording and written back under skyEvents, never in the interpretation", () => {
    const minimal = toSightingJson(Sighting.create(undefined, [{ lat: 48, lng: 2 }]))
    const sighting = fromSightingJson({ ...minimal, interpretation: { bodies: [], launches: [launch] } as unknown as InterpretationJson })
    expect(sighting.interpretation).toBeUndefined()
    expect(sighting.skyEvents).toEqual({ launches: [launch] })
    const written = toSightingJson(sighting)
    expect(written.skyEvents).toEqual({ launches: [launch] })
    expect(written.interpretation).toBeUndefined()
  })

  test("writes nothing for kinds that state nothing", () => {
    expect(SkyEvents.written({ beams: [], launches: [] })).toBeUndefined()
    expect(SkyEvents.written({ beams: [beam], launches: [] })).toEqual({ beams: [beam] })
  })
})
