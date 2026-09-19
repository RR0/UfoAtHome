import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HaloSky } from "../../src/engine/atmosphere/HaloSky.js"
import { IceHaloEffect } from "../../src/render3d/IceHaloEffect.js"

/**
 * A weather track may change the crystals' alignment during a recording. The display must follow
 * that change a tracing behind, not stay frozen while it lasts (every frame used to restart the
 * tracing from nothing).
 */
/** IceHaloEffect.ALIGNMENT_STEP: what the displays are traced to within. */
const ALIGNMENT_STEP = 0.05

describe("IceHaloEffect under a changing sky", () => {
  let frames: FrameRequestCallback[] = []
  let clockMs = 0
  const runFrames = (count: number) => {
    for (let i = 0; i < count && frames.length; i++) {
      const due = frames
      frames = []
      due.forEach(frame => frame(0))
    }
  }

  beforeEach(() => {
    frames = []
    clockMs = 0
    vi.spyOn(performance, "now").mockImplementation(() => clockMs)
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => frames.push(callback)
    globalThis.cancelAnimationFrame = () => { frames = [] }
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
    delete (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame
  })

  /** An effect whose tracer is a stand-in: a tracing takes FRAMES_PER_TRACING frames, and every
   * start is recorded with the alignment it was started for. */
  const FRAMES_PER_TRACING = 3
  const effect = () => {
    const halo = new IceHaloEffect()
    const begun: number[] = []
    let traced = 0
    const sky = {
      begin: (_altitude: number, alignment: number) => { begun.push(alignment); traced = 0 },
      // Each batch spends more than a frame's budget, so a frame traces one batch.
      trace: () => { traced += 300_000; clockMs += 10 },
      get tracedRays() { return traced },
      harvest: () => ({ data: new Float32Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 3) })
    }
    // A batch is 300 000 of the 900 000 rays a display is worth: three frames a tracing.
    Object.assign(halo, { sky })
    const update = (alignment: number, altitude = 20) =>
      halo.update({ x: 0, y: 0.34, z: -0.94 }, altitude, 0.8, [1, 1, 1], { cover: 0.8, layerHeight: 1 }, alignment)
    return { halo, begun, update, mapped: () => (halo as unknown as { mappedAlignment: number }).mappedAlignment }
  }

  it("keeps tracing through a gradual change, then traces where the change has got to", () => {
    const { begun, update, mapped } = effect()
    update(0.95)
    expect(begun).toEqual([0.95])
    // Twenty frames of a ramp, each a little further: none of them restarts the tracing under way.
    for (let i = 1; i <= 20; i++) {
      update(0.95 - i * 0.01)
      runFrames(1)
    }
    // Displays were finished and shown all along the ramp (before, every frame restarted the
    // tracing and none was ever shown), each a tracing behind the ramp: it has reached 0.75.
    expect(begun.length).toBeGreaterThanOrEqual(3)
    expect(mapped()).toBeLessThan(0.9)
    expect(mapped()).toBeGreaterThan(0.75)
    // And once the ramp stops, the display catches up with where it stopped, to within a step.
    runFrames(FRAMES_PER_TRACING * 3)
    expect(Math.abs(mapped() - 0.75)).toBeLessThan(ALIGNMENT_STEP)
    expect(frames).toHaveLength(0)
  })

  it("does not trace again for a change smaller than a step", () => {
    const { begun, update } = effect()
    update(0.6)
    runFrames(10)
    update(0.62)
    runFrames(10)
    expect(begun).toEqual([0.6])
  })

  it("abandons the tracing under way for a jump — a seek elsewhere in the recording", () => {
    const { begun, update } = effect()
    update(0.95)
    update(0.3)
    expect(begun).toEqual([0.95, 0.3])
  })
})
