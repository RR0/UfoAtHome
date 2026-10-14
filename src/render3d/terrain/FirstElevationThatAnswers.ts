import type { GeoBounds } from "./GeoBounds.js"
import type { ElevationGrid, ElevationHints, ElevationProvider } from "./ElevationProvider.js"

/**
 * The ground from the first source that has an answer for the place: the IGN's relief in France, the worldwide one anywhere else, and wherever the
 * first does not answer (out of its country, out of its coverage, unreachable, too slow). A scene with the worldwide relief is better than one with
 * none. Whole grids, never mixed vertex by vertex: two surveys side by side would show their seam as a cliff.
 */
export class FirstElevationThatAnswers implements ElevationProvider {
  private readonly providers: ElevationProvider[]

  constructor(...providers: ElevationProvider[]) {
    this.providers = providers
  }

  async getElevationGrid(bounds: GeoBounds, resolution: { width: number, height: number }, hints?: ElevationHints): Promise<ElevationGrid> {
    let failure: unknown = new Error("No source of relief to ask")
    for (const provider of this.providers) {
      try {
        return await provider.getElevationGrid(bounds, resolution, hints)
      } catch (error) {
        failure = error
      }
    }
    throw failure
  }
}
