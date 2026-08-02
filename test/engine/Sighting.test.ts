import { describe, expect, it } from "vitest"
import { sightingDurationMs, sightingTimeToMs } from "../../src/engine/model/Sighting.js"

describe("sightingTimeToMs", () => {
  it("returns undefined without a year", () => {
    expect(sightingTimeToMs({ hour: 2, minute: 45 })).toBeUndefined()
  })

  it("defaults missing month/day/time-of-day fields", () => {
    expect(sightingTimeToMs({ year: 1948 })).toBe(Date.UTC(1948, 0, 1, 0, 0, 0))
  })

  it("uses all given fields", () => {
    expect(sightingTimeToMs({ year: 1948, month: 7, day: 24, hour: 2, minute: 45, second: 30 })).toBe(
      Date.UTC(1948, 6, 24, 2, 45, 30)
    )
  })
})

describe("sightingDurationMs", () => {
  it("prefers durationSeconds when given, even alongside an endTime", () => {
    expect(
      sightingDurationMs({ eventType: "sighting", durationSeconds: 90, endTime: { year: 2000 } })
    ).toBe(90_000)
  })

  it("computes from time/endTime when durationSeconds is absent", () => {
    const event = {
      eventType: "sighting" as const,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      endTime: { year: 1948, month: 7, day: 24, hour: 2, minute: 50 }
    }
    expect(sightingDurationMs(event)).toBe(5 * 60 * 1000)
  })

  it("is undefined when neither durationSeconds nor a full time/endTime pair is known", () => {
    expect(sightingDurationMs({ eventType: "sighting", time: { year: 1948 } })).toBeUndefined()
    expect(sightingDurationMs({ eventType: "sighting" })).toBeUndefined()
  })
})
