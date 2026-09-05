import { afterEach, describe, expect, it, vi } from "vitest"
import { StarCatalogs } from "../../src/render3d/StarCatalog.js"

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

describe("StarCatalogs.load", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("parses the binary layout (ra/dec/mag/ci sections) round-trip", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(fixtureBuffer()) })
    vi.stubGlobal("fetch", fetchMock)

    const catalog = await StarCatalogs.load("https://example.test/stars.bin")

    expect(catalog.count).toBe(2)
    expect(Array.from(catalog.ra)).toEqual([1.5, 2.5])
    expect(Array.from(catalog.dec)).toEqual([10, -20])
    expect(catalog.mag[1]).toBeCloseTo(7.4, 5)
    expect(catalog.ci[0]).toBeCloseTo(0.65, 5)
  })

  it("fetches a given URL only once, caching subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(fixtureBuffer()) })
    vi.stubGlobal("fetch", fetchMock)

    await StarCatalogs.load("https://example.test/cached.bin")
    await StarCatalogs.load("https://example.test/cached.bin")

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("StarCatalogs.upTo, which is how an instrument picks its own catalogue", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const tier = (mags: number[]): ArrayBuffer => {
    const buffer = new ArrayBuffer(4 * mags.length * Float32Array.BYTES_PER_ELEMENT)
    const section = mags.length * Float32Array.BYTES_PER_ELEMENT
    const view = new Uint8Array(buffer)
    view.set(new Uint8Array(new Float32Array(mags.map((_, i) => i + 1)).buffer), 0)
    view.set(new Uint8Array(new Float32Array(mags.map((_, i) => -i)).buffer), section)
    view.set(new Uint8Array(new Float32Array(mags).buffer), 2 * section)
    view.set(new Uint8Array(new Float32Array(mags.map(() => 0.5)).buffer), 3 * section)
    return buffer
  }

  // Fresh URLs per case: the loader's cache is module-level on purpose (several <rr0-scene> on one
  // page share one download), so reusing a URL between tests would test the cache rather than the
  // tiering.
  let suite = 0
  const freshTiers = (): { magnitudeLimit: number; url: string }[] => {
    suite++
    return [
      { magnitudeLimit: 7.5, url: `https://example.test/base-${suite}.bin` },
      { magnitudeLimit: 9, url: `https://example.test/deep-${suite}.bin` }
    ]
  }

  const serve = (): ReturnType<typeof vi.fn> => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve(url.includes("deep") ? tier([8, 8.5]) : tier([1, 7])) })
    )
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("fetches the base tier alone for an eye, which is what most recordings are", async () => {
    // The whole point of tiering: a witness who looked up must not download 900 kB of stars nobody
    // standing there could have seen.
    const fetchMock = serve()
    const catalog = await StarCatalogs.upTo(freshTiers(), 6.5)

    expect(catalog.count).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("base")
  })

  it("adds the deep tier only once the instrument reaches past the base cut", async () => {
    const fetchMock = serve()
    const catalog = await StarCatalogs.upTo(freshTiers(), 8.2)

    expect(catalog.count).toBe(4)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the whole thing sorted, which the renderer's early stop depends on", async () => {
    // Concatenation is only enough because every star of a deeper tier is fainter than every star
    // of the one before it. If that ever stopped being true, buildStars would stop drawing at the
    // first star of the second tier and the sky would silently lose everything behind it.
    serve()
    const catalog = await StarCatalogs.upTo(freshTiers(), 9)

    expect(Array.from(catalog.mag)).toEqual([1, 7, 8, 8.5])
    for (let i = 1; i < catalog.count; i++) expect(catalog.mag[i]).toBeGreaterThanOrEqual(catalog.mag[i - 1])
  })
})
