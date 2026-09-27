import { describe, expect, it } from "vitest"
import { Gait } from "../../src/engine/place/Gait.js"
import { Stance } from "../../src/engine/place/Stance.js"
import { Sighting } from "../../src/engine/model/Sighting.js"

function standing(tags?: string[]): Sighting {
  const sighting = Sighting.create(undefined, [{ lat: 49.0789, lng: 2.3273 }])
  sighting.event.tags = tags
  sighting.observerTrack.addKeyframe(0, { lat: 49.0789, lng: 2.3273, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  sighting.observerTrack.addKeyframe(20_000, { lat: 49.0789, lng: 2.3273, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  return sighting
}

describe("Stance", () => {
  it("keeps a standing observer's view alive, a little, and the same at the same instant", () => {
    const sighting = standing()
    const yaws = Array.from({ length: 200 }, (_, k) => Gait.bodyAt(sighting, k * 100).yawDeg)
    expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(0.05)
    expect(Math.max(...yaws.map(Math.abs))).toBeLessThan(0.2)
    expect(Gait.bodyAt(sighting, 7_300)).toEqual(Gait.bodyAt(sighting, 7_300))
  })

  it("moves the eye by millimetres, not centimetres", () => {
    const sighting = standing()
    for (let t = 0; t < 20_000; t += 250) {
      const offset = Gait.bodyAt(sighting, t)
      expect(Math.hypot(offset.eastM, offset.northM, offset.upM)).toBeLessThan(0.01)
    }
  })

  it("leaves an observer the account says was paralysed perfectly still", () => {
    const sighting = standing(["RR3", "paralysis"])
    expect(Stance.of(sighting)).toBeUndefined()
    for (let t = 0; t < 20_000; t += 500) expect(Gait.bodyAt(sighting, t)).toEqual(Gait.STILL)
  })
})
