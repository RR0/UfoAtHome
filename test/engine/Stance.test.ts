import { describe, expect, it } from "vitest"
import { Gait } from "../../src/engine/place/Gait.js"
import { Stance } from "../../src/engine/place/Stance.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"

function standing(tags?: string[]): Sighting {
  const sighting = Sighting.create(undefined, [{ lat: 49.0789, lng: 2.3273 }])
  sighting.event.tags = tags
  sighting.observerTrack.addKeyframe(0, { lat: 49.0789, lng: 2.3273, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  sighting.observerTrack.addKeyframe(20_000, { lat: 49.0789, lng: 2.3273, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  return sighting
}

describe("Stance", () => {
  it("keeps a standing observer's eye moving, a little, and the same at the same instant", () => {
    const sighting = standing()
    const easts = Array.from({ length: 200 }, (_, k) => Gait.bodyAt(sighting, k * 100).eastM)
    expect(Math.max(...easts) - Math.min(...easts)).toBeGreaterThan(0.005)
    expect(Gait.bodyAt(sighting, 7_300)).toEqual(Gait.bodyAt(sighting, 7_300))
    for (let t = 0; t < 20_000; t += 250) {
      const offset = Gait.bodyAt(sighting, t)
      expect(Math.hypot(offset.eastM, offset.northM, offset.upM)).toBeLessThan(0.02)
    }
  })

  it("lets an eye's gaze wander a little, and a hand-held camera's turn fully", () => {
    const eye = standing()
    const camera = standing()
    camera.instrumentId = "slr-35mm-50"
    const turn = (sighting: Sighting) => Math.max(...Array.from({ length: 200 }, (_, k) => Math.abs(Gait.bodyAt(sighting, k * 100).yawDeg)))
    expect(turn(eye)).toBeGreaterThan(0.08)
    expect(turn(eye)).toBeLessThan(0.25)
    expect(turn(camera)).toBeGreaterThan(turn(eye) * 2)
  })

  it("leaves an observer the account says was paralysed perfectly still", () => {
    const sighting = standing(["RR3", "paralysis"])
    expect(Stance.of(sighting)).toBeUndefined()
    for (let t = 0; t < 20_000; t += 500) expect(Gait.bodyAt(sighting, t)).toEqual(Gait.STILL)
  })

  it("holds a long exposure still, as on a tripod, unless the recording says otherwise", () => {
    const pose = standing()
    pose.instrumentId = "slr-35mm-50"
    pose.exposureSeconds = 20
    expect(Stance.of(pose)).toBeUndefined()
    const snapshot = standing()
    snapshot.instrumentId = "slr-35mm-50"
    snapshot.exposureSeconds = 1 / 60
    expect(Stance.of(snapshot)).toBeDefined()
    pose.sway = 1
    expect(Stance.of(pose)).toBeDefined()
  })

  it("takes its size from the recording: 0 is a tripod, 2 twice a person's", () => {
    const tripod = standing()
    tripod.sway = 0
    for (let t = 0; t < 20_000; t += 500) expect(Gait.bodyAt(tripod, t)).toEqual(Gait.STILL)
    const person = standing()
    const shaky = standing()
    shaky.sway = 2
    expect(Gait.bodyAt(shaky, 3_100).eastM).toBeCloseTo(2 * Gait.bodyAt(person, 3_100).eastM, 12)
  })

  it("lets a stated sway overrule the paralysis default, and keeps it through the file", () => {
    const sighting = standing(["paralysis"])
    sighting.sway = 0.5
    expect(Stance.of(sighting)).toBeDefined()
    expect(fromSightingJson(toSightingJson(sighting)).sway).toBe(0.5)
  })
})
