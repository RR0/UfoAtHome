import { describe, expect, it } from "vitest"
import { SoundTrack } from "../../src/engine/model/SoundTrack.js"
import { DEFAULT_SOUND } from "../../src/engine/model/Sound.js"
import type { SightingSound, SoundKind } from "../../src/engine/model/Sound.js"
import { Sighting, resolveSoundAt } from "../../src/engine/model/Sighting.js"

function sound(kind: SoundKind, volume: number, pitchHz = 100, src?: string): SightingSound {
  return { kind, volume, pitchHz, src }
}

describe("SoundTrack", () => {
  it("stores and retrieves an exact keyframe", () => {
    const track = new SoundTrack()
    track.addKeyframe(100, sound("hum", 0.5))
    expect(track.getLatestSoundAt(100)?.kind).toBe("hum")
  })

  it("keeps keyframes sorted regardless of insertion order", () => {
    const track = new SoundTrack()
    track.addKeyframe(200, sound("whistle", 1))
    track.addKeyframe(0, sound("none", 0))
    track.addKeyframe(100, sound("hum", 0.5))
    expect(track.allKeyframes.map(k => k.t)).toEqual([0, 100, 200])
  })

  it("overwrites a keyframe recorded at the same t", () => {
    const track = new SoundTrack()
    track.addKeyframe(100, sound("hum", 0.2))
    track.addKeyframe(100, sound("hum", 0.9))
    expect(track.allKeyframes).toHaveLength(1)
    expect(track.getLatestSoundAt(100)?.volume).toBe(0.9)
  })

  it("removeKeyframeAt removes only the keyframe at that exact instant", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("none", 0))
    track.addKeyframe(100, sound("hum", 1))
    track.removeKeyframeAt(100)
    expect(track.allKeyframes.map(k => k.t)).toEqual([0])
  })

  // The whole reason sound is a track: a craft sitting silently on the ground, heard only from
  // the instant it lifts off (the case the feature was asked for). The timbre is held, so it stays
  // genuinely silent until that instant — the rising volume in between belongs to kind "none" and
  // is therefore inaudible (see SoundTrack.lerp).
  it("stays silent until the keyframe that names a timbre, then is heard", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("none", 0))
    track.addKeyframe(1000, sound("hum", 1))
    expect(track.getInterpolatedSoundAt(500)?.kind).toBe("none")
    expect(track.getInterpolatedSoundAt(1000)).toMatchObject({ kind: "hum", volume: 1 })
  })

  it("fades a sound in when both keyframes name the same timbre", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("hum", 0))
    track.addKeyframe(1000, sound("hum", 1))
    expect(track.getInterpolatedSoundAt(500)).toMatchObject({ kind: "hum", volume: 0.5 })
  })

  it("holds the kind until the next keyframe is actually reached, and blends the pitch", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("hum", 1, 100))
    track.addKeyframe(1000, sound("whistle", 1, 900))
    const midway = track.getInterpolatedSoundAt(500)
    expect(midway?.kind).toBe("hum")
    expect(midway?.pitchHz).toBeCloseTo(500)
    expect(track.getInterpolatedSoundAt(1000)?.kind).toBe("whistle")
  })

  it("holds src rather than blending it", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("hum", 1, 100, "a.ogg"))
    track.addKeyframe(1000, sound("hum", 1, 100, "b.ogg"))
    expect(track.getInterpolatedSoundAt(500)?.src).toBe("a.ogg")
    expect(track.getInterpolatedSoundAt(1000)?.src).toBe("b.ogg")
  })

  it("holds the first and last recorded values beyond both ends of its range", () => {
    const track = new SoundTrack()
    track.addKeyframe(100, sound("hum", 0.4))
    track.addKeyframe(200, sound("rumble", 0.8))
    expect(track.getInterpolatedSoundAt(0)?.volume).toBe(0.4)
    expect(track.getInterpolatedSoundAt(9999)?.kind).toBe("rumble")
  })

  it("round-trips through JSON", () => {
    const track = new SoundTrack()
    track.addKeyframe(0, sound("none", 0))
    track.addKeyframe(750, sound("crackle", 0.6, 320, "https://example.org/s.ogg"))
    const restored = SoundTrack.fromJSON(JSON.parse(JSON.stringify(track.toJSON())))
    expect(restored.allKeyframes).toEqual(track.allKeyframes)
  })
})

describe("resolveSoundAt", () => {
  // Silence, not an invented noise: a recording that says nothing about sound has a witness who
  // was never asked, and playing something would put words in their mouth (see Sound.ts).
  it("falls back to silence when the track is empty", () => {
    expect(resolveSoundAt(Sighting.create(), 0)).toEqual(DEFAULT_SOUND)
    expect(DEFAULT_SOUND.kind).toBe("none")
    expect(DEFAULT_SOUND.volume).toBe(0)
  })

  it("reads the track, interpolated, once it has keyframes", () => {
    const sighting = Sighting.create()
    sighting.soundTrack.addKeyframe(0, sound("none", 0))
    sighting.soundTrack.addKeyframe(400, sound("hum", 1))
    expect(resolveSoundAt(sighting, 200).volume).toBeCloseTo(0.5)
  })
})
