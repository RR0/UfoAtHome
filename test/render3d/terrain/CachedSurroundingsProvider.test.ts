import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CachedSurroundingsProvider } from "../../../src/render3d/terrain/CachedSurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../../../src/render3d/terrain/SurroundingsProvider.js"
import type { Surroundings, SurroundingsProvider } from "../../../src/render3d/terrain/SurroundingsProvider.js"

const PLACE = { lat: 49.1055258, lng: 2.7537538 }
const TREE = { eastM: 3, northM: 4, heightM: 12, widthM: 6 }

/** A survey that counts how often it is asked, and fails while `failing` says so. */
class Counting implements SurroundingsProvider {
  readonly name = "Counting"
  readonly attribution = "©"
  readonly creditUrl = "https://example.org"
  readonly contemporary = true
  asked = 0
  failing = false
  constructor(readonly id = "counting") {}
  covers(): boolean { return true }
  async getSurroundings(): Promise<Surroundings> {
    this.asked++
    if (this.failing) throw new SurroundingsUnavailableError("unreachable", "down")
    return { trees: [{ ...TREE }], buildings: [], bridges: [], lines: [] }
  }
}

/** The Cache API as a browser has it, enough of it for one cache: in insertion order, by URL. */
class FakeCache {
  readonly entries = new Map<string, string>()
  async match(request: Request): Promise<Response | undefined> {
    const body = this.entries.get(request.url)
    return body === undefined ? undefined : new Response(body)
  }
  async put(request: Request, response: Response): Promise<void> {
    this.entries.delete(request.url)
    this.entries.set(request.url, await response.text())
  }
  async delete(request: Request): Promise<boolean> {
    return this.entries.delete(request.url)
  }
  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map(url => new Request(url))
  }
}

/** Lets the writing that follows an answer (not awaited by the asker) land. */
const settled = () => new Promise(resolve => setTimeout(resolve, 0))

describe("CachedSurroundingsProvider", () => {
  beforeEach(() => CachedSurroundingsProvider.forget())
  afterEach(() => vi.unstubAllGlobals())

  it("asks the survey once for a place it was already asked about, even by another instance", async () => {
    const survey = new Counting()
    await new CachedSurroundingsProvider(survey).getSurroundings(PLACE, 100)
    const again = await new CachedSurroundingsProvider(survey).getSurroundings({ lat: PLACE.lat + 0.000001, lng: PLACE.lng }, 100)
    expect(survey.asked).toBe(1)
    expect(again.trees).toEqual([TREE])
  })

  it("asks once for a question still on its way", async () => {
    const survey = new Counting()
    const cached = new CachedSurroundingsProvider(survey)
    await Promise.all([cached.getSurroundings(PLACE, 100), cached.getSurroundings(PLACE, 100)])
    expect(survey.asked).toBe(1)
  })

  it("asks again for another radius, another place or another survey", async () => {
    const survey = new Counting()
    const cached = new CachedSurroundingsProvider(survey)
    await cached.getSurroundings(PLACE, 100)
    await cached.getSurroundings(PLACE, 150)
    await cached.getSurroundings({ lat: PLACE.lat + 0.001, lng: PLACE.lng }, 100)
    const other = new Counting("other")
    await new CachedSurroundingsProvider(other).getSurroundings(PLACE, 100)
    expect(survey.asked).toBe(3)
    expect(other.asked).toBe(1)
  })

  it("does not keep a failure", async () => {
    const survey = new Counting()
    survey.failing = true
    const cached = new CachedSurroundingsProvider(survey)
    await expect(cached.getSurroundings(PLACE, 100)).rejects.toBeInstanceOf(SurroundingsUnavailableError)
    survey.failing = false
    expect((await cached.getSurroundings(PLACE, 100)).trees).toEqual([TREE])
    expect(survey.asked).toBe(2)
  })

  it("gives a copy, which the asker can change", async () => {
    const cached = new CachedSurroundingsProvider(new Counting())
    const first = await cached.getSurroundings(PLACE, 100)
    first.trees[0].eastM = 999
    expect((await cached.getSurroundings(PLACE, 100)).trees[0].eastM).toBe(TREE.eastM)
  })

  it("says what the survey it keeps says of itself", () => {
    const survey = new Counting()
    const cached = new CachedSurroundingsProvider(survey)
    expect([cached.id, cached.name, cached.attribution, cached.creditUrl, cached.contemporary]).toEqual(["counting", "Counting", "©", "https://example.org", true])
  })

  describe("on disk", () => {
    let cache: FakeCache

    beforeEach(() => {
      cache = new FakeCache()
      vi.stubGlobal("caches", { open: async () => cache })
    })

    it("remembers an answer for the next visit", async () => {
      const survey = new Counting()
      await new CachedSurroundingsProvider(survey).getSurroundings(PLACE, 100)
      await settled()
      CachedSurroundingsProvider.forget()
      const next = await new CachedSurroundingsProvider(survey).getSurroundings(PLACE, 100)
      expect(survey.asked).toBe(1)
      expect(next.trees).toEqual([TREE])
    })

    it("asks again once what it remembers is too old", async () => {
      const survey = new Counting()
      const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000)
      await new CachedSurroundingsProvider(survey).getSurroundings(PLACE, 100)
      await settled()
      CachedSurroundingsProvider.forget()
      now.mockReturnValue(1_000_000 + CachedSurroundingsProvider.MAX_AGE_MS + 1)
      await new CachedSurroundingsProvider(survey).getSurroundings(PLACE, 100)
      expect(survey.asked).toBe(2)
      now.mockRestore()
    })

    it("keeps no more than it may, the oldest going first", async () => {
      const survey = new Counting()
      const cached = new CachedSurroundingsProvider(survey)
      for (let i = 0; i <= CachedSurroundingsProvider.MAX_STORED; i++) {
        await cached.getSurroundings({ lat: PLACE.lat + i * 0.01, lng: PLACE.lng }, 100)
        await settled()
      }
      expect(cache.entries.size).toBe(CachedSurroundingsProvider.MAX_STORED)
      expect([...cache.entries.keys()][0]).toContain(encodeURIComponent(CachedSurroundingsProvider.key("counting", { lat: PLACE.lat + 0.01, lng: PLACE.lng }, 100)))
    })
  })
})
