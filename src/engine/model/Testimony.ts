import type { SaidText } from "./SaidText.js"

/**
 * How an account reached whoever wrote the recording.
 *
 * The vocabulary is Ballester-Guasp's own information-quality scale, which grades a report by the
 * way it was obtained rather than by what it says: an on-site investigation and a newspaper cutting
 * can describe the same sighting and are not the same evidence (see
 * rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html).
 *
 * Kept as the FACT and not as that scale's number, for the same reason a tag is stored in English
 * and named by the reader's messages: a second method bands these differently, and a format that
 * stored one method's grade would have to be rewritten to admit the next one.
 */
export type TestimonySource =
  /** The investigator went to the place and questioned the witness there. */
  | "on-site"
  /** Questioned in person, but not at the place. */
  | "interview"
  /** Questioned by telephone. */
  | "telephone"
  /** The witness filled in a form. */
  | "questionnaire"
  /** The witness wrote it down themselves, unprompted. */
  | "letter"
  /** Taken from a newspaper or a broadcast, with no contact with the witness at all. */
  | "press"

/**
 * Who saw it and how their account travelled — everything the evaluation methods need and the
 * observation itself does not.
 *
 * Separate from `witness` (which is one person's identity, structurally aligned with @rr0/data and
 * not ours to extend) and separate from the timeline, because none of it is about the phenomenon.
 * Claude Poher puts it plainly on his own criteria page: "La crédibilité est dépendante des témoins,
 * l'étrangeté n'est liée qu'aux faits observés." A recording carried the second half and none of
 * the first, so half of every published evaluation method was uncomputable from it.
 *
 * Every field is optional and absent means unknown, never zero: "nobody recorded how many people
 * were there" and "one person was there" are different statements, and the methods that read this
 * score them differently (Poher gives 0 to an unknown count and 1 to a lone witness).
 */
export interface Testimony {
  /**
   * How many people saw it, this recording's own witness included.
   *
   * The first of Poher's four credibility rubrics and, at 31%, one of its three heaviest. A
   * recording could not state it at all until now: `witness` names one person, and the others who
   * were present appear only as decor if somebody placed them there.
   */
  witnessCount?: number
  /** The main witness's age in years AT THE TIME, not today — a 1974 account is read by whoever
   * finds it decades later, and the number that means anything is the one from then. */
  witnessAgeYears?: number
  /**
   * What the main witness did, as they are described: "boulanger", "pilote de ligne", "gendarme".
   *
   * Prose and not a level, deliberately. Poher's third rubric bands occupations onto a 0-5 scale of
   * his own ("Ecoliers, Bergers" through "Pilotes, Chercheurs, Astronomes"), a banding that is his
   * argument and not a fact about the witness; storing the band would bake one method's judgment
   * into every file and leave the next method nothing to disagree with.
   */
  witnessOccupation?: SaidText
  /** How the account reached the person who wrote this recording. */
  source?: TestimonySource
  /**
   * Whether the witness was gone back to after the first account.
   *
   * Ballester-Guasp separates a questionnaire or a letter that was followed up from one that was
   * not, and rates the followed-up one higher. Absent means unknown rather than "no": a report that
   * says nothing about follow-up is not a report that says none happened.
   */
  followedUp?: boolean
}
