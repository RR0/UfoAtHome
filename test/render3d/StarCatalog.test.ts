import { afterEach, describe, expect, it, vi } from "vitest"
import { loadStarCatalog } from "../../src/render3d/StarCatalog.js"

function fixtureBuffer(): ArrayBuffer {
  const ra = new Float32Array([1.5, 2.5])
  const dec = new Float32Array([10, -20])
  const mag = new Float32Array([0.5, 7.4])
  const ci = new Float32Array([0.65, 1.2])
  const buffer = new ArrayBuffer(4 * 2 * Float32Array.BYTES_PER_ELEMENT)
  const view = new Uint8Array(buffer)
  view.set(new Uint8Array(ra.buffer), 0)
  view.set(new Uint8Array(dec.buffer), 8)
  view.set(new Uint8Array(mag.buffer), 16)
  view.set(new Uint8Array(ci.buffer), 24)
  return buffer
}

describe("loadStarCatalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("parses the binary layout (ra/dec/mag/ci sections) round-trip", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(fixtureBuffer()) })
    vi.stubGlobal("fetch", fetchMock)

    const catalog = await loadStarCatalog("https://example.test/stars.bin")

    expect(catalog.count).toBe(2)
    expect(Array.from(catalog.ra)).toEqual([1.5, 2.5])
    expect(Array.from(catalog.dec)).toEqual([10, -20])
    expect(catalog.mag[1]).toBeCloseTo(7.4, 5)
    expect(catalog.ci[0]).toBeCloseTo(0.65, 5)
  })

  it("fetches a given URL only once, caching subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(fixtureBuffer()) })
    vi.stubGlobal("fetch", fetchMock)

    await loadStarCatalog("https://example.test/cached.bin")
    await loadStarCatalog("https://example.test/cached.bin")

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
