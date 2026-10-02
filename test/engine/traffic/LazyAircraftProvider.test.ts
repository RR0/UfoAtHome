import { describe, expect, test, vi } from "vitest"
import { AircraftCoverage } from "../../../src/engine/traffic/AircraftCoverage.js"
import type { AircraftProvider, AircraftTraffic } from "../../../src/engine/traffic/AircraftProvider.js"
import { LazyAircraftProvider } from "../../../src/engine/traffic/LazyAircraftProvider.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const found: AircraftTraffic = { status: "found", tracks: [] }

/** A provider that counts what it is asked, and a loader that counts how often it is called. */
function fixture(load?: () => Promise<AircraftProvider>) {
  const between = vi.fn(async () => found)
  const describe = vi.fn(async () => ({ type: "A320" }))
  const provider: AircraftProvider = { citation: "real", between, describe }
  const loader = vi.fn(load ?? (async () => provider))
  const lazy = new LazyAircraftProvider("cited", ms => AircraftCoverage.mayCover(ms), loader)
  return { lazy, loader, between, describe }
}

describe("LazyAircraftProvider", () => {
  test("loads nothing until it is first asked something", () => {
    const { loader } = fixture()
    expect(loader).not.toHaveBeenCalled()
  })

  test("says what it cannot hold, and states its citation, without loading", () => {
    const { lazy, loader } = fixture()
    expect(lazy.citation).toBe("cited")
    expect(lazy.mayCover(Date.UTC(1990, 10, 5))).toBe(false)
    expect(lazy.mayCover(Date.UTC(2026, 0, 1))).toBe(true)
    expect(loader).not.toHaveBeenCalled()
  })

  test("loads once, on the first question, and answers with the provider it loaded", async () => {
    const { lazy, loader, between } = fixture()
    expect(await lazy.between(observer, 1, 2, 100)).toBe(found)
    await lazy.between(observer, 3, 4)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(between).toHaveBeenNthCalledWith(1, observer, 1, 2, 100)
  })

  test("two questions at once load it once", async () => {
    const { lazy, loader } = fixture()
    await Promise.all([lazy.between(observer, 1, 2), lazy.between(observer, 3, 4), lazy.describe({ icao: 1, nonIcao: false, points: [] }, "2025-12-30")])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  test("passes a description through", async () => {
    const { lazy, describe } = fixture()
    expect(await lazy.describe({ icao: 1, nonIcao: false, points: [] }, "2025-12-30")).toEqual({ type: "A320" })
    expect(describe).toHaveBeenCalledOnce()
  })

  test("says failed, and not a rejection, when what reads the record cannot be loaded", async () => {
    const { lazy } = fixture(async () => { throw new Error("chunk unreachable") })
    expect(await lazy.between(observer, 1, 2)).toEqual({ status: "failed" })
    expect(await lazy.describe({ icao: 1, nonIcao: false, points: [] }, "2025-12-30")).toBeUndefined()
  })

  test("does not keep a failed load: the next question tries again", async () => {
    let attempts = 0
    const { lazy, between } = fixture(async () => {
      if (++attempts === 1) throw new Error("offline")
      return { citation: "real", between: async () => found }
    })
    expect(await lazy.between(observer, 1, 2)).toEqual({ status: "failed" })
    expect(await lazy.between(observer, 1, 2)).toBe(found)
    expect(attempts).toBe(2)
    expect(between).not.toHaveBeenCalled()
  })

  test("says failed when the provider it loaded fails to answer", async () => {
    const { lazy } = fixture(async () => ({ citation: "real", between: async () => { throw new Error("boom") } }))
    expect(await lazy.between(observer, 1, 2)).toEqual({ status: "failed" })
  })

  test("answers a provider with no descriptions with none", async () => {
    const lazy = new LazyAircraftProvider("cited", () => true, async () => ({ citation: "real", between: async () => found }))
    expect(await lazy.describe({ icao: 1, nonIcao: false, points: [] }, "2025-12-30")).toBeUndefined()
  })
})

describe("AircraftCoverage", () => {
  test("begins where ADSB.lol's open history does", () => {
    expect(AircraftCoverage.mayCover(Date.parse("2021-12-31T23:59:59Z"))).toBe(false)
    expect(AircraftCoverage.mayCover(Date.parse("2022-01-01T00:00:00Z"))).toBe(true)
  })
})
