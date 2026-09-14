import { describe, expect, it } from "vitest"
import { AdaptiveResolution } from "../../src/render3d/AdaptiveResolution.js"

/** Frames at a steady interval, until `nowMs` — the policy's only input without a card timer. */
function frames(resolution: AdaptiveResolution, from: number, until: number, intervalMs: number): number[] {
  const changes: number[] = []
  for (let now = from; now <= until; now += intervalMs) {
    const ratio = resolution.update(now, intervalMs)
    if (ratio !== undefined) changes.push(ratio)
  }
  return changes
}

describe("AdaptiveResolution without a card timer", () => {
  it("starts at the display's ratio, capped at what it is given", () => {
    expect(new AdaptiveResolution(2).pixelRatio).toBe(2)
    expect(new AdaptiveResolution(3).pixelRatio).toBe(3)
    expect(new AdaptiveResolution(1.5).pixelRatio).toBe(1.5)
    expect(new AdaptiveResolution(0.3).pixelRatio).toBe(AdaptiveResolution.MIN_RATIO)
    expect(new AdaptiveResolution(NaN).pixelRatio).toBe(AdaptiveResolution.MIN_RATIO)
  })

  it("keeps every pixel while the frames are on time", () => {
    const resolution = new AdaptiveResolution(2)
    expect(frames(resolution, 0, 10000, 16.7)).toEqual([])
    expect(resolution.pixelRatio).toBe(2)
  })

  it("comes down a step at a time while the frames are late, and no further than one", () => {
    const resolution = new AdaptiveResolution(2)
    const changes = frames(resolution, 0, 6000, 40)
    expect(changes).toEqual([1.75, 1.5, 1.25, 1])
    expect(resolution.pixelRatio).toBe(1)
  })

  it("waits between two steps down, so one bad frame is not four steps", () => {
    const resolution = new AdaptiveResolution(2)
    // Three seconds of late frames at the cooldown's own pace: one step per cooldown.
    const changes = frames(resolution, 0, AdaptiveResolution.LOWER_COOLDOWN_MS * 2 + 100, 40)
    expect(changes.length).toBeLessThanOrEqual(3)
  })

  it("probes a step back up once the frames are on time, and keeps it when they stay so", () => {
    const resolution = new AdaptiveResolution(2)
    frames(resolution, 0, 6000, 40)
    expect(resolution.pixelRatio).toBe(1)
    const changes = frames(resolution, 6100, 60000, 16.7)
    expect(changes[0]).toBe(1.25)
    expect(resolution.pixelRatio).toBe(2)
    // Only upward, since the frames stayed on time throughout.
    expect(changes).toEqual([1.25, 1.5, 1.75, 2])
  })

  it("undoes a probe that made the frames late, and does not try again for a long while", () => {
    const resolution = new AdaptiveResolution(2)
    frames(resolution, 0, 6000, 40)
    expect(resolution.pixelRatio).toBe(1)
    // On time long enough for a probe up...
    let now = 6100
    let probed: number | undefined
    while (now < 30000 && probed === undefined) {
      probed = resolution.update(now, 16.7)
      now += 16.7
    }
    expect(probed).toBe(1.25)
    // ...then late again at once: back down, and quiet for the backoff.
    const reverted = frames(resolution, now, now + 1000, 40)
    expect(reverted).toEqual([1])
    const quiet = frames(resolution, now + 1000, now + AdaptiveResolution.PROBE_BACKOFF_MS - 1000, 16.7)
    expect(quiet).toEqual([])
    expect(resolution.pixelRatio).toBe(1)
  })

  it("never rises above a maximum lowered by the page, and drops to it at once", () => {
    const resolution = new AdaptiveResolution(2)
    resolution.maximum = 1.5
    expect(resolution.pixelRatio).toBe(1.5)
    frames(resolution, 0, 6000, 40)
    expect(resolution.pixelRatio).toBe(1)
    frames(resolution, 6100, 60000, 16.7)
    expect(resolution.pixelRatio).toBe(1.5)
  })

  it("ignores an interval that is no frame at all", () => {
    const resolution = new AdaptiveResolution(2)
    expect(resolution.update(0, 0)).toBeUndefined()
    expect(resolution.update(5000, 5000)).toBeUndefined()
    expect(resolution.pixelRatio).toBe(2)
  })
})

describe("AdaptiveResolution and what is being redrawn", () => {
  /** A late frame every 30 ms from `from` to `until`, with a change noted at each when `changing`. */
  function run(resolution: AdaptiveResolution, from: number, until: number, changing: boolean): number {
    let ratio = resolution.pixelRatio
    for (let now = from; now <= until; now += 30) {
      if (changing) resolution.noteChange(now)
      ratio = resolution.ratioFor(now, 30)
    }
    return ratio
  }

  it("keeps every pixel for a picture that only twinkles, however late its frames", () => {
    expect(run(new AdaptiveResolution(2), 0, 10000, false)).toBe(2)
  })

  it("trades pixels for frames while changes keep coming, and gives them back once they stop", () => {
    const resolution = new AdaptiveResolution(2)
    expect(run(resolution, 0, 5000, true)).toBeLessThan(2)
    expect(run(resolution, 5030, 5030 + AdaptiveResolution.SETTLE_MS + 60, false)).toBe(2)
  })

  it("draws a single change, a click, at every pixel", () => {
    const resolution = new AdaptiveResolution(2)
    run(resolution, 0, 5000, true)
    run(resolution, 5030, 6000, false)
    resolution.noteChange(7000)
    expect(resolution.ratioFor(7010, 30)).toBe(2)
  })

  it("resumes a motion at the ratio the last one had found, not from the top", () => {
    const resolution = new AdaptiveResolution(2)
    const lowered = run(resolution, 0, 5000, true)
    run(resolution, 5030, 6000, false)
    expect(run(resolution, 7000, 7000 + AdaptiveResolution.SUSTAINED_MS + 30, true)).toBe(lowered)
  })
})
