import { describe, expect, it } from "vitest"
import { SurroundingsCorridor } from "../../../src/render3d/terrain/SurroundingsCorridor.js"
import type { Stop } from "../../../src/render3d/terrain/SurroundingsCorridor.js"
import { SurroundingsUnavailableError } from "../../../src/render3d/terrain/SurroundingsProvider.js"
import type { Surroundings, SurroundingsProvider } from "../../../src/render3d/terrain/SurroundingsProvider.js"

const METRES = 111320
/** A path going east along a parallel: a stop every `step` metres. */
const eastward = (...metres: number[]): Stop[] => metres.map(m => ({ lat: 49, lng: 2 + m / (METRES * Math.cos(49 * Math.PI / 180)) }))

/** A survey that finds what `answer` says of the place asked about, in metres from it, or fails where `fail` says. */
class Fake implements SurroundingsProvider {
  readonly id = "fake"
  readonly name = "Fake"
  readonly attribution = ""
  readonly creditUrl = ""
  readonly contemporary = true
  asked: Stop[] = []
  constructor(private readonly answer: (centre: Stop) => Surroundings, private readonly fail: (centre: Stop) => Error | undefined = () => undefined) {}
  covers(): boolean { return true }
  async getSurroundings(centre: Stop): Promise<Surroundings> {
    this.asked.push(centre)
    const failure = this.fail(centre)
    if (failure) throw failure
    return this.answer(centre)
  }
}

const empty = (): Surroundings => ({ trees: [], buildings: [], bridges: [], lines: [] })
const HOUSE = { eastM: 0, northM: 30, widthM: 10, lengthM: 8, heightM: 7, headingDeg: 0 }

describe("SurroundingsCorridor", () => {
  describe("stops", () => {
    it("is the first place, then one every spacing travelled, then the end", () => {
      const stops = SurroundingsCorridor.stops(eastward(0, 100, 250, 400, 650, 1000), 300)
      expect(stops.length).toBeGreaterThanOrEqual(3)
      expect(stops[0]).toEqual(eastward(0)[0])
      expect(stops.at(-1)).toEqual(eastward(1000)[0])
    })

    it("is one place for an observer who does not move, and none for no path", () => {
      expect(SurroundingsCorridor.stops(eastward(0, 0, 0), 300)).toHaveLength(1)
      expect(SurroundingsCorridor.stops([], 300)).toEqual([])
    })

    it("steps wider rather than ask more than it may of a very long path", () => {
      const path = eastward(...Array.from({ length: 200 }, (_, i) => i * 500))
      expect(SurroundingsCorridor.stops(path, 300).length).toBeLessThanOrEqual(SurroundingsCorridor.MAX_STOPS)
    })
  })

  describe("fetch", () => {
    it("puts what each stop found in the frame of the first, where the observer set off", async () => {
      const stops = eastward(0, 500)
      const provider = new Fake(() => ({ ...empty(), buildings: [HOUSE] }))
      const found = await SurroundingsCorridor.fetch(provider, stops, 200)
      expect(found.buildings.map(building => Math.round(building.eastM)).sort((a, b) => a - b)).toEqual([0, 500])
      expect(found.buildings.every(building => Math.round(building.northM) === 30)).toBe(true)
    })

    it("counts once what two stops both saw, trees and buildings and structures alike", async () => {
      // Stops 100 m apart; the tree and the house stand 50 m from the first, so each sees them at its own offset.
      const provider = new Fake(centre => {
        const east = (eastward(0)[0].lng - centre.lng) * METRES * Math.cos(49 * Math.PI / 180) + 50
        return { ...empty(), trees: [{ eastM: east, northM: 5, heightM: 12, widthM: 6 }], buildings: [{ ...HOUSE, eastM: east }] }
      })
      const found = await SurroundingsCorridor.fetch(provider, eastward(0, 100), 200)
      expect(found.trees).toHaveLength(1)
      expect(found.buildings).toHaveLength(1)
    })

    it("keeps only the nearest trees of each stop, when told to", async () => {
      const trees = Array.from({ length: 10 }, (_, i) => ({ eastM: i * 10, northM: 0, heightM: 10, widthM: 5 }))
      const provider = new Fake(() => ({ ...empty(), trees }))
      const found = await SurroundingsCorridor.fetch(provider, eastward(0), 200, { treesPerStop: 3 })
      expect(found.trees.map(tree => tree.eastM)).toEqual([0, 10, 20])
    })

    it("takes the newest day of each survey among the stops", async () => {
      let calls = 0
      const provider = new Fake(() => ({ ...empty(), dates: { laser: calls++ === 0 ? "2022-02-12" : "2023-05-01", map: "2026-03-11" } }))
      const found = await SurroundingsCorridor.fetch(provider, eastward(0, 500), 200)
      expect(found.dates).toEqual({ laser: "2023-05-01", map: "2026-03-11" })
    })

    it("goes on without a stop that fails while another answers, and fails with the first failure when none does", async () => {
      const second = eastward(500)[0]
      const partly = new Fake(() => ({ ...empty(), trees: [{ eastM: 0, northM: 0, heightM: 8, widthM: 4 }] }),
        centre => centre.lng === second.lng ? new SurroundingsUnavailableError("unreachable", "down") : undefined)
      expect((await SurroundingsCorridor.fetch(partly, eastward(0, 500), 200)).trees).toHaveLength(1)
      const never = new Fake(empty, () => new SurroundingsUnavailableError("unreachable", "down"))
      await expect(SurroundingsCorridor.fetch(never, eastward(0, 500), 200)).rejects.toMatchObject({ reason: "unreachable" })
      const uncovered = new Fake(empty, () => new SurroundingsUnavailableError("no-coverage", "none"))
      await expect(SurroundingsCorridor.fetch(uncovered, eastward(0), 200)).rejects.toMatchObject({ reason: "no-coverage" })
    })
  })
})
