import { describe, expect, it } from "vitest"
import { PoherAnswers, PoherMatrix } from "../../../src/engine/witness/PoherMatrix.js"
import { WitnessError } from "../../../src/engine/witness/WitnessError.js"

const matrix = new PoherMatrix([
  { question: "Hour.Day", knownPhenomenaProbabilities: { Planets: 0, Helicopters: 1, Moon: 0.1 } },
  { question: "Hour.Night", knownPhenomenaProbabilities: { Planets: 1, Helicopters: 0.5, Moon: 1 } },
  { question: "ApparentSize.Pointlike", knownPhenomenaProbabilities: { Planets: 1, Helicopters: 0.5, Moon: 0 } },
  { question: "ObjectShape.Other", knownPhenomenonProbabilities: { Planets: 0.1, Helicopters: 1, Moon: 0.5 } }
])
const answers = new PoherAnswers(WitnessError.byId("consolidated"))

describe("PoherMatrix", () => {
  it("rules out what a firm answer scores 0, and ranks the rest by mean score", () => {
    const ranking = matrix.rank([{ question: "Hour.Night", firm: true }, { question: "ApparentSize.Pointlike", firm: true }])
    expect(ranking.map(row => row.phenomenon)).toEqual(["Planets", "Helicopters", "Moon"])
    expect(ranking[2].excludedBy).toEqual(["ApparentSize.Pointlike"])
  })

  it("only doubts what a soft answer scores 0: an observer's estimate never rules a phenomenon out alone", () => {
    const moon = matrix.rank([{ question: "ApparentSize.Pointlike", firm: false }]).find(row => row.phenomenon === "Moon")!
    expect(moon.excludedBy).toEqual([])
    expect(moon.doubtedBy).toEqual(["ApparentSize.Pointlike"])
  })

  it("reads the published file's own spelling of a row", () => {
    expect(matrix.has("ObjectShape.Other")).toBe(true)
  })
})

describe("PoherAnswers", () => {
  it("answers the hour from the Sun, firmly", () => {
    expect(answers.of({ sunAltitudeDeg: -12 })).toEqual([{ question: "Hour.Night", firm: true }])
    expect(answers.of({ sunAltitudeDeg: -3 })[0].question).toBe("Hour.Twilight")
  })

  it("answers an estimated size softly when its law reaches into another class", () => {
    // 0.5° stated is "like the Moon"; its arm's-length law puts the truth at 0.12-0.17°, "point-like".
    expect(answers.of({ widthDeg: 0.5 })).toEqual([{ question: "ApparentSize.SimilarToMoon30s", firm: false }])
  })

  it("answers a duration firmly when ×/÷3 keeps it in its class", () => {
    expect(answers.of({ durationSeconds: 300 })).toEqual([{ question: "Duration.AFewMn", firm: true }])
    expect(answers.of({ durationSeconds: 20 })[0].firm).toBe(false)
  })

  it("names a red light red-orange, and says nothing of a green one", () => {
    expect(answers.of({ colors: ["#ff6020"] })).toEqual([{ question: "Color.RedOrange", firm: true }])
    expect(answers.of({ colors: ["#39ff14"] })).toEqual([])
  })
})
