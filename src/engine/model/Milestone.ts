import type { SaidText } from "./SaidText.js"

/**
 * A named instant in an observation — what the witness's own account calls a moment.
 *
 * Every case file that reproduces a testimony arrives with these already written: Blue Book's own
 * sketch of Socorro letters six of them (A: hears a roar and sees a flame in the sky; B: the sound
 * changes from high to low and stops; C: the wheels skid on the steep slope; D: sees the object and
 * the small figures; E: two dull thuds, a roar, a red insignia, and he runs; F: it goes off over the
 * shack and the canyon). They are how the account is READ.
 *
 * They are deliberately NOT cuts. A testimony is one continuous thing that happened to somebody,
 * and splitting it into clips would state, falsely, that the reader is looking at six observations
 * rather than at one. A milestone is a bookmark ON the single timeline — it says "this is the
 * moment the sound stopped", and the recording plays straight through it.
 *
 * Nor is a milestone a keyframe. Nothing about a shape, a pose, the weather or the sound is stored
 * here: those are already stated by their own tracks, at their own instants, and a milestone that
 * also carried them would be a second, drifting copy. It carries a name and nothing else, which is
 * precisely what none of the tracks can carry.
 */
export interface Milestone {
  /** When, in milliseconds from the start of the recording — the same scale every track uses. */
  t: number
  /** Short label, shown on the seek bar: the letter or number the account itself uses ("A", "B"),
   * or a couple of words where it uses none. Translatable — see SaidText — though a letter rarely
   * needs it. */
  label: SaidText
  /** What happened at that moment, in the account's own words where possible. Shown on hover and
   * as the marker's accessible name; a label alone ("C") tells a reader nothing. Translatable —
   * see SaidText. */
  note?: SaidText
}

/** Sorted by time, defensively copied — a recording read from JSON has whatever order it was
 * written in, and everything that draws these expects them in the order they happen. */
export function sortedMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.t - b.t)
}

/**
 * The milestone in force at `t` — the last one at or before it, or undefined before the first.
 *
 * Hold-last-value, the same resolution as every keyframed field in this model (see
 * resolveWeatherAt, resolveDecorLitAt): a moment named at 12 s is still the moment the recording is
 * in at 13 s. That is what lets a player say which part of the account is on screen without the
 * recording having to repeat the name at every instant.
 */
export function resolveMilestoneAt(milestones: Milestone[], t: number): Milestone | undefined {
  let current: Milestone | undefined
  for (const milestone of sortedMilestones(milestones)) {
    if (milestone.t > t) break
    current = milestone
  }
  return current
}
