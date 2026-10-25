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

describe("PoherMatrix versions", () => {
  const reasons = {
    version: "2026-10-25", author: "RR0", sources: { faa: { title: "Part 107" } },
    phenomena: { ConsumerDrone: { analogue: "Helicopters", summary: "A drone.", sources: ["faa"] } },
    cells: { ConsumerDrone: { "ApparentSize.SeveralDegrees": { why: "Too small.", sources: ["faa"] } } }
  }
  const extended = new PoherMatrix([
    { question: "Hour.Night", knownPhenomenaProbabilities: { Helicopters: 0.5, ConsumerDrone: 1 } },
    { question: "ApparentSize.SeveralDegrees", knownPhenomenaProbabilities: { Helicopters: 0.5, ConsumerDrone: 0 } }
  ], reasons)

  it("says which phenomena a version adds to Poher's, and the reason of each score that is its own", () => {
    const ranking = extended.rank([{ question: "Hour.Night", firm: true }, { question: "ApparentSize.SeveralDegrees", firm: true }])
    expect(ranking.map(row => [row.phenomenon, row.added])).toEqual([["Helicopters", false], ["ConsumerDrone", true]])
    expect(extended.reason("ConsumerDrone", "ApparentSize.SeveralDegrees")?.why).toBe("Too small.")
    expect(extended.reason("Helicopters", "Hour.Night")).toBeUndefined()
  })

  it("reads each version from its own directory, Poher's without reasons", async () => {
    const read: string[] = []
    const fetchJson = (url: string) => {
      read.push(url.slice(PoherMatrix.BASE_URL.length))
      return Promise.resolve(url.endsWith("reasons.json") ? reasons : url.endsWith("matrix.json") ? [] : {})
    }
    expect((await PoherMatrix.load("poher-1977", "fr", fetchJson)).matrix.reasons).toBeUndefined()
    expect(read).toEqual(["time/1/9/7/7/Poher_Matrice/matrix.json", "time/1/9/7/7/Poher_Matrice/Matrix_fr.json"])
    read.length = 0
    expect((await PoherMatrix.load("rr0-2026", "es", fetchJson)).matrix.reasons).toBe(reasons)
    expect(read).toEqual(["time/2/0/2/6/10/Poher_Matrice_RR0/matrix.json", "time/2/0/2/6/10/Poher_Matrice_RR0/Matrix_en.json", "time/2/0/2/6/10/Poher_Matrice_RR0/reasons.json"])
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

  it("names a red light red-orange and a green one green, a question only RR0's version asks; nothing of a blue one", () => {
    expect(answers.of({ colors: ["#ff6020"] })).toEqual([{ question: "Color.RedOrange", firm: true }])
    expect(answers.of({ colors: ["#39ff14"] })).toEqual([{ question: "Color.Green", firm: true }])
    expect(answers.of({ colors: ["#2040ff"] })).toEqual([])
  })

  it("answers what an eye saw as seen with the naked eye, which only RR0's version asks about", () => {
    expect(answers.of({ nakedEye: true })).toEqual([{ question: "Detection.NakedEye", firm: true }])
  })

  it("answers lights in a row as a formation, which only RR0's version asks about", () => {
    expect(answers.of({ count: 3, aligned: true })).toEqual([{ question: "ObjectsCount.Several", firm: true }, { question: "Formation.Line", firm: true }])
  })
})
