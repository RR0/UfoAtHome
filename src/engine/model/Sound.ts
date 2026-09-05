/**
 * A sound the witness reported hearing, at one instant of the observation.
 *
 * Testimony, not measurement — the exact counterpart of Shape: what reached the witness's ears,
 * the way Shape holds what reached their eyes. Which is why `kind` is a described timbre rather
 * than a waveform, and why "none" is a real value: a witness stating an object was SILENT (as most
 * do — the reported absence of any engine noise is half of what makes these accounts strange) is
 * saying something, and something quite different from a recording that never mentions sound at
 * all. A SoundTrack with no keyframes is the second case; a keyframe with kind "none" is the first.
 *
 * Sound lives on its own track (see SoundTrack/Sighting.soundTrack), not on Shape, even though it
 * is keyframed on the very same clock: an object drawn in several parts (Chiles-Whitted's fuselage
 * and its six windows are six separate sources) makes ONE noise, and hanging it off one arbitrary
 * part of the drawing would be an accident of how the witness happened to draw it.
 */
export type SoundKind =
  /** No sound at all — reported silence, not "unknown" (see this file's own doc comment). */
  | "none"
  /** A low, steady, pitched drone — "un bourdonnement", the most frequently reported of all. */
  | "hum"
  /** A high, pitched, air-like tone — "un sifflement". */
  | "whistle"
  /** Broadband low-frequency roar with no clear pitch — "un grondement". */
  | "rumble"
  /** Irregular sharp bursts — "un crépitement", the electrical-discharge kind of sound. */
  | "crackle"

/** Every SoundKind value, in the order an editor should offer them — see SightingEditorElement's
 * own sound select, which is built from this rather than from hardcoded markup (same reasoning as
 * Decor.ts's DECOR_SIDES). */
export const SOUND_KINDS: SoundKind[] = ["none", "hum", "whistle", "rumble", "crackle"]

/** Pitch bounds offered for `pitchHz`, and the value a fresh keyframe starts at — a deep hum
 * around 100 Hz sits where most reported drones do, and the range spans a distant rumble (30 Hz)
 * to a piercing whistle (4 kHz). */
export const MIN_PITCH_HZ = 30
export const MAX_PITCH_HZ = 4000
export const DEFAULT_PITCH_HZ = 100

export interface SightingSound {
  kind: SoundKind
  /**
   * How loud it was, 0 (inaudible) to 1 (as loud as the witness could describe) — deliberately
   * relative rather than a dB SPL figure: nobody reports a sound level in decibels, and inventing
   * one would claim a measurement where there is only an impression. Loudness is what makes a
   * sound start partway through an observation (an object silent on the ground, heard only once it
   * lifts off), so it blends between keyframes.
   */
  volume: number
  /**
   * The sound's own frequency in Hz — the oscillator's pitch for the pitched kinds ("hum",
   * "whistle"), and the noise filter's centre for the unpitched ones ("rumble", "crackle"), where
   * it reads as how deep or how sharp the noise is. Meaningless for "none". Blends between
   * keyframes: a rising pitch as an object accelerates is itself a reported observation.
   */
  pitchHz: number
  /**
   * An actual audio recording of the sound, when one exists (a witness who filmed the event, a
   * later recording of the same phenomenon) — replaces synthesis entirely while it is set, with
   * `volume` still scaling it. Absent is the ordinary case, and not a lesser one: a described
   * sound synthesized from that description is exactly as much testimony as a described shape
   * drawn from that description.
   *
   * Any URL, so cross-origin ones must be CORS-readable — and an embed carrying one is no longer
   * self-contained, which is why nothing here defaults to it.
   */
  src?: string
}

/** What a sighting sounds like when its SoundTrack has nothing to say — silence, which is also
 * exactly what a recording made before this track existed must keep sounding like. */
export const DEFAULT_SOUND: SightingSound = { kind: "none", volume: 0, pitchHz: DEFAULT_PITCH_HZ }
