import { describe, expect, it } from "vitest"
import { FILM_STOCKS, FilmStocks } from "../../../src/engine/instrument/FilmStock.js"
import { INSTRUMENTS, Instruments } from "../../../src/engine/instrument/Instrument.js"
import { fromSightingJson, toSightingJson } from "../../../src/engine/persistence/sightingJson.js"

const ids = (list: { id: string }[]) => list.map(stock => stock.id)
const slr = Instruments.byId("slr-35mm-50"), instamatic = Instruments.byId("instamatic-126"), cine = Instruments.byId("cine-35mm-broadcast"), phone = Instruments.byId("phone-landscape")

describe("the film stocks", () => {
  it("have unique ids, a source, and dates in order", () => {
    expect(new Set(ids([...FILM_STOCKS])).size).toBe(FILM_STOCKS.length)
    for (const stock of FILM_STOCKS) {
      expect(stock.source, stock.id).toMatch(/^https:/)
      for (const format of stock.formats) if (format.to !== undefined) expect(format.to, stock.id).toBeGreaterThanOrEqual(format.from)
    }
  })

  it("are each taken by a device of the catalogue", () => {
    const taken = new Set(INSTRUMENTS.map(instrument => instrument.filmFormat))
    for (const stock of FILM_STOCKS) expect(stock.formats.some(format => taken.has(format.format)), stock.id).toBe(true)
  })
})

describe("what a device could have held", () => {
  it("is nothing for what takes no film", () => {
    expect(FilmStocks.forInstrument(phone)).toEqual([])
  })

  it("follows its format", () => {
    expect(ids(FilmStocks.forInstrument(cine))).toContain("eastman-5247-1974")
    expect(ids(FilmStocks.forInstrument(slr))).not.toContain("eastman-5247-1974")
    expect(ids(FilmStocks.forInstrument(instamatic))).toContain("kodacolor-x")
    expect(ids(FilmStocks.forInstrument(instamatic))).not.toContain("kodachrome-25")
  })

  it("follows the year of the picture", () => {
    expect(ids(FilmStocks.possible(slr, 1965))).toContain("kodachrome-ii")
    expect(ids(FilmStocks.possible(slr, 1965))).not.toContain("kodachrome-64")
    expect(ids(FilmStocks.possible(slr, 1980))).toContain("kodachrome-64")
    expect(ids(FilmStocks.possible(slr, 1980))).not.toContain("kodachrome-ii")
  })

  it("follows the dates of that format, which are not always the others'", () => {
    const stock = FilmStocks.byId("kodachrome-64")!
    expect(FilmStocks.gap(stock, slr, 2005)).toBeUndefined()
    expect(FilmStocks.gap(stock, instamatic, 2005)).toEqual({ kind: "after", to: 1993 })
  })

  it("is every stock of its format when the year is not known", () => {
    expect(FilmStocks.possible(slr, undefined)).toEqual(FilmStocks.forInstrument(slr))
  })

  it("names the negatives a film of 1975 can have been shot on", () => {
    expect(ids(FilmStocks.possible(cine, 1975))).toEqual(["eastman-5254", "eastman-5247-1974"])
  })
})

describe("a stock in a device", () => {
  it("gives the medium its speed and its answer to light", () => {
    const stock = FilmStocks.byId("kodachrome-64")!
    expect(FilmStocks.mediumOf(slr.medium, stock)).toMatchObject({ kind: "slide", iso: 64 })
  })

  it("keeps the rest of the medium, the print of a film among it", () => {
    expect(FilmStocks.mediumOf(cine.medium, FilmStocks.byId("eastman-5247-1974"))?.print).toBe(cine.medium?.print)
  })

  it("records no colour when it has none", () => {
    expect(FilmStocks.mediumOf(slr.medium, FilmStocks.byId("tri-x"))?.monochrome).toBe(true)
  })

  it("leaves the device's own medium when none is stated", () => {
    expect(FilmStocks.mediumOf(slr.medium, undefined)).toBe(slr.medium)
  })

  it("round-trips through the file", () => {
    const sighting = fromSightingJson({ version: 4, timeline: { keyframes: [] }, instrument: "slr-35mm-50", film: "kodachrome-64" })
    expect(sighting.film).toBe("kodachrome-64")
    expect(toSightingJson(sighting).film).toBe("kodachrome-64")
  })
})
