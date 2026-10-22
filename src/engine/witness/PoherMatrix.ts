import type { ErrorKind, ErrorModel } from "./WitnessError.js"
import type { WitnessConditions } from "../model/Account.js"

/** One row of Poher's matrix as rr0.org publishes it: a characteristic of a sighting ("Hour.Night"), and how possible each known phenomenon makes it. */
export interface PoherMatrixEntry {
  question: string
  answertype?: string
  knownPhenomenaProbabilities?: Record<string, number>
  /** The published file's own spelling for one row (`ObjectShape.Other`). */
  knownPhenomenonProbabilities?: Record<string, number>
}

/**
 * A characteristic of the sighting, as the recording answers it: which row of the matrix, and whether the answer is FIRM — whether the
 * error law of the value it comes from keeps the true value in the same class. Only a firm answer may rule a phenomenon out: what an
 * observer estimates worst weighs least (see docs/witness-error-model.md, and the Poher matrix lead of the roadmap).
 */
export interface PoherAnswer {
  question: string
  firm: boolean
}

/** A known phenomenon, as the matrix ranks it against the answers. */
export interface PoherRanking {
  phenomenon: string
  /** The answers that rule it out: a firm answer the matrix gives 0 for it. Empty for a phenomenon still possible. */
  excludedBy: string[]
  /** The answers only soft ones would have ruled out. */
  doubtedBy: string[]
  /** The mean of its scores over the answers, from 0 (impossible) to 1 (very possible). */
  mean: number
}

/**
 * Claude Poher's matrix of known phenomena (1977): 33 phenomena that observers mistake for something else, against 55 characteristics of
 * a sighting, each pair scored 0, 0.1, 0.5 or 1 (impossible to very possible). The phenomena a characteristic scores 0 for are ruled out;
 * the others are ranked by their mean score. Its scores are an expert's judgment of 1977, read as such: the list of candidates it gives
 * is what the search then tests against the account (see CandidateSearch), where a candidate's track can be computed.
 *
 * Read from the file rr0.org publishes, as its own application does, rather than copied here: it is RR0's to correct and extend.
 */
export class PoherMatrix {
  /** Where rr0.org publishes the matrix and its labels (`matrix.json`, `Matrix_<lang>.json`), as the matrix's own application reads them. */
  static readonly BASE_URL = "https://raw.githubusercontent.com/RR0/rr0.org/master/time/1/9/7/7/Poher_Matrice/"

  private readonly scores = new Map<string, Record<string, number>>()
  readonly phenomena: string[] = []

  constructor(entries: readonly PoherMatrixEntry[]) {
    for (const entry of entries) {
      const scores = entry.knownPhenomenaProbabilities ?? entry.knownPhenomenonProbabilities ?? {}
      this.scores.set(entry.question, scores)
      for (const phenomenon of Object.keys(scores)) if (!this.phenomena.includes(phenomenon)) this.phenomena.push(phenomenon)
    }
  }

  /** Whether the matrix has a row for `question`. */
  has(question: string): boolean {
    return this.scores.has(question)
  }

  /** Every phenomenon against `answers`: those still possible first, by mean score; then those ruled out, by how many answers rule them out. */
  rank(answers: readonly PoherAnswer[]): PoherRanking[] {
    const known = answers.filter(answer => this.scores.has(answer.question))
    const rows = this.phenomena.map(phenomenon => {
      const excludedBy: string[] = []
      const doubtedBy: string[] = []
      let sum = 0
      let count = 0
      for (const answer of known) {
        const score = this.scores.get(answer.question)![phenomenon]
        if (score === undefined) continue
        count++
        sum += score
        if (score === 0) (answer.firm ? excludedBy : doubtedBy).push(answer.question)
      }
      return { phenomenon, excludedBy, doubtedBy, mean: count > 0 ? sum / count : 0 }
    })
    return rows.sort((a, b) => (a.excludedBy.length > 0 ? 1 : 0) - (b.excludedBy.length > 0 ? 1 : 0)
      || (a.excludedBy.length - b.excludedBy.length) || b.mean - a.mean)
  }

  /** The matrix as published, and its labels in `language` (English when it has none in that language). */
  static async load(language: string, fetchJson: (url: string) => Promise<unknown>): Promise<{ matrix: PoherMatrix, labels: Record<string, string> }> {
    const lang = ["fr", "en", "it"].includes(language) ? language : "en"
    const [entries, labels] = await Promise.all([fetchJson(`${PoherMatrix.BASE_URL}matrix.json`), fetchJson(`${PoherMatrix.BASE_URL}Matrix_${lang}.json`)])
    return { matrix: new PoherMatrix(entries as PoherMatrixEntry[]), labels: labels as Record<string, string> }
  }
}

/** What a recording says that the matrix asks about: each measure as the recording holds it, undefined when it says nothing. */
export interface PoherFacts {
  /** The Sun's altitude at the start, in degrees. */
  sunAltitudeDeg?: number
  durationSeconds?: number
  cloudCover?: number
  lightning?: boolean
  /** Precipitation, fog: what lowers visibility. */
  lowVisibility?: boolean
  /** The main phenomenon's elevation, apparent width, and how far and how fast it moved across the sky. */
  elevationDeg?: number
  widthDeg?: number
  sweepDeg?: number
  /** How far the path strays from the straight line between its ends, in degrees. */
  straysDeg?: number
  /** Degrees per second, mean and the largest step's. */
  speedDegPerS?: number
  speedVariation?: number
  /** How many phenomena the account draws (a group counting once). */
  count?: number
  /** Whether it was round (an oval about as tall as wide). */
  round?: boolean
  colors?: string[]
  brightness?: number
  /** How many observers the account puts at the scene. */
  observers?: number
  sound?: boolean
}

/**
 * Answers Poher's questions from what a recording holds, each as firm or not by the error law of the value it comes from (see
 * PoherAnswer): the hour of the day from the Sun, which is firm; the duration, the elevation and the apparent size from the observer's
 * own estimates, firm only when their law keeps the truth in the same class.
 */
export class PoherAnswers {
  constructor(private readonly model: ErrorModel, private readonly conditions?: WitnessConditions) {
  }

  of(facts: PoherFacts): PoherAnswer[] {
    const answers: PoherAnswer[] = []
    const add = (question: string, firm = true) => answers.push({ question, firm })
    if (facts.sunAltitudeDeg !== undefined) add(facts.sunAltitudeDeg > 0 ? "Hour.Day" : facts.sunAltitudeDeg < -6 ? "Hour.Night" : "Hour.Twilight")
    const classed = (kind: ErrorKind, value: number | undefined, classes: [number, string][]) => {
      if (value === undefined) return
      const classOf = (v: number) => classes.find(([below]) => v < below)?.[1] ?? classes[classes.length - 1][1]
      const law = this.model.law({ kind, value }, this.conditions)
      const stated = classOf(value)
      const firm = law.shape === "range" && classOf(law.low ?? value) === stated && classOf(law.high ?? value) === stated
      add(stated, firm)
    }
    classed("duration", facts.durationSeconds, [[10, "Duration.LessThan10s"], [3600, "Duration.AFewMn"], [Infinity, "Duration.Above1h"]])
    classed("elevation", facts.elevationDeg, [[5, "AngularHeight.LowOnHorizon"], [30, "AngularHeight.LessThan30d"], [Infinity, "AngularHeight.HighInSky"]])
    classed("angularSize", facts.widthDeg, [[0.2, "ApparentSize.Pointlike"], [1, "ApparentSize.SimilarToMoon30s"], [Infinity, "ApparentSize.SeveralDegrees"]])
    if (facts.cloudCover !== undefined) {
      if (facts.cloudCover < 0.2) add("WeatherConditions.NiceAndAlmostClearSky")
      else if (facts.cloudCover > 0.8) add("WeatherConditions.Overcast")
    }
    if (facts.lightning) add("WeatherConditions.Thunder")
    if (facts.lowVisibility) add("WeatherConditions.LowVisibility")
    // How it moved: firm only in what an observer reports well, its layout and its heading; its speed is argued at best.
    if (facts.sweepDeg !== undefined) {
      if (facts.sweepDeg < 1) add("Path.Stationary", false)
      else add((facts.straysDeg ?? 0) < Math.max(1, facts.sweepDeg * 0.1) ? "Path.StraightLineContinuous" : "Path.Complex", false)
    }
    if (facts.speedDegPerS !== undefined) {
      const speed = facts.speedDegPerS
      add((facts.speedVariation ?? 0) > 3 ? "AngularSpeed.Variable"
        : speed < 0.01 ? "AngularSpeed.VeryLowOrStationary"
        : speed > 10 ? "AngularSpeed.VeryHighStreaking" : "AngularSpeed.SlowLikePlaneAtHighAltitude", false)
    }
    if (facts.count !== undefined) add(facts.count > 1 ? "ObjectsCount.Several" : "ObjectsCount.Single")
    if (facts.round !== undefined) add(facts.round ? "ObjectShape.Round" : "ObjectShape.Other", false)
    if (facts.colors && facts.colors.length > 0) {
      const color = facts.colors.length > 1 ? "Color.MutipleLights" : PoherAnswers.colorClass(facts.colors[0])
      if (color) add(color)
    }
    if (facts.brightness !== undefined && facts.brightness >= 0.5) add("Luminosity.Intense", false)
    if (facts.observers !== undefined) add(facts.observers > 1 ? "IndependentWitnessesCount.Several" : "IndependentWitnessesCount.Single", this.conditions?.independent !== false)
    if (facts.sound) add("Noise.Perceived")
    return answers
  }

  /** White, or red to orange, by its hue: what Poher's colour classes ask; neither for another colour, which they do not. */
  private static colorClass(color: string): string | undefined {
    const match = /^#([0-9a-f]{6})$/i.exec(color)
    if (!match) return undefined
    const value = parseInt(match[1], 16)
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min < 40) return "Color.White"
    return r === max && g < r * 0.85 && b < r * 0.6 ? "Color.RedOrange" : undefined
  }
}
