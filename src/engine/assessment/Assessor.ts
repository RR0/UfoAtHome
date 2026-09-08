import type { Sighting } from "../model/Sighting.js"
import type { Basis } from "../persistence/Provenance.js"

/**
 * One thing an assessment looked at, and what it found.
 *
 * Named by an `id` and never by prose: an assessor states what it examined, and how that reads in
 * a reader's language is the component's business, exactly as a tag is stored in English and named
 * by the messages (see SightingTags). It also keeps an assessor testable without a locale.
 */
export interface AssessmentCriterion {
  /** Stable id the reader's own messages name — "when", "apparent-size", "sound". */
  id: string
  /**
   * How well the recording answers it: the WEAKEST basis among the values that do, or undefined
   * when nothing does.
   *
   * Weakest and not best, deliberately. A moment given as a stated year and a derived minute is not
   * a stated moment, and an answer is worth no more than the least of what holds it up. It is also
   * the reading that errs the safe way, which is the same rule a draft is held to.
   */
  basis?: Basis
  /** Where in the recording the answer was found, so a reader can go and look rather than take an
   * assessor's word for it. Empty when nothing answered. */
  paths: string[]
}

/** What an assessor made of a recording. */
export interface Assessment {
  /**
   * The assessor's own conclusion as a stable id, for the ones that reach one — a classification
   * scheme's class, say. Absent for an assessment that only profiles what is there, which is a
   * conclusion of a different kind and is read off the criteria.
   */
  verdict?: string
  /** Every criterion, in the order the assessor means them to be read. */
  criteria: AssessmentCriterion[]
}

/**
 * Something that reads a finished recording and says something about it.
 *
 * The mirror of DataSource's usual employment. Every registry in this project so far feeds the
 * editor from outside — a geocoder, a weather record, an elevation tileset, a reader of accounts —
 * and this is the same seam pointing the other way: one interchangeable implementation, registered
 * the same way, and its picker is its credit (see assessmentSources.ts, and DataSource's own doc
 * comment on why a one-entry registry is worth having).
 *
 * Why a seam and not a function, here of all places: because these schemes disagree with each
 * other on purpose. Hynek classifies by what was seen and how close; Vallée by what it did; Poher
 * and Ballester-Guasp score the witness and the enquiry rather than the sighting at all, and say so
 * explicitly. None of them is the right answer, and a recording that could only be read one way
 * would be taking a side the format has no business taking.
 *
 * `assess` is async so an implementation can arrive when it is first wanted rather than in every
 * bundle: a reader who never opens an assessment pays for none of them.
 */
export interface Assessor {
  assess(sighting: Sighting): Promise<Assessment>
}
