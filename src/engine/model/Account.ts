import type { SaidText } from "./SaidText.js"
import type { SightingTime } from "./Sighting.js"
import type { ObserverSettings } from "../observer/ObserverProvider.js"

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
export type AccountSource =
  /** The investigator went to the place and questioned the observer there. */
  | "on-site"
  /** Questioned in person, but not at the place. */
  | "interview"
  /** Questioned by telephone. */
  | "telephone"
  /** The observer filled in a form. */
  | "questionnaire"
  /** The observer wrote it down themselves, unprompted. */
  | "letter"
  /** The observer published it themselves on a social network or a forum: written unprompted like a
   * letter, but addressed to everybody and nobody, usually short, and with no question asked of them
   * yet. Distinct from "press", where the account has passed through somebody else's hands. */
  | "social-media"
  /** Taken from a newspaper or a broadcast, with no contact with the observer at all. */
  | "press"

/**
 * Who saw it and how their account travelled — everything the evaluation methods need and the
 * observation itself does not.
 *
 * About THE observer, singular, because a recording is one person's account. How many people that
 * account puts at the scene is not a field here: it is counted off the decor by
 * Sighting.observerCount, since the observers this one names are placed rather than tallied, and a
 * stored number beside them would be free to disagree with them.
 *
 * That count is the account's own claim and may be wrong. It is also not the CASE's count: a case
 * gathers one recording per observer who gave an account (see CaseFile), so four people in a
 * car who produced one account between them are four in this recording and one in that case.
 * Evaluating a case is a separate exercise from evaluating a account, and each reads its own.
 *
 * Separate from `observer` (which is one person's identity, structurally aligned with @rr0/data and
 * not ours to extend) and separate from the timeline, because none of it is about the phenomenon.
 * Claude Poher puts it plainly on his own criteria page: "La crédibilité est dépendante des observateurs,
 * l'étrangeté n'est liée qu'aux faits observés." A recording carried the second half and none of
 * the first, so half of every published evaluation method was uncomputable from it.
 *
 * Every field is optional, and absent means unknown rather than zero: a report silent about
 * follow-up is not a report saying none happened, and the methods reading this score the two
 * differently. The one exception is `observerCount`, which has somewhere better to be read from —
 * see its own comment.
 */
export interface Account {
  /** The main observer's age in years AT THE TIME, not today — a 1974 account is read by whoever
   * finds it decades later, and the number that means anything is the one from then. */
  observerAgeYears?: number
  /**
   * The main observer's birth date, as precisely as it is known (a full date, a year, or one
   * marked approximate): the other way of stating `observerAgeYears`, which the editor keeps in
   * step with it against the observation date (see ObserverAge).
   */
  observerBirth?: SightingTime
  /**
   * How the main observer's own perception differs from a typical one — colour vision, alcohol,
   * fatigue — as the values of the ObserverProviders' settings, by provider id. Only what differs
   * from the default is stored; absent means a typical observer.
   */
  observerPerception?: Record<string, ObserverSettings>
  /**
   * What the main observer did, as they are described: "boulanger", "pilote de ligne", "gendarme".
   *
   * Prose and not a level, deliberately. Poher's third rubric bands occupations onto a 0-5 scale of
   * his own ("Ecoliers, Bergers" through "Pilotes, Chercheurs, Astronomes"), a banding that is his
   * argument and not a fact about the observer; storing the band would bake one method's judgment
   * into every file and leave the next method nothing to disagree with.
   */
  observerOccupation?: SaidText
  /** How the account reached the person who wrote this recording. */
  source?: AccountSource
  /**
   * Whether the observer was gone back to after the first account.
   *
   * Ballester-Guasp separates a questionnaire or a letter that was followed up from one that was
   * not, and rates the followed-up one higher. Absent means unknown rather than "no": a report that
   * says nothing about follow-up is not a report that says none happened.
   */
  followedUp?: boolean
  /**
   * What kind of work the main observer did, beside the prose of `observerOccupation`: what an evaluation method bands. Kinds and not a
   * method's levels, so that each method bands them its own way (see BallesterGuaspAssessor). A retired observer is given the work they
   * retired from: "retired" is not an occupation, as Ballester-Guasp insist.
   */
  observerOccupationKind?: OccupationKind
  /** Whether the main observer holds a university degree, whatever they worked as: Ballester-Guasp rate a graduate homemaker as a graduate. */
  observerGraduate?: boolean
  /** How long the investigator spent with the observer, minutes: on the place, face to face or on the phone (see `source`). */
  enquiryMinutes?: number
  /** What ties the observers this account places together, when it places more than one. */
  observersRelation?: ObserversRelation
  /** What the main observer was doing when the sighting began. */
  activity?: ObserverActivity
  /**
   * What the investigators found anomalous in this account once they had examined it: each of Ballester-Guasp's seven strangeness factors
   * that is still unexplained (true), or that is not there or was explained (false). Absent means not judged, and for the three a recording
   * can say itself (`detection`, `close`, `beings`), the recording is read instead.
   *
   * The investigators' judgment and not the observer's words: Ballester-Guasp count the factors left after analysis, "not only the
   * witnesses' first statements". Its provenance says how it was reached.
   */
  strangeness?: Partial<Record<StrangenessFactor, boolean>>
  /**
   * The conditions of this account and of the sighting as the observer lived it: what the error laws of the values they give read
   * (see docs/witness-error-model.md and WitnessError). Each absent means unknown.
   */
  conditions?: WitnessConditions
}

/** What kind of work an observer did, as evaluation methods tell occupations apart (see Account.observerOccupationKind). */
export type OccupationKind =
  | "student" | "worker" | "farmer" | "homemaker"
  | "merchant" | "business" | "employee" | "artist"
  | "technician" | "police" | "pilot" | "military"

/** What ties the observers of one account together: the more remote the tie, the less likely a hoax made together. */
export type ObserversRelation = "friends" | "family" | "professional" | "none"

/** What an observer was doing when the sighting began: what says how likely a hoax was. */
export type ObserverActivity =
  /** Walking, resting, out, hunting, at sport, at home, on holiday. */
  | "leisure"
  /** On the move, by whatever means, other than to or from work. */
  | "travelling"
  /** A cultural or intellectual activity. */
  | "cultural"
  /** At work, or on the way to or from it. */
  | "working"

/** Ballester-Guasp's seven strangeness factors, in their own order (see Account.strangeness). */
export const STRANGENESS_FACTORS: readonly StrangenessFactor[] = ["appearance", "movement", "incongruity", "detection", "close", "beings", "traces"]

/** Ballester-Guasp's seven strangeness factors (see Account.strangeness). */
export type StrangenessFactor =
  /** A shape or size no identifiable aircraft has, or lights whose intensity or layout rules out conventional ones. */
  | "appearance"
  /** Speeds or accelerations beyond the fastest aircraft, broken or helical paths, a "falling leaf". */
  | "movement"
  /** Appearing or vanishing on the spot, two objects merging into one, an object deforming, "solid light". */
  | "incongruity"
  /** Seen or recorded through a calibrated instrument: radar, telescope, theodolite, photograph, film, video, spectrum, sound. */
  | "detection"
  /** Seen from within about 150 m (Hynek's 500 feet). */
  | "close"
  /** Beings seen with an object that has an anomalous appearance, movement or incongruity. */
  | "beings"
  /** Physical or chemical traces left, or effects on people, machines or electrical circuits. */
  | "traces"

/** What the word an observer used for the phenomenon was: it predicts what metric detail they volunteer, not how wrong it is. */
export type WitnessWord = "light" | "object" | "craft" | "ufo" | "other"

/** What the observer had been exposed to before this account: whether it may echo what they heard or read. */
export type WitnessExposure = "none" | "press" | "broadcast" | "other-witnesses" | "investigators"

/**
 * The conditions of one account, as error laws read them: when it was given and which version it is (the earliest weighs most;
 * retelling lowers the ratio of right to wrong details), the word used, the exposure before it and whether the observers talked to
 * each other, how the observer could see — and the Moon gauge, the one measure that makes a population law individual.
 */
export interface WitnessConditions {
  /** Days between the sighting and this account. */
  delayDays?: number
  /** Which version of the observer's account this is: 1 for the first given. */
  version?: number
  word?: WitnessWord
  exposure?: WitnessExposure
  /** Whether the observers gave their accounts without talking to each other first. */
  independent?: boolean
  /** Whether the observer's eyes were used to the dark. */
  darkAdapted?: boolean
  /** Whether the observer wore the glasses or lenses they need. */
  correctedVision?: boolean
  /** Whether a bright light dazzled the observer just before. */
  glare?: boolean
  /**
   * How wide the observer showed the full Moon, in degrees, the way they showed the object: their own angular-size factor is this
   * over the Moon's real 0.52°, applied to every angular size they give (see WitnessError.MOON_DEG).
   */
  moonShownDeg?: number
}
