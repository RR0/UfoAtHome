import { describe, expect, it } from "vitest"
import { Level2Date } from "@rr0/time"
import { Place } from "@rr0/place"
import { fromRR0Event, toRR0Event } from "../../src/engine/interop/rr0Data.js"
import type { SightingEvent } from "../../src/engine/model/Sighting.js"

describe("rr0Data interop", () => {
  it("converts a plain SightingEvent to a real RR0Event and back", () => {
    const sightingEvent: SightingEvent = {
      eventType: "sighting",
      time: { year: 1987, month: 6, day: 12 },
      place: [{ lat: 45.188529, lng: 5.724524 }],
      description: "A test sighting",
      tags: ["demo"]
    }

    const rr0Event = toRR0Event(sightingEvent)
    expect(rr0Event.time).toBeInstanceOf(Level2Date)
    expect(rr0Event.time?.year?.value).toBe(1987)
    expect(rr0Event.place).toBeInstanceOf(Place)
    expect(rr0Event.place?.locations[0].lat).toBeCloseTo(45.188529)

    const roundTripped = fromRR0Event(rr0Event)
    expect(roundTripped).toEqual(sightingEvent)
  })

  it("tolerates a sighting with no time/place", () => {
    const sightingEvent: SightingEvent = { eventType: "sighting" }
    const rr0Event = toRR0Event(sightingEvent)
    expect(rr0Event.time).toBeUndefined()
    expect(rr0Event.place).toBeUndefined()
  })
})
