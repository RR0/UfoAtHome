import { describe, expect, it } from "vitest"
import type { SceneReference } from "../../src/engine/model/Reference.js"
import { ReferenceTimeline } from "../../src/engine/reference/ReferenceTimeline.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"

function film(extra: Partial<SceneReference> = {}): SceneReference {
  return { id: "film", kind: "video", src: "film.mp4", opacity: 1, registration: { headingDeg: 90, pitchDeg: 0, fovDeg: 20 }, ...extra }
}

describe("a video's frame at an instant of the timeline", () => {
  it("starts where it is said to, in file and in timeline", () => {
    const reference = film({ t: 2000, video: { fromS: 1.5 } })
    expect(ReferenceTimeline.mediaSecondsAt(reference, 2000, 1)).toBeCloseTo(1.5)
    expect(ReferenceTimeline.mediaSecondsAt(reference, 3000, 1)).toBeCloseTo(2.5)
  })

  it("shows nothing before its stretch or after it", () => {
    const reference = film({ t: 2000, video: { fromS: 1, toS: 3 } })
    expect(ReferenceTimeline.mediaSecondsAt(reference, 1999, 1)).toBeUndefined()
    expect(ReferenceTimeline.mediaSecondsAt(reference, 4000, 1)).toBeCloseTo(3)
    expect(ReferenceTimeline.mediaSecondsAt(reference, 4001, 1)).toBeUndefined()
  })

  it("ends with its file when its stretch does not say", () => {
    expect(ReferenceTimeline.mediaSecondsAt(film(), 5000, 1, 4)).toBeUndefined()
    expect(ReferenceTimeline.mediaSecondsAt(film(), 3000, 1, 4)).toBeCloseTo(3)
  })

  it("runs on real time: a timeline going twice as fast as the observation does not run the film twice as fast", () => {
    expect(ReferenceTimeline.mediaSecondsAt(film(), 2000, 2)).toBeCloseTo(1)
  })

  it("takes a slowed-down stretch back to the observation's own time", () => {
    expect(ReferenceTimeline.mediaSecondsAt(film({ video: { rate: 0.5 } }), 2000, 1)).toBeCloseTo(1)
  })
})

describe("where a video's camera points at an instant", () => {
  const moving = film({
    registrationTrack: [
      { t: 1000, headingDeg: 350, pitchDeg: 0 },
      { t: 3000, headingDeg: 10, pitchDeg: 4, rollDeg: 2, fovDeg: 30 }
    ]
  })

  it("is its registration without a track", () => {
    expect(ReferenceTimeline.registrationAt(film(), 500)).toEqual(film().registration)
  })

  it("is held outside the keys", () => {
    expect(ReferenceTimeline.registrationAt(moving, 0).headingDeg).toBe(350)
    expect(ReferenceTimeline.registrationAt(moving, 9000).headingDeg).toBe(10)
    expect(ReferenceTimeline.registrationAt(moving, 9000).fovDeg).toBe(30)
  })

  it("turns the short way round between two keys", () => {
    const halfway = ReferenceTimeline.registrationAt(moving, 2000)
    expect(halfway.headingDeg).toBeCloseTo(0)
    expect(halfway.pitchDeg).toBeCloseTo(2)
    expect(halfway.rollDeg).toBeCloseTo(1)
  })

  it("keeps the registration's field for a key that states none", () => {
    expect(ReferenceTimeline.registrationAt(moving, 1000).fovDeg).toBe(20)
    expect(ReferenceTimeline.registrationAt(moving, 2000).fovDeg).toBeCloseTo(25)
  })
})

describe("lining a video up at an instant", () => {
  const pointing = { headingDeg: 100, pitchDeg: 5, fovDeg: 20 }

  it("writes keys in the order of the timeline, the plain registration following the first", () => {
    const later = ReferenceTimeline.withKey(film(), 3000, pointing)
    const earlier = ReferenceTimeline.withKey(later, 1000, { headingDeg: 80, pitchDeg: 1, fovDeg: 20 })
    expect(earlier.registrationTrack!.map(key => key.t)).toEqual([1000, 3000])
    expect(earlier.registration.headingDeg).toBe(80)
  })

  it("replaces the key of the same instant", () => {
    const once = ReferenceTimeline.withKey(film(), 1000, pointing)
    const twice = ReferenceTimeline.withKey(once, 1010, { ...pointing, headingDeg: 120 })
    expect(twice.registrationTrack).toHaveLength(1)
    expect(twice.registrationTrack![0]!.headingDeg).toBe(120)
    expect(twice.registrationTrack![0]!.t).toBe(1000)
  })

  it("takes a key back, and leaves no empty track", () => {
    const once = ReferenceTimeline.withKey(film(), 1000, pointing)
    expect(ReferenceTimeline.withoutKey(once, 1000).registrationTrack).toBeUndefined()
    expect(ReferenceTimeline.withoutKey(once, 5000)).toBe(once)
  })
})

describe("what a video is told to do", () => {
  it("paused: jumps to the frame, or stays if it already shows it", () => {
    expect(ReferenceTimeline.command(1, 2, false, 1)).toEqual({ seekS: 2, play: false, rate: 1 })
    expect(ReferenceTimeline.command(2.001, 2, false, 1).seekS).toBeUndefined()
  })

  it("playing: catches a small lag up by its speed, without a jump", () => {
    const late = ReferenceTimeline.command(1.9, 2, true, 1)
    expect(late.seekS).toBeUndefined()
    expect(late.rate).toBeGreaterThan(1)
    expect(ReferenceTimeline.command(2.1, 2, true, 1).rate).toBeLessThan(1)
  })

  it("playing: jumps past what catching up could hide", () => {
    expect(ReferenceTimeline.command(1, 2, true, 0.5)).toEqual({ seekS: 2, play: true, rate: 0.5 })
  })
})

describe("telling a video from its source", () => {
  it("reads a file's type and an address's extension", () => {
    expect(ReferenceTimeline.kindOfSource({ type: "video/mp4" })).toBe("video")
    expect(ReferenceTimeline.kindOfSource({ type: "image/jpeg" })).toBe("photo")
    expect(ReferenceTimeline.kindOfSource({ url: "https://rr0.org/a/film.webm?x=1" })).toBe("video")
    expect(ReferenceTimeline.kindOfSource({ url: "data:video/mp4;base64,AAAA" })).toBe("video")
    expect(ReferenceTimeline.kindOfSource({ url: "https://rr0.org/a/photo.JPG" })).toBe("photo")
  })

  it("says nothing of an address that does not say", () => {
    expect(ReferenceTimeline.kindOfSource({ url: "https://example.org/picture" })).toBeUndefined()
  })
})

describe("a video in a recording", () => {
  it("round-trips through the file", () => {
    const reference = film({ t: 500, video: { fromS: 1.54, toS: 5.6, rate: 0.5 }, registrationTrack: [{ t: 0, headingDeg: 1, pitchDeg: 2 }] })
    const sighting = fromSightingJson({ version: 4, timeline: { keyframes: [] }, references: [reference] })
    expect(sighting.references).toEqual([reference])
    expect(toSightingJson(sighting).references).toEqual([reference])
  })
})
