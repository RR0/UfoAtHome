import { afterEach, describe, expect, it, vi } from "vitest"
import { SkyGlowMaps } from "../../src/render3d/SkyGlowEffect.js"
import { TracerPool } from "../../src/render3d/TracerPool.js"

/** The two maps are the same for every scene, so one walk serves a whole page: in a worker where
 * there is one, and on the page's own thread otherwise. */
describe("SkyGlowMaps", () => {
  afterEach(() => {
    (TracerPool as unknown as { pool: unknown }).pool = null
    vi.restoreAllMocks()
  })

  /** A pool that records what it was asked and answers when the test says so. */
  const withPool = () => {
    const asked: { done: (milkyWay: Uint16Array, zodiacal: Uint16Array) => void, failed: () => void, cancelled: boolean }[] = []
    ;(TracerPool as unknown as { pool: unknown }).pool = {
      glow: (done: (milkyWay: Uint16Array, zodiacal: Uint16Array) => void, failed: () => void) => {
        const job = { done, failed, cancelled: false }
        asked.push(job)
        return { cancel: () => { job.cancelled = true } }
      }
    }
    return asked
  }
  const fresh = () => new (SkyGlowMaps as unknown as new () => SkyGlowMaps)()

  it("hands the walk to the worker once for every scene that asks, and tells them all when it is back", () => {
    const asked = withPool()
    const maps = fresh()
    const ready = [vi.fn(), vi.fn()]
    ready.forEach(listener => maps.request(listener))
    expect(asked).toHaveLength(1)
    expect(maps.done).toBe(false)
    asked[0].done(new Uint16Array(maps.milkyWayTexels.length).fill(3), new Uint16Array(maps.zodiacalTexels.length).fill(5))
    expect(maps.done).toBe(true)
    expect(maps.milkyWayTexels[7]).toBe(3)
    expect(maps.zodiacalTexels[7]).toBe(5)
    ready.forEach(listener => expect(listener).toHaveBeenCalledTimes(1))
  })

  it("calls the walk off when nobody is left waiting for it", () => {
    const asked = withPool()
    const maps = fresh()
    const listener = vi.fn()
    maps.request(listener)
    maps.cancel(listener)
    expect(asked[0].cancelled).toBe(true)
  })

  it("walks on the page's own thread when the worker fails", () => {
    const asked = withPool()
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame))
    vi.stubGlobal("cancelAnimationFrame", () => undefined)
    const maps = fresh()
    maps.request(() => undefined)
    asked[0].failed()
    expect(frames).toHaveLength(1)
    vi.unstubAllGlobals()
  })
})
