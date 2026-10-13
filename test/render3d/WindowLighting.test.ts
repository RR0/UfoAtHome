import { describe, expect, it } from "vitest"
import { WindowLighting } from "../../src/render3d/WindowLighting.js"

describe("WindowLighting", () => {
  it("has half of the people awake at the median bedtime and at the median rising time of the survey", () => {
    expect(WindowLighting.awakeAt(WindowLighting.MEDIAN_BEDTIME)).toBeCloseTo(0.5, 1)
    expect(WindowLighting.awakeAt(WindowLighting.MEDIAN_RISING)).toBeCloseTo(0.5, 1)
  })

  it("has at least nine in ten asleep from one to six in the morning, as the survey says", () => {
    for (let hour = 1; hour <= 6; hour += 0.25) expect(WindowLighting.awakeAt(hour)).toBeLessThanOrEqual(0.1)
  })

  it("keeps a few up at any hour, and everybody up in the afternoon", () => {
    for (let hour = 0; hour < 24; hour += 0.5) expect(WindowLighting.awakeAt(hour)).toBeGreaterThanOrEqual(WindowLighting.ALWAYS_UP)
    expect(WindowLighting.awakeAt(15)).toBeGreaterThan(0.99)
  })

  it("lights most windows in the evening, practically none at four in the morning, more as the town gets up", () => {
    expect(WindowLighting.shareAt(21)).toBeGreaterThan(0.4)
    expect(WindowLighting.shareAt(3)).toBeLessThan(0.02)
    expect(WindowLighting.shareAt(4)).toBeLessThanOrEqual(0.015)
    expect(WindowLighting.shareAt(21)).toBeGreaterThan(WindowLighting.shareAt(0))
    expect(WindowLighting.shareAt(0)).toBeGreaterThan(WindowLighting.shareAt(3))
    expect(WindowLighting.shareAt(6.5)).toBeGreaterThan(WindowLighting.shareAt(4))
    expect(WindowLighting.shareAt(7)).toBeGreaterThan(WindowLighting.shareAt(6))
  })

  it("is continuous, wraps round midnight, and says a middling share where the hour is not known", () => {
    for (let hour = 0; hour < 24; hour += 0.1) expect(Math.abs(WindowLighting.shareAt(hour + 0.1) - WindowLighting.shareAt(hour))).toBeLessThan(0.04)
    expect(WindowLighting.shareAt(-1)).toBeCloseTo(WindowLighting.shareAt(23))
    expect(WindowLighting.shareAt(25)).toBeCloseTo(WindowLighting.shareAt(1))
    expect(WindowLighting.shareAt(undefined)).toBe(WindowLighting.UNKNOWN_HOUR)
    expect(WindowLighting.shareAt(Number.NaN)).toBe(WindowLighting.UNKNOWN_HOUR)
  })

  it("lights none by day whatever the hour, all of the hour's share once the twilight is over, and a ramp between", () => {
    expect(WindowLighting.share(30, 21)).toBe(0)
    expect(WindowLighting.share(-1, 21)).toBe(0)
    expect(WindowLighting.share(-12, 21)).toBeCloseTo(WindowLighting.shareAt(21))
    const dusk = WindowLighting.share(-5, 21)
    expect(dusk).toBeGreaterThan(0)
    expect(dusk).toBeLessThan(WindowLighting.shareAt(21))
  })
})
