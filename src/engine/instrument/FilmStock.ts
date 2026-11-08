import type { Instrument, RecordingMedium } from "./Instrument.js"

/** The film a device takes, and nothing else does: a stock is sold in some of these. */
export type FilmFormat = "135" | "120" | "126" | "35mm-cine"

/** One format a stock was sold in, and when. No `to` means no end date was found: not that it is still sold. */
export interface FilmStockFormat {
  format: FilmFormat
  from: number
  to?: number
}

/** What a stock was: dates and speed as its source states them, so that a reader can check them. */
export interface FilmStock {
  id: string
  /** Its trade name, in no language. */
  name: string
  kind: "negative" | "slide"
  /** Whether it records no colour. */
  monochrome?: boolean
  /** Its speed under the light it is said for. A stock whose speed moved over the years has the one it was mostly sold at, and says so in a comment. */
  iso: number
  light?: "tungsten"
  formats: readonly FilmStockFormat[]
  /** Where its dates and speed come from. */
  source: string
}

const KODACHROME = "https://en.wikipedia.org/wiki/Kodachrome"
const KODACOLOR = "https://en.wikipedia.org/wiki/Kodacolor_(still_photography)"
const TRI_X = "https://en.wikipedia.org/wiki/Kodak_Tri-X"
const AGFA = "https://en.wikipedia.org/wiki/List_of_discontinued_photographic_films"
const KODAK_CINE = "https://www.kodak.com/en/motion/page/chronology-of-film/"

const roll = (from: number, to?: number): FilmStockFormat[] => [{ format: "135", from, to }, { format: "120", from, to }]
const cine = (from: number, to?: number): FilmStockFormat[] => [{ format: "35mm-cine", from, to }]

/**
 * Which films existed, for which devices: a recording's date and its camera say which it could have been. Not a complete list: only what a
 * source dates was entered, so a film missing here is one nobody has looked up yet (Ektachrome, Fuji, Ilford), and never a film that did not exist.
 */
export const FILM_STOCKS: readonly FilmStock[] = [
  // Colour negative.
  // 25, then 32 from the 1950s.
  { id: "kodacolor", name: "Kodacolor", kind: "negative", iso: 32, formats: roll(1942, 1963), source: KODACOLOR },
  // 64 at first, 80 later.
  { id: "kodacolor-x", name: "Kodacolor-X", kind: "negative", iso: 80, formats: [...roll(1963, 1974), { format: "126", from: 1963, to: 1974 }], source: KODACOLOR },
  // 80 until 1975, then 100. Out in 110 only in 1972, in the other sizes in 1973.
  { id: "kodacolor-ii", name: "Kodacolor II", kind: "negative", iso: 100, formats: [...roll(1973), { format: "126", from: 1973 }], source: KODACOLOR },
  { id: "kodacolor-400", name: "Kodacolor 400", kind: "negative", iso: 400, formats: roll(1977), source: KODACOLOR },
  { id: "kodacolor-vr-100", name: "Kodacolor VR 100", kind: "negative", iso: 100, formats: roll(1982, 1986), source: KODACOLOR },
  { id: "kodacolor-vr-200", name: "Kodacolor VR 200", kind: "negative", iso: 200, formats: [...roll(1982, 1986), { format: "126", from: 1982, to: 1986 }], source: KODACOLOR },
  { id: "kodacolor-vr-400", name: "Kodacolor VR 400", kind: "negative", iso: 400, formats: roll(1982, 1986), source: KODACOLOR },
  { id: "agfacolor-cn17", name: "Agfacolor CN17", kind: "negative", iso: 40, formats: roll(1956, 1971), source: AGFA },
  { id: "agfacolor-cns", name: "Agfacolor CNS", kind: "negative", iso: 80, formats: [...roll(1968, 1975), { format: "126", from: 1968, to: 1975 }], source: AGFA },
  { id: "agfacolor-cns-2", name: "Agfacolor CNS 2", kind: "negative", iso: 80, formats: [...roll(1971, 1982), { format: "126", from: 1971, to: 1982 }], source: AGFA },
  { id: "agfacolor-cns-400", name: "Agfacolor CNS 400", kind: "negative", iso: 400, formats: roll(1978, 1984), source: AGFA },
  // Slide.
  { id: "kodachrome", name: "Kodachrome", kind: "slide", iso: 10, formats: [{ format: "135", from: 1936, to: 1962 }], source: KODACHROME },
  { id: "kodachrome-ii", name: "Kodachrome II", kind: "slide", iso: 25, formats: [{ format: "135", from: 1961, to: 1974 }], source: KODACHROME },
  { id: "kodachrome-x", name: "Kodachrome-X", kind: "slide", iso: 64, formats: [{ format: "135", from: 1962, to: 1974 }, { format: "126", from: 1963, to: 1974 }], source: KODACHROME },
  { id: "kodachrome-25", name: "Kodachrome 25", kind: "slide", iso: 25, formats: [{ format: "135", from: 1974, to: 2001 }], source: KODACHROME },
  { id: "kodachrome-64", name: "Kodachrome 64", kind: "slide", iso: 64, formats: [{ format: "135", from: 1974, to: 2009 }, { format: "126", from: 1974, to: 1993 }], source: KODACHROME },
  { id: "kodachrome-200", name: "Kodachrome 200", kind: "slide", iso: 200, formats: [{ format: "135", from: 1988, to: 2007 }], source: KODACHROME },
  { id: "agfachrome-ct18", name: "Agfachrome CT18", kind: "slide", iso: 50, formats: [...roll(1958, 1984), { format: "126", from: 1958, to: 1984 }], source: AGFA },
  { id: "agfachrome-ct21", name: "Agfachrome CT21", kind: "slide", iso: 100, formats: [{ format: "135", from: 1974, to: 1984 }], source: AGFA },
  // Black and white. 200 until about 1960, when the standard the speed was stated by changed.
  { id: "tri-x", name: "Kodak Tri-X", kind: "negative", monochrome: true, iso: 400, formats: roll(1954), source: TRI_X },
  // The negatives of the cinema, by their numbers: the same number came back for another film in 1974, and again in 1989.
  { id: "eastman-5247-1950", name: "Eastman Color Negative 5247 (1950)", kind: "negative", iso: 16, formats: cine(1950, 1952), source: KODAK_CINE },
  { id: "eastman-5248-1952", name: "Eastman Color Negative 5248 (1952)", kind: "negative", iso: 16, formats: cine(1952, 1959), source: KODAK_CINE },
  { id: "eastman-5250", name: "Eastman Color Negative 5250", kind: "negative", iso: 32, formats: cine(1959, 1962), source: KODAK_CINE },
  { id: "eastman-5251", name: "Eastman Color Negative 5251", kind: "negative", iso: 50, light: "tungsten", formats: cine(1962, 1968), source: KODAK_CINE },
  { id: "eastman-5254", name: "Eastman Color Negative 5254", kind: "negative", iso: 100, light: "tungsten", formats: cine(1968, 1976), source: KODAK_CINE },
  { id: "eastman-5247-1974", name: "Eastman Color Negative II 5247 (1974)", kind: "negative", iso: 64, formats: cine(1974, 1983), source: KODAK_CINE },
  { id: "eastman-5294", name: "Eastman High Speed Negative 5294", kind: "negative", iso: 400, light: "tungsten", formats: cine(1983), source: KODAK_CINE },
  { id: "eastman-5297", name: "Eastman High Speed Daylight 5297", kind: "negative", iso: 250, formats: cine(1986, 1997), source: KODAK_CINE },
  { id: "eastman-5245", name: "Eastman EXR 50D 5245", kind: "negative", iso: 50, formats: cine(1989), source: KODAK_CINE }
]

/** Why a stock cannot have been on that device that year: only its dates, for one it fits at all. */
export type FilmStockGap = { kind: "before", from: number } | { kind: "after", to: number }

export class FilmStocks {
  static byId(id: string | undefined): FilmStock | undefined {
    return FILM_STOCKS.find(stock => stock.id === id)
  }

  /** The stocks an instrument takes, whatever the year: none for what takes no film. */
  static forInstrument(instrument: Pick<Instrument, "filmFormat">): FilmStock[] {
    return FILM_STOCKS.filter(stock => stock.formats.some(format => format.format === instrument.filmFormat))
  }

  /** Why a stock was not on sale for that instrument that year; undefined when it was, or when the year is not known. */
  static gap(stock: FilmStock, instrument: Pick<Instrument, "filmFormat">, year: number | undefined): FilmStockGap | undefined {
    const format = stock.formats.find(candidate => candidate.format === instrument.filmFormat)
    if (!format || year === undefined) return undefined
    if (year < format.from) return { kind: "before", from: format.from }
    if (format.to !== undefined && year > format.to) return { kind: "after", to: format.to }
    return undefined
  }

  /** The stocks that instrument could have held that year. */
  static possible(instrument: Pick<Instrument, "filmFormat">, year: number | undefined): FilmStock[] {
    return FilmStocks.forInstrument(instrument).filter(stock => FilmStocks.gap(stock, instrument, year) === undefined)
  }

  /** What the instrument records on, the stated stock in it: its speed unless one is stated on the recording, and how it answers light. */
  static mediumOf(medium: RecordingMedium | undefined, stock: FilmStock | undefined): RecordingMedium | undefined {
    if (!medium || !stock) return medium
    return { ...medium, kind: stock.kind, iso: stock.iso, monochrome: stock.monochrome }
  }
}
