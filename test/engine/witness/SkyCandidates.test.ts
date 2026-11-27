import { describe, expect, it } from "vitest"
import { SkyCandidates } from "../../../src/engine/witness/SkyCandidates.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"

const recording = (angular: unknown) => fromSightingJson({
  version: 4, time: "2026-08-14T22:42:00", utcOffsetHours: 2, place: { name: "x", locations: [{ lat: 48.879, lng: 2.588 }] },
  timeline: {
    keyframes: [
      { t: 0, shapes: [{ sourceId: "light", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, aim: { azimuthDeg: 245, altitudeDeg: 15 }, angular } }] },
      { t: 180000, shapes: [{ sourceId: "light", shape: { aim: { azimuthDeg: 252, altitudeDeg: 22 }, angular: { widthDeg: 0.1, heightDeg: 0.1 } } }] }
    ]
  }
} as never)

describe("What an account states of its main phenomenon, for the candidates to be set against", () => {
  it("states the size the witness gave", () => {
    expect(SkyCandidates.statement(recording({ widthDeg: 0.05, heightDeg: 0.05 }))!.statement).toMatchObject({ widthDeg: 0.05, growth: 2 })
  })

  it("states no size the account only supposes: no candidate is too big or too small for it", () => {
    const statement = SkyCandidates.statement(recording({ value: { widthDeg: 0.05, heightDeg: 0.05 }, basis: "assumed" }))!.statement
    expect(statement.widthDeg).toBeUndefined()
    expect(statement.growth).toBeUndefined()
    expect(statement.aim).toEqual({ azimuthDeg: 245, altitudeDeg: 15 })
  })
})
