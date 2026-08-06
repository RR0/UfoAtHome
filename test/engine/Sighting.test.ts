import { describe, expect, it } from "vitest"
import {
  sightingDurationMs,
  sightingDurationBlockedReason,
  sightingTimeToMs,
  parseEdtfTime,
  formatEdtfTime
} from "../../src/engine/model/Sighting.js"

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

  it("computes from time/endTime even with no year at all — just start 0 min, end 10 min", () => {
    const event = { eventType: "sighting" as const, time: { minute: 0 }, endTime: { minute: 10 } }
    expect(sightingDurationMs(event)).toBe(10 * 60 * 1000)
  })

  it("falls back to a relative day/hour/minute/second offset when only one side has a year", () => {
    const event = {
      eventType: "sighting" as const,
      time: { year: 1948, hour: 2, minute: 45 },
      endTime: { hour: 2, minute: 50 }
    }
    expect(sightingDurationMs(event)).toBe(5 * 60 * 1000)
  })

  it("is undefined when time/endTime are known to different precisions (a real ambiguity, not just missing data)", () => {
    const event = {
      eventType: "sighting" as const,
      time: { hour: 2, minute: 45 },
      endTime: { minute: 50 } // no hour — could be any hour, not necessarily the same one as time
    }
    expect(sightingDurationMs(event)).toBeUndefined()
  })

  it("computes a duration from date-less EDTF times typed directly as hh:mm (no date known at all)", () => {
    const event = {
      eventType: "sighting" as const,
      time: parseEdtfTime("22:00"),
      endTime: parseEdtfTime("22:30")
    }
    expect(sightingDurationMs(event)).toBe(30 * 60 * 1000)
  })

  it("treats a missing second as :00 rather than blocking — a witness typing seconds on only one side shouldn't lose the duration", () => {
    const event = {
      eventType: "sighting" as const,
      time: { year: 1926, month: 8, day: 12, hour: 10, minute: 18 },
      endTime: { year: 1926, month: 8, day: 12, hour: 10, minute: 20, second: 30 }
    }
    expect(sightingDurationMs(event)).toBe((2 * 60 + 30) * 1000)
  })
})

describe("sightingDurationBlockedReason", () => {
  it("is undefined when nothing is entered — nothing to explain", () => {
    expect(sightingDurationBlockedReason({ eventType: "sighting" })).toBeUndefined()
    expect(sightingDurationBlockedReason({ eventType: "sighting", time: { year: 1948 } })).toBeUndefined()
  })

  it("is undefined when a duration is actually computable", () => {
    const event = { eventType: "sighting" as const, time: { minute: 0 }, endTime: { minute: 10 } }
    expect(sightingDurationBlockedReason(event)).toBeUndefined()
  })

  it("is undefined when durationSeconds is set explicitly, even with mismatched dates alongside it", () => {
    const event = {
      eventType: "sighting" as const,
      durationSeconds: 90,
      time: { hour: 2, minute: 45 },
      endTime: { minute: 50 }
    }
    expect(sightingDurationBlockedReason(event)).toBeUndefined()
  })

  it("is 'imprecise' when both sides are entered but too mismatched to compute an exact duration", () => {
    const event = {
      eventType: "sighting" as const,
      time: { hour: 2, minute: 45 },
      endTime: { minute: 50 }
    }
    expect(sightingDurationBlockedReason(event)).toBe("imprecise")
  })
})

describe("parseEdtfTime", () => {
  it("parses a plain year", () => {
    expect(parseEdtfTime("1948")).toEqual({
      year: 1948,
      month: undefined,
      day: undefined,
      hour: undefined,
      minute: undefined,
      second: undefined,
      raw: "1948"
    })
  })

  it("parses a full date and time with seconds", () => {
    expect(parseEdtfTime("1948-07-24T02:45:30")).toEqual({
      year: 1948,
      month: 7,
      day: 24,
      hour: 2,
      minute: 45,
      second: 30,
      raw: "1948-07-24T02:45:30"
    })
  })

  it("accepts each Level 1 qualifier suffix", () => {
    for (const qualifier of ["?", "~", "%"]) {
      expect(parseEdtfTime(`2025-06${qualifier}`)).toMatchObject({ year: 2025, month: 6, raw: `2025-06${qualifier}` })
    }
  })

  it("treats a masked year as unknown, not a guessed number", () => {
    expect(parseEdtfTime("199X")?.year).toBeUndefined()
    expect(parseEdtfTime("19XX")?.year).toBeUndefined()
  })

  it("trims surrounding whitespace", () => {
    expect(parseEdtfTime("  1948  ")?.raw).toBe("1948")
  })

  it("returns undefined for garbage that doesn't match EDTF syntax", () => {
    expect(parseEdtfTime("not a date")).toBeUndefined()
    expect(parseEdtfTime("1948-13-01")).toBeUndefined() // month 13
    expect(parseEdtfTime("1948-07-24T25:00")).toBeUndefined() // hour 25
  })

  it("parses a bare hh:mm with no date at all — year/month/day stay undefined", () => {
    expect(parseEdtfTime("22:30")).toEqual({
      year: undefined,
      month: undefined,
      day: undefined,
      hour: 22,
      minute: 30,
      second: undefined,
      raw: "22:30"
    })
  })

  it("parses a bare hh:mm:ss with no date", () => {
    expect(parseEdtfTime("22:30:15")).toMatchObject({ hour: 22, minute: 30, second: 15, year: undefined })
  })

  it("accepts a qualifier suffix on a date-less time too", () => {
    expect(parseEdtfTime("22:30?")).toMatchObject({ hour: 22, minute: 30, raw: "22:30?" })
  })

  it("rejects an out-of-range date-less time", () => {
    expect(parseEdtfTime("25:00")).toBeUndefined() // hour 25
    expect(parseEdtfTime("22:60")).toBeUndefined() // minute 60
  })
})

describe("formatEdtfTime", () => {
  it("returns raw verbatim when present, qualifiers and all", () => {
    expect(formatEdtfTime({ year: 2025, month: 6, raw: "2025-06?" })).toBe("2025-06?")
  })

  it("formats from numeric fields when raw is absent (legacy/hand-authored data)", () => {
    expect(formatEdtfTime({ year: 1948, month: 7, day: 24, hour: 2, minute: 45 })).toBe("1948-07-24T02:45")
    expect(formatEdtfTime({ year: 1948 })).toBe("1948")
  })

  it("round-trips through parseEdtfTime", () => {
    const raw = "1965-07-01T05:10:30"
    expect(formatEdtfTime(parseEdtfTime(raw)!)).toBe(raw)
  })

  it("formats a year-less time (hour set, year absent) as a bare hh:mm, even with no raw", () => {
    expect(formatEdtfTime({ hour: 22, minute: 30 })).toBe("22:30")
    expect(formatEdtfTime({ hour: 22, minute: 30, second: 15 })).toBe("22:30:15")
  })

  it("round-trips a date-less time through parseEdtfTime", () => {
    expect(formatEdtfTime(parseEdtfTime("22:30")!)).toBe("22:30")
  })
})
