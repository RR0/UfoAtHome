import type { Basis } from "../persistence/Provenance.js"
import type { WitnessConditions } from "../model/Account.js"

/** The kinds of value an observer gives whose error the studies measured (see docs/witness-error-model.md). */
export type ErrorKind = "time" | "duration" | "elevation" | "heading" | "angularSize" | "distance"

/**
 * How firmly a law is known, in the vocabulary of the leads (docs/testimony-evaluation-leads.md): measured by two independent studies,
 * measured on this observer, measured once, reasoned from cases, or disputed between sources.
 */
export type LeadStatus = "consolidated" | "individual" | "single" | "argued" | "contested"

/** What the studies say of the error of one value. */
export interface ErrorLaw {
  /**
   * `range`: the true value is between `low` and `high`, in the value's unit (an offset in minutes for a time of day). `uninformative`:
   * the value says nothing of what it claims to measure. `anchored`: its error is that of what it was worked out from.
   */
  shape: "range" | "uninformative" | "anchored"
  low?: number
  high?: number
  /** Which saying of the law it is, for a reader's messages (see WitnessErrorMessages.laws), and the figures it says. */
  note: WitnessLawNote
  params?: Record<string, number>
  status: LeadStatus
  /** The studies it rests on, as the leads cite them. */
  sources: string[]
}

export type WitnessLawNote =
  | "timeClock" | "timeAnchored" | "timeEstimated" | "duration" | "elevationOver" | "measuredInstrument" | "measuredLandmark"
  | "headingCross" | "sizeMoon" | "sizeShown" | "sizeRecalled" | "sizeArm" | "sizeGauge" | "distanceAnchored" | "distanceNotData"

/** One of the few parameters through which one observer's errors are tied together: the same factor on every size, the same offset on every time. */
export interface WitnessParameter {
  id: "clock" | "date" | "heading" | "elevation" | "size" | "duration"
  note: WitnessParameterNote
  params?: Record<string, number>
  status: LeadStatus
}

export type WitnessParameterNote =
  | "clockClock" | "clockAnchored" | "clockEstimated" | "dateShift" | "headingRotation" | "elevationCompression"
  | "sizeMoon" | "sizeArm" | "sizeShown" | "durationFactor"

/** What a value of a recording is, for its law: its kind, its value in its unit, how it was obtained and on what basis. */
export interface WitnessValue {
  kind: ErrorKind
  value: number
  basis?: Basis
  how?: string
}

/**
 * A reading of the literature on how observers err: one per reading, since the literature disagrees (angular size is contested
 * between Peiniger and Keul) and the format must not take a side. Its picker is its credit, as a data source's is.
 */
export interface ErrorModel {
  id: string
  /** What it is called, in English: a reader's messages name it in theirs (see WitnessErrorMessages.models). */
  title: string
  /** The law of `value`'s error, for an observer in `conditions`. */
  law(value: WitnessValue, conditions?: WitnessConditions): ErrorLaw
  /** The parameters that tie one observer's errors together, as this model reads them for this observer. */
  parameters(conditions?: WitnessConditions, timeHow?: string): WitnessParameter[]
}

/**
 * The laws the leads consolidate (docs/testimony-evaluation-leads.md): a time of day within about 6 minutes for 9 observers in 10
 * unless read on a clock; a duration log-normal, ×/÷3; an elevation overestimated, one-sided; a heading reliable to about ±45° across
 * the line of sight, its sense sometimes reversed; an angular size overestimated 3 to 4 times at arm's length (the size of that is
 * contested), unless the Moon gauge says how this observer sizes; a distance in metres no data at all unless anchored.
 */
export class ConsolidatedErrorModel implements ErrorModel {
  readonly id: string = "consolidated"
  readonly title: string = "Consolidated readings (UFO@home)"

  law(value: WitnessValue, conditions?: WitnessConditions): ErrorLaw {
    const v = value.value
    const measured = value.basis === "measured"
    switch (value.kind) {
      case "time": {
        if (value.how === "clock" || measured) return { shape: "range", low: -1, high: 1, note: "timeClock", params: { minutes: 1 }, status: "argued", sources: ["Bullard 2014"] }
        if (value.how === "anchored") return { shape: "range", low: -2, high: 2, note: "timeAnchored", params: { minutes: 2 }, status: "argued", sources: ["Bullard 2014"] }
        return { shape: "range", low: -6, high: 6, note: "timeEstimated", params: { minutes: 6 }, status: "single", sources: ["Rospars 2023"] }
      }
      case "duration":
        return { shape: "range", low: v / 3, high: v * 3, note: "duration", params: { factor: 3 }, status: "consolidated", sources: ["Rospars 2023", "Peiniger 1998b"] }
      case "elevation":
        if (value.how === "instrument" || measured) return { shape: "range", low: v - 2, high: v + 2, note: "measuredInstrument", params: { degrees: 2 }, status: "argued", sources: [] }
        if (value.how === "landmark") return { shape: "range", low: v - 5, high: v + 5, note: "measuredLandmark", params: { degrees: 5 }, status: "argued", sources: [] }
        // Overestimated, and only downward: for estimates of 25-40°, 4 true objects in 10 were at 10° or lower.
        return { shape: "range", low: Math.max(0, v * 0.3), high: v, note: "elevationOver", status: "consolidated", sources: ["Wertheimer 1968", "van Utrecht 2023"] }
      case "heading":
        if (value.how === "instrument" || measured) return { shape: "range", low: v - 5, high: v + 5, note: "measuredInstrument", params: { degrees: 5 }, status: "argued", sources: [] }
        if (value.how === "landmark") return { shape: "range", low: v - 10, high: v + 10, note: "measuredLandmark", params: { degrees: 10 }, status: "argued", sources: [] }
        return { shape: "range", low: v - 45, high: v + 45, note: "headingCross", params: { degrees: 45 }, status: "consolidated", sources: ["Rospars 2023", "Passot 2023"] }
      case "angularSize":
        return this.sizeLaw(v, value.how, conditions)
      case "distance":
        if (measured || ["occlusion", "known-size", "triangulation"].includes(value.how ?? "") || value.basis === "derived") {
          return { shape: "anchored", note: "distanceAnchored", status: "consolidated", sources: ["Hartmann 1968"] }
        }
        return { shape: "uninformative", note: "distanceNotData", params: { factor: 10 }, status: "consolidated", sources: ["Hartmann 1968", "Rospars 2023"] }
    }
  }

  /** An angular size: the observer's own factor when the Moon gauge was taken, else the law of how it was given. */
  protected sizeLaw(v: number, how: string | undefined, conditions?: WitnessConditions): ErrorLaw {
    const moon = WitnessError.moonFactor(conditions)
    if (moon !== undefined) return { shape: "range", low: v / moon / 1.1, high: v / moon * 1.1, note: "sizeMoon", params: { factor: moon }, status: "individual", sources: [] }
    if (how === "arm-length-gauge") return { shape: "range", low: v / 1.2, high: v * 1.2, note: "sizeGauge", params: { percent: 20 }, status: "argued", sources: [] }
    if (how === "shown-on-the-spot") return { shape: "range", low: v / 1.17, high: v / 1.02, note: "sizeShown", status: "contested", sources: ["Keul 2015"] }
    if (how === "recalled-object") return { shape: "range", low: v / 1.3, high: v, note: "sizeRecalled", status: "contested", sources: ["Keul 2015"] }
    return { shape: "range", low: v / 4, high: v / 3, note: "sizeArm", params: { from: 3, to: 4 }, status: "contested", sources: ["Peiniger 1998a"] }
  }

  parameters(conditions?: WitnessConditions, timeHow?: string): WitnessParameter[] {
    const moon = WitnessError.moonFactor(conditions)
    return [
      timeHow === "clock" ? { id: "clock", note: "clockClock", params: { minutes: 1 }, status: "argued" }
        : timeHow === "anchored" ? { id: "clock", note: "clockAnchored", params: { minutes: 2 }, status: "argued" }
        : { id: "clock", note: "clockEstimated", params: { minutes: 6 }, status: "single" },
      { id: "date", note: "dateShift", params: { percent: 2 }, status: "single" },
      { id: "heading", note: "headingRotation", params: { degrees: 45 }, status: "consolidated" },
      { id: "elevation", note: "elevationCompression", status: "consolidated" },
      moon !== undefined ? { id: "size", note: "sizeMoon", params: { factor: moon }, status: "individual" } : this.sizeParameter(),
      { id: "duration", note: "durationFactor", params: { factor: 3 }, status: "consolidated" }
    ]
  }

  protected sizeParameter(): WitnessParameter {
    return { id: "size", note: "sizeArm", params: { from: 3, to: 4 }, status: "contested" }
  }
}

/**
 * Keul's reading of angular sizes: under good conditions, a size shown by hand right away is within +2 to +17 %, and only one recalled
 * through a familiar object is about 30 % too large (`[Keul 2015]`, who also analysed Peiniger's studies). Everything else as consolidated.
 */
export class KeulErrorModel extends ConsolidatedErrorModel {
  override readonly id = "keul"
  override readonly title = "Keul (sizes shown on the spot)"

  protected override sizeLaw(v: number, how: string | undefined, conditions?: WitnessConditions): ErrorLaw {
    if (WitnessError.moonFactor(conditions) !== undefined || how === "arm-length-gauge" || how === "recalled-object") return super.sizeLaw(v, how, conditions)
    return { shape: "range", low: v / 1.17, high: v / 1.02, note: "sizeShown", status: "contested", sources: ["Keul 2015"] }
  }

  protected override sizeParameter(): WitnessParameter {
    return { id: "size", note: "sizeShown", status: "contested" }
  }
}

/** The error models a reader can pick from, and what is shared by all. */
export class WitnessError {
  /** The full Moon's apparent diameter, in degrees: what the Moon gauge is measured against. */
  static readonly MOON_DEG = 0.52

  static readonly MODELS: readonly ErrorModel[] = [new ConsolidatedErrorModel(), new KeulErrorModel()]

  /** How a value of each kind may have been obtained: what selects its law (see StatedValue.how). */
  static readonly HOW: Readonly<Record<ErrorKind, readonly string[]>> = {
    time: ["clock", "anchored", "estimated"],
    duration: ["clock", "anchored", "estimated"],
    angularSize: ["shown-on-the-spot", "arm-length-gauge", "recalled-object"],
    elevation: ["instrument", "landmark", "estimated"],
    heading: ["instrument", "landmark", "estimated"],
    distance: ["occlusion", "known-size", "triangulation", "estimated"]
  }

  static byId(id: string | undefined): ErrorModel {
    return WitnessError.MODELS.find(model => model.id === id) ?? WitnessError.MODELS[0]
  }

  /** The observer's own angular-size factor (×k), when the Moon gauge was taken: how much bigger than the Moon's 0.52° they showed it. */
  static moonFactor(conditions?: WitnessConditions): number | undefined {
    const shown = conditions?.moonShownDeg
    return shown !== undefined && shown > 0 ? shown / WitnessError.MOON_DEG : undefined
  }

  /** Rounded to 2 significant figures, as a law's figures are shown: they are not known any better. */
  static rounded(value: number): number {
    return value === 0 || !Number.isFinite(value) ? value : Number(value.toPrecision(2))
  }
}
