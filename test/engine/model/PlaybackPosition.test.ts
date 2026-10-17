import { describe, expect, it } from "vitest"
import { PlaybackPosition } from "../../../src/engine/model/PlaybackPosition.js"

describe("PlaybackPosition", () => {
  describe("a length of time from the start of the observation", () => {
    it.each([
      ["90", 90], ["90.5", 90.5], ["0", 0], ["1:30", 90], ["01:30", 90], ["1:02:03", 3723], ["2:05.5", 125.5],
      ["1m30s", 90], ["90s", 90], ["2m", 120], ["1h", 3600], ["1h2m3s", 3723], ["1.5m", 90], ["PT1M30S", 90], ["pt90s", 90], ["PT2M", 120]
    ])("reads %s as %s seconds", (text, seconds) => {
      expect(PlaybackPosition.delta(text)).toBe(seconds)
    })

    it.each(["", "  ", "abc", "1:75", "1:2:99", "-5", "1m30", "m", "PT", "02:33T"])("reads %j as none", text => {
      expect(PlaybackPosition.delta(text)).toBeUndefined()
    })

    it("reads what is missing as none", () => {
      expect(PlaybackPosition.delta(null)).toBeUndefined()
      expect(PlaybackPosition.delta(undefined)).toBeUndefined()
    })
  })

  describe("a time said during the observation", () => {
    it.each([
      ["02:33", { hour: 2, minute: 33, second: 0 }],
      ["2:33:15", { hour: 2, minute: 33, second: 15 }],
      ["T02:33:15", { hour: 2, minute: 33, second: 15 }],
      ["2026-08-11T02:33:15", { hour: 2, minute: 33, second: 15, date: { year: 2026, month: 8, day: 11 } }],
      ["2026-08-11 02:33", { hour: 2, minute: 33, second: 0, date: { year: 2026, month: 8, day: 11 } }]
    ])("reads %s", (text, clock) => {
      expect(PlaybackPosition.clock(text)).toEqual(clock)
    })

    it.each(["125", "1:30s", "24:00", "02:60", "02:33:61", "2026-13-01T02:33", "PT1M30S", "", "02h33"])("does not read %j as a time", text => {
      expect(PlaybackPosition.clock(text)).toBeUndefined()
      expect(PlaybackPosition.isClock(text)).toBe(false)
    })

    it("tells a time from a length: 1:30 is both by its shape, and `t` is the one that is a time", () => {
      expect(PlaybackPosition.isClock("02:33")).toBe(true)
      expect(PlaybackPosition.isClock("125")).toBe(false)
    })
  })

  describe("how far from the start of the observation a time is", () => {
    const start = { year: 2026, month: 8, day: 11, hour: 2, minute: 30 }

    it("is the difference, in the same local time", () => {
      expect(PlaybackPosition.elapsedSince(start, PlaybackPosition.clock("02:33:15")!)).toBe(195)
      expect(PlaybackPosition.elapsedSince(start, PlaybackPosition.clock("2026-08-11T02:31")!)).toBe(60)
      expect(PlaybackPosition.elapsedSince(start, PlaybackPosition.clock("2026-08-11T03:30")!)).toBe(3600)
    })

    it("is the start for a time before it, which was not recorded", () => {
      expect(PlaybackPosition.elapsedSince(start, PlaybackPosition.clock("02:10")!)).toBe(0)
      expect(PlaybackPosition.elapsedSince(start, PlaybackPosition.clock("2026-08-10T23:00")!)).toBe(0)
    })

    it("goes over midnight: a time half a day earlier than the start is the next day's", () => {
      const late = { year: 2026, month: 8, day: 10, hour: 23, minute: 50 }
      expect(PlaybackPosition.elapsedSince(late, PlaybackPosition.clock("00:05")!)).toBe(15 * 60)
      expect(PlaybackPosition.elapsedSince(late, PlaybackPosition.clock("2026-08-11T00:05")!)).toBe(15 * 60)
    })

    it("says nothing when the start does not say its time of day, or its day for a time given with one", () => {
      expect(PlaybackPosition.elapsedSince({ year: 2026 }, PlaybackPosition.clock("02:33")!)).toBeUndefined()
      expect(PlaybackPosition.elapsedSince(undefined, PlaybackPosition.clock("02:33")!)).toBeUndefined()
      expect(PlaybackPosition.elapsedSince({ hour: 2, minute: 30 }, PlaybackPosition.clock("02:33")!)).toBe(180)
      expect(PlaybackPosition.elapsedSince({ hour: 2, minute: 30 }, PlaybackPosition.clock("2026-08-11T02:33")!)).toBeUndefined()
    })
  })
})
