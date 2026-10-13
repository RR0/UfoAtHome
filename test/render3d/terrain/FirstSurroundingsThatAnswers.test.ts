import { describe, expect, it } from "vitest"
import { FirstSurroundingsThatAnswers } from "../../../src/render3d/terrain/FirstSurroundingsThatAnswers.js"
import { SurroundingsUnavailableError } from "../../../src/render3d/terrain/SurroundingsProvider.js"
import type { Surroundings, SurroundingsProvider } from "../../../src/render3d/terrain/SurroundingsProvider.js"

const PLACE = { lat: 50.6, lng: 4.14 }
const empty = (): Surroundings => ({ trees: [], buildings: [], bridges: [], lines: [] })

class Fake implements SurroundingsProvider {
  readonly attribution = ""
  readonly creditUrl = ""
  readonly contemporary = true
  asked = 0
  constructor(readonly id: string, private readonly outcome: Surroundings | Error, private readonly reaches = true) {}
  get name(): string { return this.id.toUpperCase() }
  covers(): boolean { return this.reaches }
  async getSurroundings(): Promise<Surroundings> {
    this.asked++
    if (this.outcome instanceof Error) throw this.outcome
    return this.outcome
  }
}

describe("FirstSurroundingsThatAnswers", () => {
  it("is the first survey until one has answered, and the one that answered after", async () => {
    const world = new Fake("world", { ...empty(), buildings: [{ eastM: 1, northM: 2, widthM: 5, lengthM: 5, heightM: 6, headingDeg: 0 }] })
    const chain = new FirstSurroundingsThatAnswers([new Fake("france", new SurroundingsUnavailableError("no-coverage", "not flown")), world])
    expect(chain.id).toBe("france")
    const found = await chain.getSurroundings(PLACE, 100)
    expect(found.buildings).toHaveLength(1)
    expect([chain.id, chain.name]).toEqual(["world", "WORLD"])
  })

  it("does not go on once one has answered, even with nothing found", async () => {
    const second = new Fake("world", empty())
    const chain = new FirstSurroundingsThatAnswers([new Fake("france", empty()), second])
    await chain.getSurroundings(PLACE, 100)
    expect(second.asked).toBe(0)
    expect(chain.id).toBe("france")
  })

  it("skips a survey that does not reach the place, and fails with the first failure when none answers", async () => {
    const unreached = new Fake("france", empty(), false)
    const world = new Fake("world", new SurroundingsUnavailableError("unreachable", "down"))
    await expect(new FirstSurroundingsThatAnswers([unreached, world]).getSurroundings(PLACE, 100)).rejects.toMatchObject({ reason: "unreachable" })
    expect(unreached.asked).toBe(0)
    await expect(new FirstSurroundingsThatAnswers([new Fake("a", new SurroundingsUnavailableError("no-coverage", "no")), world]).getSurroundings(PLACE, 100)).rejects.toMatchObject({ reason: "no-coverage" })
  })

  it("passes on what is not a failure to answer, which is a bug and not a place without a survey", async () => {
    const chain = new FirstSurroundingsThatAnswers([new Fake("france", new TypeError("broken")), new Fake("world", empty())])
    await expect(chain.getSurroundings(PLACE, 100)).rejects.toThrow("broken")
  })

  it("reaches a place if any of its surveys does", () => {
    expect(new FirstSurroundingsThatAnswers([new Fake("a", empty(), false), new Fake("b", empty(), true)]).covers(PLACE.lat, PLACE.lng)).toBe(true)
    expect(new FirstSurroundingsThatAnswers([new Fake("a", empty(), false)]).covers(PLACE.lat, PLACE.lng)).toBe(false)
  })
})
