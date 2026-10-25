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
  /** Whether the version of the matrix read adds it to Poher's (see PoherReasons). */
  added: boolean
}

/** Why a version of the matrix scores a pair the way it does, and on what sources: what it says of a score that is not Poher's. */
export interface PoherReason {
  why: string
  sources: string[]
}

/**
 * What a version of the matrix that extends Poher's says of its own scores (`reasons.json` beside its `matrix.json`): a reason for every
 * score it gives, the scores it does not give being Poher's of 1977, and the sources these reasons cite.
 */
export interface PoherReasons {
  version: string
  author: string
  /** The phenomena it adds to Poher's, each with the one of Poher's it was scored from. */
  phenomena: Record<string, { analogue?: string, summary: string, sources: string[] }>
  sources: Record<string, { title: string, author?: string, date?: string, url?: string }>
  /** By phenomenon, then by question. */
  cells: Record<string, Record<string, PoherReason>>
}

/** A version of the matrix rr0.org publishes, each in a directory of its own: Poher's of 1977, as he gave it, or RR0's that extends it. */
export type PoherMatrixVersion = "poher-1977" | "rr0-2026"

/**
 * Claude Poher's matrix of known phenomena (1977): 33 phenomena that observers mistake for something else, against 55 characteristics of
 * a sighting, each pair scored 0, 0.1, 0.5 or 1 (impossible to very possible). The phenomena a characteristic scores 0 for are ruled out;
 * the others are ranked by their mean score. Its scores are an expert's judgment of 1977, read as such: the list of candidates it gives
 * is what the search then tests against the account (see CandidateSearch), where a candidate's track can be computed.
 *
 * Read from the file rr0.org publishes, as its own application does, rather than copied here: it is RR0's to correct and extend. RR0
 * extends it (2026) with the mistakes of today Poher could not score (drones, Starlink trains, flares, lasers…) and four characteristics
 * he did not ask about, every score of its own with its reason and sources; Poher's own stays one choice away (see VERSIONS).
 */
export class PoherMatrix {
  /** Where rr0.org publishes its files. */
  static readonly BASE_URL = "https://raw.githubusercontent.com/RR0/rr0.org/master/"
  /**
   * Where each version of the matrix lies, with its labels (`matrix.json`, `Matrix_<lang>.json`), as the matrix's own application reads
   * them: choosing a version is choosing a directory. RR0's holds Poher's scores unchanged, beside its own and their reasons.
   */
  static readonly VERSIONS: Record<PoherMatrixVersion, string> = {
    "poher-1977": "time/1/9/7/7/Poher_Matrice/",
    "rr0-2026": "time/2/0/2/6/10/Poher_Matrice_RR0/"
  }
  /** The version read unless the reader chooses Poher's own: RR0's, which knows the mistakes Poher could not (drones, Starlink…). */
  static readonly DEFAULT_VERSION: PoherMatrixVersion = "rr0-2026"

  private readonly scores = new Map<string, Record<string, number>>()
  readonly phenomena: string[] = []

  constructor(entries: readonly PoherMatrixEntry[], readonly reasons?: PoherReasons) {
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

  /** Why the version read scores `phenomenon` against `question` as it does, when that score is its own and not Poher's. */
  reason(phenomenon: string, question: string): PoherReason | undefined {
    return this.reasons?.cells[phenomenon]?.[question]
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
      return { phenomenon, excludedBy, doubtedBy, mean: count > 0 ? sum / count : 0, added: this.reasons?.phenomena[phenomenon] !== undefined }
    })
    return rows.sort((a, b) => (a.excludedBy.length > 0 ? 1 : 0) - (b.excludedBy.length > 0 ? 1 : 0)
      || (a.excludedBy.length - b.excludedBy.length) || b.mean - a.mean)
  }

  /** The matrix of `version` as published, its labels in `language` (English when it has none in that language), and its reasons when it has some. */
  static async load(version: PoherMatrixVersion, language: string, fetchJson: (url: string) => Promise<unknown>): Promise<{ matrix: PoherMatrix, labels: Record<string, string> }> {
    const lang = ["fr", "en", "it"].includes(language) ? language : "en"
    const base = `${PoherMatrix.BASE_URL}${PoherMatrix.VERSIONS[version]}`
    const [entries, labels, reasons] = await Promise.all([
      fetchJson(`${base}matrix.json`), fetchJson(`${base}Matrix_${lang}.json`), version === "poher-1977" ? undefined : fetchJson(`${base}reasons.json`)
    ])
    return { matrix: new PoherMatrix(entries as PoherMatrixEntry[], reasons as PoherReasons | undefined), labels: labels as Record<string, string> }
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
  /** Whether three or more of them stand in a row across the sky. */
  aligned?: boolean
  /** Whether it was round (an oval about as tall as wide). */
  round?: boolean
  colors?: string[]
  brightness?: number
  /** How many observers the account puts at the scene. */
  observers?: number
  sound?: boolean
  /** Whether it was seen with the naked eye: the recording's instrument is an eye, not a camera nor binoculars. */
  nakedEye?: boolean
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
    if (facts.aligned) add("Formation.Line")
    if (facts.round !== undefined) add(facts.round ? "ObjectShape.Round" : "ObjectShape.Other", false)
    if (facts.colors && facts.colors.length > 0) {
      const color = facts.colors.length > 1 ? "Color.MutipleLights" : PoherAnswers.colorClass(facts.colors[0])
      if (color) add(color)
    }
    if (facts.brightness !== undefined && facts.brightness >= 0.5) add("Luminosity.Intense", false)
    if (facts.observers !== undefined) add(facts.observers > 1 ? "IndependentWitnessesCount.Several" : "IndependentWitnessesCount.Single", this.conditions?.independent !== false)
    if (facts.sound) add("Noise.Perceived")
    if (facts.nakedEye) add("Detection.NakedEye")
    return answers
  }

  /** White, red to orange, or green to blue-green, by its hue: what the colour classes ask (green being RR0's); none for another colour. */
  private static colorClass(color: string): string | undefined {
    const match = /^#([0-9a-f]{6})$/i.exec(color)
    if (!match) return undefined
    const value = parseInt(match[1], 16)
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min < 40) return "Color.White"
    if (r === max && g < r * 0.85 && b < r * 0.6) return "Color.RedOrange"
    return g === max && r < g * 0.7 ? "Color.Green" : undefined
  }
}
