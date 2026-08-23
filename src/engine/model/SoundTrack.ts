import type { SightingSound } from "./Sound.js"

/**
 * What the sighting sounded like over time — a keyframe track alongside the UFO's Timeline, the
 * observer's ObserverTrack and the WeatherTrack, on that same one clock. Mirrors WeatherTrack.ts's
 * own shape (single track, not per-sourceId, same binary-search-insert/hold-last-value/interpolate
 * pattern) rather than sharing code with it — see ObserverTrack.ts's own doc comment on why that
 * pattern is intentionally duplicated instead of generalized.
 *
 * Being a track is the whole point: a sound rarely starts when the object does. An object sitting
 * silently on the ground and then heard as it lifts off is two keyframes — kind "none" at the
 * start, a hum at the instant it took off — and it really is silent until that instant, because a
 * timbre is held rather than blended (see lerp, which also says how to record a sound that
 * emerges gradually instead).
 */
export interface SoundKeyframe {
  t: number
  sound: SightingSound
}

export interface SoundTrackJson {
  keyframes: SoundKeyframe[]
}

export class SoundTrack {
  private readonly keyframes: SoundKeyframe[] = []

  addKeyframe(t: number, sound: SightingSound): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes[index] = { t, sound }
    } else {
      this.keyframes.splice(index, 0, { t, sound })
    }
  }

  /** Removes every keyframe. */
  clear(): void {
    this.keyframes.length = 0
  }

  /** Removes the keyframe at exactly time t, if one exists — leaves keyframes at every other time
   * untouched, unlike clear(). */
  removeKeyframeAt(t: number): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes.splice(index, 1)
    }
  }

  /** Hold-last-value: the most recently recorded sound at-or-before t. */
  getLatestSoundAt(t: number): SightingSound | undefined {
    let index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t !== t) {
      index -= 1
    }
    return index >= 0 ? this.keyframes[index].sound : undefined
  }

  /** Like getLatestSoundAt, but blends toward the next keyframe instead of holding the last one —
   * falls back to hold-last-value at the ends of the recorded range. */
  getInterpolatedSoundAt(t: number): SightingSound | undefined {
    const index = this.findInsertIndex(t)
    const atOrBefore = this.keyframes[index]?.t === t ? this.keyframes[index] : this.keyframes[index - 1]
    if (atOrBefore?.t === t) return atOrBefore.sound
    const after = this.keyframes[index]?.t === t ? undefined : this.keyframes[index]
    if (!atOrBefore) return after?.sound
    if (!after) return atOrBefore.sound
    const ratio = (t - atOrBefore.t) / (after.t - atOrBefore.t)
    return this.lerp(atOrBefore.sound, after.sound, Math.max(0, Math.min(1, ratio)))
  }

  get duration(): number {
    return this.keyframes.length === 0 ? 0 : this.keyframes[this.keyframes.length - 1].t
  }

  get allKeyframes(): ReadonlyArray<SoundKeyframe> {
    return this.keyframes
  }

  toJSON(): SoundTrackJson {
    return { keyframes: this.keyframes }
  }

  static fromJSON(json: SoundTrackJson): SoundTrack {
    const track = new SoundTrack()
    for (const keyframe of json.keyframes) {
      track.addKeyframe(keyframe.t, keyframe.sound)
    }
    return track
  }

  /**
   * `volume` and `pitchHz` blend; `kind` and `src` are held (from's value until t reaches 1), the
   * same "discrete fields are held" convention as WeatherTrack's own precipitationType/storm and
   * Shape's kind/title — there is no halfway timbre between a hum and a whistle.
   *
   * A kind change therefore happens at the second keyframe, while the volume ramp across that same
   * interval is already under way. The audible consequence is worth stating, since it is the case
   * this track was built for: a keyframe of silence followed by a keyframe of hum is heard as
   * silence right up to that second instant, and then the hum — a craft that stayed quiet on the
   * ground and was heard from the moment it lifted off. The rising volume in between is real data
   * but inaudible, because the timbre it would have belonged to is still "none".
   *
   * To record the other reading — a sound emerging gradually — give it two keyframes of its own
   * kind (hum at volume 0, then hum at full), which is also how a sound that changes character is
   * recorded: ramp the old kind down to 0, switch kind there, ramp the new one up.
   *
   * Volume blends toward `to` even when `to.kind` is "none" (a sound dying away is a fade, not a
   * cut) — nothing special-cases silence here, because a keyframe stating silence normally states
   * volume 0 alongside it.
   */
  private lerp(from: SightingSound, to: SightingSound, ratio: number): SightingSound {
    return {
      kind: ratio < 1 ? from.kind : to.kind,
      volume: from.volume + (to.volume - from.volume) * ratio,
      pitchHz: from.pitchHz + (to.pitchHz - from.pitchHz) * ratio,
      src: ratio < 1 ? from.src : to.src
    }
  }

  private findInsertIndex(t: number): number {
    let low = 0
    let high = this.keyframes.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.keyframes[mid].t < t) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }
}
