import { describe, expect, it } from "vitest"
import { UncertainConditions, type AccountConditions } from "../../../src/engine/scenario/UncertainConditions.js"

const evening: AccountConditions = { eventId: "w1", local: "2023-10-14T19:00:00", utcOffsetHours: -7, lat: 36.5, lng: -115.4, placeName: "Alamo Road" }
const dawn: AccountConditions = { ...evening, eventId: "w5", local: "2023-10-16T05:30:00" }
const window = { from: "2023-10-14T12:00", to: "2023-10-16T12:00" }
const pahranagat = { id: "pahranagat", place: { name: "Pahranagat", locations: [{ lat: 37.277, lng: -115.118 }] }, for: ["w1"] }

describe("The scenarios an account is played over", () => {
  it("plays only the account's own place and instant when nothing is open", () => {
    const scenarios = UncertainConditions.scenarios(evening, undefined)
    expect(scenarios.map(s => s.id)).toEqual(["own@2023-10-14T19:00"])
    expect(scenarios[0]).toMatchObject({ own: true, ownPlace: true })
    expect(scenarios[0].date.toISOString()).toBe("2023-10-15T02:00:00.000Z")
  })

  it("plays the bounds of the dates by default: the account's time of day on the first and the last day that fall within", () => {
    expect(UncertainConditions.instants(evening, window)).toEqual(["2023-10-14T19:00", "2023-10-15T19:00"])
    // The dawn falls on the 15th and the 16th: the 14th's is before the interval opens.
    expect(UncertainConditions.instants(dawn, window)).toEqual(["2023-10-15T05:30", "2023-10-16T05:30"])
    expect(UncertainConditions.instants(evening, { from: "2023-10-10T00:00", to: "2023-10-20T00:00" })).toEqual(["2023-10-10T19:00", "2023-10-19T19:00"])
  })

  it("plays the points, the steps or the deltas asked for", () => {
    expect(UncertainConditions.instants(evening, { ...window, sweep: "points", points: ["2023-10-15", "2023-10-15T20:30"] })).toEqual(["2023-10-15T19:00", "2023-10-15T20:30"])
    expect(UncertainConditions.instants(evening, { from: "2023-10-14T18:00", to: "2023-10-14T20:00", each: "instant", sweep: "step", stepMinutes: 30 }))
      .toEqual(["2023-10-14T18:00", "2023-10-14T18:30", "2023-10-14T19:00", "2023-10-14T19:30", "2023-10-14T20:00"])
    expect(UncertainConditions.instants(evening, { ...window, sweep: "deltas", deltasMinutes: [-60, 1440] })).toEqual(["2023-10-14T18:00", "2023-10-14T19:00", "2023-10-15T19:00"])
  })

  it("plays every candidate place for the accounts it is for, and the account's own", () => {
    const places = { candidates: [pahranagat, { ...pahranagat, id: "groom", for: ["w5"] }] }
    expect(UncertainConditions.places(evening, places).map(p => p.placeId)).toEqual(["own", "pahranagat"])
    expect(UncertainConditions.places(dawn, places).map(p => p.placeId)).toEqual(["own", "groom"])
    expect(UncertainConditions.places(evening, { ...places, own: false }).map(p => p.placeId)).toEqual(["pahranagat"])
    expect(UncertainConditions.places(evening, { ...places, sweep: "points", points: [] }).map(p => p.placeId)).toEqual(["own"])
  })

  it("moves the account's own place by deltas, or lays a grid over the candidates", () => {
    const moved = UncertainConditions.places(evening, { sweep: "deltas", deltasKm: [{ eastKm: 10, northKm: 0 }, { eastKm: 0, northKm: -5 }] })
    expect(moved.map(p => p.placeId)).toEqual(["own", "own+10,+0km", "own+0,-5km"])
    expect(moved[1].lng - evening.lng).toBeCloseTo(10 / (111.32 * Math.cos(36.5 * Math.PI / 180)), 6)
    expect(moved[2].lat - evening.lat).toBeCloseTo(-5 / 111.32, 6)
    const grid = UncertainConditions.places(evening, { candidates: [pahranagat], sweep: "step", stepKm: 40 })
    // About 86 km north and 25 km east of the account: three rows of one point each, with the account's own.
    expect(grid.length).toBe(1 + 3)
  })

  it("crosses places and instants, the account's own first", () => {
    const scenarios = UncertainConditions.scenarios(evening, { time: window, places: { candidates: [pahranagat] } })
    expect(scenarios.map(s => s.id)).toEqual(["own@2023-10-14T19:00", "own@2023-10-15T19:00", "pahranagat@2023-10-14T19:00", "pahranagat@2023-10-15T19:00"])
    expect(scenarios.filter(s => s.own)).toHaveLength(1)
    expect(scenarios[3].date.toISOString()).toBe("2023-10-16T02:00:00.000Z")
  })

  it("refuses a sweep too large to be anything but a sample", () => {
    expect(() => UncertainConditions.scenarios(evening, { time: { from: "2023-01-01T00:00", to: "2023-12-31T00:00", each: "instant", sweep: "step", stepMinutes: 60 } })).toThrow(/scenarios/)
  })

  it("lets a recording's own conditions override its case's", () => {
    expect(UncertainConditions.merged({ time: window, keep: "all" }, { keep: "none" })).toEqual({ time: window, keep: "none" })
  })
})
