import type { ReferenceKind, ReferenceRegistration, ReferenceRegistrationKey, SceneReference } from "../model/Reference.js"

/** What a video element is to do to show the frame it should. */
export interface VideoCommand {
  /** Where to jump, seconds of the file, when it is too far off to catch up. */
  seekS?: number
  play: boolean
  /** Its playback rate, its stated one with what catches up a small lag. */
  rate: number
}

/**
 * How a video of the place follows the timeline: which of its frames an instant shows, and where its camera was pointed then.
 *
 * Timeline and film do not run on the same clock. The timeline's milliseconds advance at the player's own rate (timeline over declared
 * duration, see UfoElement), whereas a film's second is a second of the observation, or a fraction of one when a broadcast slowed it down.
 * So the instant is turned into real time first, which is what `timeScale` is for.
 */
export class ReferenceTimeline {
  /** Past this many seconds off, a playing video jumps instead of catching up: a reader would see it lag. */
  static readonly SEEK_BEYOND_S = 0.25
  /** Closer than half a frame of a 30 frames/s film, a paused video already shows the frame it should. */
  static readonly SAME_FRAME_S = 1 / 60
  /** How much of its speed a playing video may change to catch up, unnoticed: the share of its rate. */
  static readonly CATCH_UP_SHARE = 0.1
  /** What browsers accept for a video's playback rate. */
  private static readonly MIN_RATE = 0.0625
  private static readonly MAX_RATE = 16

  /** The kind a source says it is, when it says: a video by its file's type or its address's extension, undefined for anything else. */
  static kindOfSource(source: { type?: string, url?: string }): ReferenceKind | undefined {
    if (source.type?.startsWith("video/")) return "video"
    if (source.type?.startsWith("image/")) return "photo"
    const url = source.url ?? ""
    if (url.startsWith("data:video/") || /\.(mp4|m4v|webm|ogv|mov)(?:[?#].*)?$/i.test(url)) return "video"
    if (url.startsWith("data:image/") || /\.(jpe?g|png|gif|webp|avif)(?:[?#].*)?$/i.test(url)) return "photo"
    return undefined
  }

  /**
   * The second of the file the instant `t` of the timeline shows, undefined outside the stretch laid over the scene: a film says nothing of
   * what happened before it started or after it stopped. `fileDurationS` is the end of a stretch that does not state its own, once known.
   */
  static mediaSecondsAt(reference: SceneReference, t: number, timeScale: number, fileDurationS?: number): number | undefined {
    const fromS = reference.video?.fromS ?? 0
    const endS = reference.video?.toS ?? fileDurationS ?? Number.POSITIVE_INFINITY
    const elapsedMs = t - (reference.t ?? 0)
    if (elapsedMs < 0) return undefined
    const seconds = fromS + (elapsedMs / (ReferenceTimeline.positive(timeScale) * 1000)) * ReferenceTimeline.rateOf(reference)
    return seconds <= endS ? seconds : undefined
  }

  /** How many seconds of its file make one second of the observation. */
  static rateOf(reference: SceneReference): number {
    return ReferenceTimeline.positive(reference.video?.rate ?? 1)
  }

  /**
   * Which way the picture is pointed at the instant `t`: its registration, or for a video lined up at several instants, what they say then.
   * Held outside the instants stated, and interpolated between them, the heading the short way round.
   */
  static registrationAt(reference: SceneReference, t: number): ReferenceRegistration {
    const base = reference.registration
    const track = reference.registrationTrack
    if (!track || track.length === 0) return base
    let after = track.findIndex(key => key.t > t)
    if (after === -1) after = track.length
    const a = track[Math.max(after - 1, 0)]!
    const b = track[Math.min(after, track.length - 1)]!
    const share = b.t > a.t ? Math.min(Math.max((t - a.t) / (b.t - a.t), 0), 1) : 0
    const turn = ((((b.headingDeg - a.headingDeg) % 360) + 540) % 360) - 180
    const rollA = a.rollDeg ?? 0
    const rollB = b.rollDeg ?? 0
    const roll = rollA + (rollB - rollA) * share
    const fovA = a.fovDeg ?? base.fovDeg
    return {
      headingDeg: (((a.headingDeg + turn * share) % 360) + 360) % 360,
      pitchDeg: a.pitchDeg + (b.pitchDeg - a.pitchDeg) * share,
      rollDeg: roll === 0 ? undefined : roll,
      fovDeg: fovA + ((b.fovDeg ?? base.fovDeg) - fovA) * share
    }
  }

  /** The key of a track an instant falls on, when one does: closer than a frame of the film at 25 frames/s is the same instant. */
  static keyIndexAt(reference: SceneReference, t: number): number {
    return (reference.registrationTrack ?? []).findIndex(key => Math.abs(key.t - t) < 20)
  }

  /**
   * The picture lined up at an instant as well: that instant's key written, in the order of the timeline. Its plain registration follows
   * the first key, so that whatever reads a registration alone has where the film starts.
   */
  static withKey(reference: SceneReference, t: number, registration: ReferenceRegistration): SceneReference {
    const key: ReferenceRegistrationKey = { t, ...registration }
    const index = ReferenceTimeline.keyIndexAt(reference, t)
    const others = (reference.registrationTrack ?? []).filter((_, at) => at !== index)
    const track = [...others, index >= 0 ? { ...key, t: reference.registrationTrack![index]!.t } : key].sort((a, b) => a.t - b.t)
    return { ...reference, registrationTrack: track, registration: ReferenceTimeline.plainOf(track[0]!, reference.registration) }
  }

  /** The picture without the key an instant falls on, if it has one. No key left is no track. */
  static withoutKey(reference: SceneReference, t: number): SceneReference {
    const index = ReferenceTimeline.keyIndexAt(reference, t)
    if (index < 0) return reference
    const track = reference.registrationTrack!.filter((_, at) => at !== index)
    if (track.length === 0) return { ...reference, registrationTrack: undefined }
    return { ...reference, registrationTrack: track, registration: ReferenceTimeline.plainOf(track[0]!, reference.registration) }
  }

  private static plainOf(key: ReferenceRegistrationKey, base: ReferenceRegistration): ReferenceRegistration {
    return { headingDeg: key.headingDeg, pitchDeg: key.pitchDeg, rollDeg: key.rollDeg, fovDeg: key.fovDeg ?? base.fovDeg }
  }

  /** What a video is to do, given where it is, where it should be and whether the timeline is running. */
  static command(currentS: number, targetS: number, playing: boolean, rate: number): VideoCommand {
    const stated = Math.min(Math.max(rate, ReferenceTimeline.MIN_RATE), ReferenceTimeline.MAX_RATE)
    const late = targetS - currentS
    if (!playing) return { seekS: Math.abs(late) > ReferenceTimeline.SAME_FRAME_S ? targetS : undefined, play: false, rate: stated }
    if (Math.abs(late) > ReferenceTimeline.SEEK_BEYOND_S) return { seekS: targetS, play: true, rate: stated }
    const catchUp = Math.min(Math.max(late / ReferenceTimeline.SEEK_BEYOND_S, -1), 1) * ReferenceTimeline.CATCH_UP_SHARE
    return { play: true, rate: Math.min(Math.max(stated * (1 + catchUp), ReferenceTimeline.MIN_RATE), ReferenceTimeline.MAX_RATE) }
  }

  private static positive(value: number): number {
    return value > 0 ? value : 1
  }
}
