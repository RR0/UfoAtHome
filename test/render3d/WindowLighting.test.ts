import { describe, expect, it } from "vitest"
import { WindowLighting } from "../../src/render3d/WindowLighting.js"

describe("WindowLighting", () => {
  it("lights most windows in the evening, few at three in the morning, more as the town gets up", () => {
    expect(WindowLighting.shareAt(21)).toBeGreaterThan(0.4)
    expect(WindowLighting.shareAt(3)).toBeLessThan(0.08)
    expect(WindowLighting.shareAt(21)).toBeGreaterThan(WindowLighting.shareAt(0))
    expect(WindowLighting.shareAt(0)).toBeGreaterThan(WindowLighting.shareAt(3))
    expect(WindowLighting.shareAt(6.5)).toBeGreaterThan(WindowLighting.shareAt(4))
  })

  it("is smooth between the hours, wraps round midnight, and says a middling share where the hour is not known", () => {
    expect(WindowLighting.shareAt(21.5)).toBeCloseTo((WindowLighting.shareAt(21) + WindowLighting.shareAt(22)) / 2)
    expect(WindowLighting.shareAt(23.5)).toBeCloseTo((WindowLighting.shareAt(23) + WindowLighting.shareAt(0)) / 2)
    expect(WindowLighting.shareAt(-1)).toBe(WindowLighting.shareAt(23))
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
