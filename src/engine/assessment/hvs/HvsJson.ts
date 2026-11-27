import type { SaidText } from "../../model/SaidText.js"
import type { NumberRange, ValueSource } from "../../persistence/Provenance.js"

/**
 * How an element of a case counts, as Stéphane Baron's HVS protocol sorts them (version 7.0, November 2026):
 * - `observed`: a fact observed, reported or read on an instrument. Counted.
 * - `inferred`: an inference, a size, a shape or a path estimated with nothing to gauge it by. Counted, and less sure.
 * - `association`: an inference of association, a trace or a breakdown tied to the phenomenon afterwards. Not counted.
 */
export type CaseElementStatus = "observed" | "inferred" | "association"

/**
 * One element of a case: something its accounts say happened, which a hypothesis explains or does not.
 *
 * The list is drawn up BEFORE any hypothesis is weighed, and frozen then (see CaseJson.elementsSealed): a list written after the fact
 * could be cut to fit the hypothesis one favours, which is what the protocol exists to prevent. It holds what is not an angle as much as
 * what is (a sudden going out, a silence, a colour): a reconstruction draws those, but only a list counts them.
 */
export interface CaseElementJson {
  /** What a hypothesis names it by: "E1". Unique in the case. */
  id: string
  /** What it is, in a few words: "an orange point of light". Translatable. */
  title?: SaidText
  status: CaseElementStatus
  /**
   * The `id` of the event of the account it comes from: an evaluation is an observation's, and two witnesses have two lists. Absent only in
   * a case of one account, which it is then of.
   */
  of?: string
  /**
   * The phenomenon of that account whose direction or size it is, by its `sourceId`, and the instant it is at (milliseconds, as the
   * account's timeline counts them; absent, every instant). A hypothesis that has a reading of the account then explains it or not by the
   * reading's own confrontation with what the witness said (see BodyConfrontation), not by what anyone declares.
   */
  phenomenon?: { sourceId: string, t?: number }
  /** What it rests on (see ValueSource). */
  source?: ValueSource
}

/** A rating from 0 to 1, bare or with its range and why (see StatedValue): the range is what the envelope of a score is made of. */
export type HvsRating = number | { value: number, range?: NumberRange, rationale?: SaidText }

/** Where a hypothesis stands past being the dominant one, as the analyst declares it: its stimulus identified, or the proof sealed. */
export type HvsMilestone = "identified" | "proven"

/** One hypothesis weighed for a case, with what the analyst gives of it (see HvsJson). */
export interface HvsHypothesisJson {
  /** What the case names it by: "lantern". Unique among the hypotheses. */
  id: string
  /** Its code in the protocol's taxonomy of hypotheses: "T1.4". */
  code?: string
  /** What it is: "balloon or lantern". Translatable. */
  title?: SaidText
  /**
   * The known phenomenon of Poher's matrix it is (`SkyLantern`, `Airship`, `WeatherBalloonsOrMongolfieres`), or the phenomena of a
   * combined hypothesis (a stimulus and what it set off): the pivot between the protocol's hypotheses and the readings of the case. A
   * reading of an observation whose bodies are of these phenomena, all of them and nothing else, tests it there (see
   * InterpretationKinds.phenomena), unless `readings` says otherwise. The code of the taxonomy cannot stand in for it, the taxonomy being
   * its author's: the analyst says which phenomenon a code is.
   */
  phenomenon?: string | string[]
  /**
   * The `id`s of the readings that test it, chosen by hand: in place of those its `phenomenon` finds, for a reading of bodies of no kind
   * (which no phenomenon finds) or to set a variant aside. Absent, the readings are found; empty, it has none.
   */
  readings?: string[]
  /**
   * The `id`s of the elements it explains, as the analyst judges. Only for elements its readings cannot settle: one about the direction or
   * the size of a phenomenon a reading of it places is settled by that reading (see CaseElementJson.phenomenon).
   */
  explains?: string[]
  /**
   * How plausible it is, apart from this case, on the protocol's three ratings, each 0 to 1 against a reference case: whether the
   * phenomenon is documented (`existence`), whether it is often mistaken (`frequency`), whether it holds physically (`compatibility`); and
   * the `context` factor of the time and the place, 0 to 1. These are the analyst's, never this program's: it knows no prior.
   */
  plausibility?: {
    existence?: HvsRating
    frequency?: HvsRating
    compatibility?: HvsRating
    context?: HvsRating
  }
  /** See HvsMilestone. The dominant hypothesis is worked out, not declared. */
  milestone?: HvsMilestone
}

/** The groups the IQI (information quality index, after the CNEGU's) rates a case's file on. */
export type IqiGroup = "dateTime" | "place" | "identification" | "witnesses" | "enquiry"

/** How fully the file answers an IQI group. */
export type IqiLevel = "complete" | "partial" | "absent"

/** What the analyst says of one observation of the case: its IQI, and the context factor of a hypothesis there, where it differs. */
export interface HvsObservationJson {
  /** The IQI as the analyst rates it, group by group. A group left out is suggested from the account where it can be (see Iqi). */
  iqi?: Partial<Record<IqiGroup, IqiLevel>>
  /** The context factor of a hypothesis for this observation, by the hypothesis's `id`, in place of its `plausibility.context`: two
   * witnesses may stand at different distances from a base, or decades apart. */
  context?: Record<string, HvsRating>
}

/**
 * What a case says of itself for Stéphane Baron's HVS protocol (Hypothesis Validity Score): its hypotheses, what the analyst gives of
 * them, and what is said of each observation. The hypotheses are the case's, and weighed against each observation apart, on that
 * observation's elements (see CaseJson.elements, CaseElementJson.of) and readings: two witnesses are two evaluations.
 */
export interface HvsJson {
  /** The version of the protocol it was weighed by: "7.0". */
  protocol?: string
  /** The version of its taxonomy of hypotheses: "2.1". */
  taxonomy?: string
  /** The hypotheses weighed, each against every observation of the case, one by one: an evaluation is an observation's. */
  hypotheses?: HvsHypothesisJson[]
  /** What is said of each observation, by the `id` of its account's event. */
  observations?: Record<string, HvsObservationJson>
}
