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
 * About THE witness, singular, because a recording is one person's account. How many people that
 * account puts at the scene is not a field here: it is counted off the decor by
 * Sighting.witnessCount, since the witnesses this one names are placed rather than tallied, and a
 * stored number beside them would be free to disagree with them.
 *
 * That count is the account's own claim and may be wrong. It is also not the CASE's count: a case
 * gathers one recording per witness who gave an account (see Sighting.caseId), so four people in a
 * car who produced one testimony between them are four in this recording and one in that case.
 * Evaluating a case is a separate exercise from evaluating a testimony, and each reads its own.
 *
 * Separate from `witness` (which is one person's identity, structurally aligned with @rr0/data and
 * not ours to extend) and separate from the timeline, because none of it is about the phenomenon.
 * Claude Poher puts it plainly on his own criteria page: "La crédibilité est dépendante des témoins,
 * l'étrangeté n'est liée qu'aux faits observés." A recording carried the second half and none of
 * the first, so half of every published evaluation method was uncomputable from it.
 *
 * Every field is optional, and absent means unknown rather than zero: a report silent about
 * follow-up is not a report saying none happened, and the methods reading this score the two
 * differently. The one exception is `witnessCount`, which has somewhere better to be read from —
 * see its own comment.
 */
export interface Testimony {
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
