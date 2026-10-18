import type { Surroundings, SurroundingsProvider } from "./SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "./SurroundingsProvider.js"

/**
 * Several surveys asked in turn for one place, the first that has something to say being the answer: for the author who has not chosen a survey, the best
 * survey of a country and, where it turns out not to reach the place (the box that says France is a rectangle that holds a corner of Belgium, and a
 * laser square over Belgium answers "nothing flown here"), the survey of the whole world.
 *
 * It says what it is made of the survey that answered, once it has: before, it is its first, and `id`, `name` and the credit are read after the answer,
 * since they are what the objects it brought are marked with (see DecorObject.origin).
 */
export class FirstSurroundingsThatAnswers implements SurroundingsProvider {
  private current: SurroundingsProvider

  constructor(private readonly candidates: readonly SurroundingsProvider[]) {
    if (candidates.length === 0) throw new Error("A survey needs at least one candidate")
    this.current = candidates[0]
  }

  get id(): string { return this.current.id }
  get name(): string { return this.current.name }
  get attribution(): string { return this.current.attribution }
  get creditUrl(): string { return this.current.creditUrl }
  get contemporary(): boolean { return this.current.contemporary }

  covers(lat: number, lng: number): boolean {
    return this.candidates.some(candidate => candidate.covers(lat, lng))
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    let failure: unknown
    for (const candidate of this.candidates) {
      if (!candidate.covers(centre.lat, centre.lng)) continue
      try {
        const found = await candidate.getSurroundings(centre, radiusM)
        this.current = candidate
        return found
      } catch (error) {
        // Not reaching the place is the next one's to answer; being unreachable is too, but if every survey is, that is the failure.
        failure ??= error
        if (!(error instanceof SurroundingsUnavailableError)) throw error
      }
    }
    throw failure ?? new SurroundingsUnavailableError("no-coverage", "No survey reaches this place")
  }

  /** What the survey that answered lacked (see SurroundingsProvider.later). */
  later(centre: { lat: number, lng: number }, radiusM: number): Promise<Partial<Surroundings>> | undefined {
    return this.current.later?.(centre, radiusM)
  }
}
