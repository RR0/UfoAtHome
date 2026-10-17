import { describe, expect, it } from "vitest"
import { ObserverAge } from "../../src/engine/model/ObserverAge.js"

describe("ObserverAge", () => {
  it("counts whole years, waiting for the birthday when both dates say the month and day", () => {
    const observation = { year: 1974, month: 3, day: 10 }
    expect(ObserverAge.at({ year: 1931, month: 3, day: 14 }, observation)).toBe(42)
    expect(ObserverAge.at({ year: 1931, month: 3, day: 10 }, observation)).toBe(43)
    expect(ObserverAge.at({ year: 1931, month: 2, day: 28 }, observation)).toBe(43)
  })

  it("takes the plain year difference when a date has no month, and nothing without a year", () => {
    expect(ObserverAge.at({ year: 1931 }, { year: 1974, month: 3, day: 10 })).toBe(43)
    expect(ObserverAge.at({ year: 1931, month: 3 }, { year: 1974 })).toBe(43)
    expect(ObserverAge.at({ month: 3 }, { year: 1974 })).toBeUndefined()
    expect(ObserverAge.at({ year: 1980 }, { year: 1974 })).toBeUndefined()
  })

  it("works a birth back from an age as an approximate year, never a day", () => {
    expect(ObserverAge.birthFor(43, { year: 1974, month: 3, day: 10 })).toEqual({ year: 1931, raw: "1931~" })
    expect(ObserverAge.birthFor(43, { month: 3 })).toBeUndefined()
  })

  it("tells a firm birth from an approximate one", () => {
    expect(ObserverAge.isFirm({ year: 1931, month: 3, day: 14, raw: "1931-03-14" })).toBe(true)
    expect(ObserverAge.isFirm({ year: 1931, raw: "1931~" })).toBe(false)
    expect(ObserverAge.isFirm({ year: 1931, raw: "1931?" })).toBe(false)
  })
})
