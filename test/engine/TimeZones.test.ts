import { describe, expect, it } from "vitest"
import { TimeZones } from "../../src/engine/time/TimeZones.js"

const zones = new TimeZones()

describe("TimeZones", () => {
  it("reads summer time as it was THEN, not as it is now", () => {
    // France reintroduced summer time only in 1976 — July 1965 was UTC+1, July today is UTC+2.
    expect(zones.offsetHoursAt("Europe/Paris", { year: 1965, month: 7, day: 1, hour: 5, minute: 45 })).toBe(1)
    expect(zones.offsetHoursAt("Europe/Paris", { year: 2026, month: 7, day: 1, hour: 5, minute: 45 })).toBe(2)
  })

  it("lands on the right side of a summer-time change", () => {
    // 2026's US switch is the second Sunday of March.
    expect(zones.offsetHoursAt("America/Denver", { year: 2026, month: 3, day: 7, hour: 12 })).toBe(-7)
    expect(zones.offsetHoursAt("America/Denver", { year: 2026, month: 3, day: 15, hour: 12 })).toBe(-6)
  })

  it("gives Socorro's own 1964 date the offset its case file states", () => {
    // -7, and for a reason worth knowing: US summer time was not federal until 1967, and the IANA
    // database records no 1964 rule for this zone at all. The number agrees with the recording,
    // by a different route than the one the case notes assumed.
    expect(zones.offsetHoursAt("America/Denver", { year: 1964, month: 4, day: 24, hour: 17, minute: 50 })).toBe(-7)
  })

  it("handles a zone whose offset isn't a whole hour", () => {
    expect(zones.offsetHoursAt("Asia/Kolkata", { year: 2026, month: 1, day: 1, hour: 12 })).toBe(5.5)
  })

  it("reads UTC itself as zero", () => {
    expect(zones.offsetHoursAt("UTC", { year: 2026, month: 1, day: 1, hour: 12 })).toBe(0)
  })

  it("has no answer without a year to apply the rules of", () => {
    expect(zones.offsetHoursAt("Europe/Paris", { hour: 5, minute: 45 })).toBeUndefined()
  })

  it("has no answer for a zone the platform doesn't know", () => {
    expect(zones.offsetHoursAt("Mars/Olympus_Mons", { year: 2026, month: 1, day: 1 })).toBeUndefined()
  })

  it("offers the platform's own zone list", () => {
    const available = zones.available()
    expect(available).toContain("Europe/Paris")
    expect(available).toContain("America/Denver")
    // Sorted, so a picker over it is navigable.
    expect([...available].sort()).toEqual(available)
  })
})
