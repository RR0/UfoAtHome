import { describe, expect, test } from "vitest"
import { dataSourceById } from "../../../src/engine/source/DataSource.js"
import { AIRCRAFT_SOURCES } from "../../../src/engine/traffic/aircraftSources.js"
import { LazyAircraftProvider } from "../../../src/engine/traffic/LazyAircraftProvider.js"

describe("AIRCRAFT_SOURCES", () => {
  test("adsb.lol is the default, credited with its licence", () => {
    const source = dataSourceById(AIRCRAFT_SOURCES, undefined)
    expect(source.id).toBe("adsb-lol")
    expect(source.credit).toMatch(/ODbL/)
    expect(source.creditUrl).toMatch(/^https:\/\/www\.adsb\.lol\//)
  })

  test("an unknown id resolves to the default, not to nothing", () => {
    expect(dataSourceById(AIRCRAFT_SOURCES, "gone").id).toBe("adsb-lol")
  })

  test("a source builds its provider on demand, and the provider loads what reads the record only when it is asked", () => {
    expect(AIRCRAFT_SOURCES[0].create()).toBeInstanceOf(LazyAircraftProvider)
  })

  test("the provider it builds says what it cannot hold, and cites its licence, without loading anything", () => {
    const provider = AIRCRAFT_SOURCES[0].create()
    expect(provider.mayCover?.(Date.UTC(1965, 6, 1))).toBe(false)
    expect(provider.mayCover?.(Date.UTC(2025, 11, 30))).toBe(true)
    expect(provider.citation).toMatch(/Open Database License/)
  })
})
