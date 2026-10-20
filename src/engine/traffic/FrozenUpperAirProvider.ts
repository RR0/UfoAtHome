import type { UpperAir, UpperAirProvider } from "./UpperAirProvider.js"

/** One answer of a record of the air aloft, with what it was asked. */
export interface UpperAirHeard {
  lat: number
  lng: number
  startMs: number
  endMs: number
  answer: Extract<UpperAir, { status: "found" }>
}

/** The upper air annex (`<recording>.upper-air.json`): what the scene was answered while the recording was made. */
export interface UpperAirAnnexData {
  version: 1
  takenOn: string
  attribution: string
  answers: UpperAirHeard[]
}

/**
 * The air aloft as it was frozen: the answer given for the same place and window, or for a window that holds the one asked, and none
 * otherwise — no record is asked, and a trail the annex cannot state is not drawn, as one the record could not state is not.
 */
export class FrozenUpperAirProvider implements UpperAirProvider {
  /** Degrees and ms within which a request is the one that was answered: the scene asks with the same numbers, this forgives a round trip. */
  private static readonly SAME_PLACE_DEG = 1e-6
  private static readonly SAME_TIME_MS = 1000

  constructor(private readonly annex: Promise<UpperAirAnnexData>) {
  }

  async between(place: { lat: number; lng: number }, startMs: number, endMs: number): Promise<UpperAir> {
    let annex: UpperAirAnnexData
    try {
      annex = await this.annex
    } catch {
      return { status: "failed" }
    }
    const samePlace = (heard: UpperAirHeard) =>
      Math.abs(heard.lat - place.lat) <= FrozenUpperAirProvider.SAME_PLACE_DEG && Math.abs(heard.lng - place.lng) <= FrozenUpperAirProvider.SAME_PLACE_DEG
    const same = annex.answers.find(heard => samePlace(heard)
      && Math.abs(heard.startMs - startMs) <= FrozenUpperAirProvider.SAME_TIME_MS && Math.abs(heard.endMs - endMs) <= FrozenUpperAirProvider.SAME_TIME_MS)
    const holding = same ?? annex.answers.find(heard => heard.startMs <= startMs && heard.endMs >= endMs)
    return holding ? holding.answer : { status: "failed" }
  }
}
