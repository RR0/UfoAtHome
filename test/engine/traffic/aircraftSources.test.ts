import { describe, expect, test } from "vitest"
import { dataSourceById } from "../../../src/engine/source/DataSource.js"
import { AIRCRAFT_SOURCES } from "../../../src/engine/traffic/aircraftSources.js"
import { AdsbLolArchiveProvider } from "../../../src/engine/traffic/providers/AdsbLolArchiveProvider.js"

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

  test("a source builds its provider on demand", () => {
    expect(AIRCRAFT_SOURCES[0].create()).toBeInstanceOf(AdsbLolArchiveProvider)
  })
})
