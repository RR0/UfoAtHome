import { describe, expect, it } from "vitest"
import { RoadGrade } from "../../../src/engine/place/RoadGrade.js"
import { Sighting } from "../../../src/engine/model/Sighting.js"

/** A road running due north from the origin at about 10 m/s (0.0009° of latitude is ≈ 100 m per 10 s). */
function drive(headingDeg: number | undefined, speedDegPerS = 0.0001): Sighting {
  const sighting = Sighting.create(undefined, [{ lat: 34, lng: -106 }])
  for (let t = 0; t <= 20000; t += 1000) {
    sighting.observerTrack.addKeyframe(t, { lat: 34 + speedDegPerS * t / 1000, lng: -106, elevationM: 0, headingDeg, pitchDeg: -5, fovDeg: 60 })
  }
  return sighting
}

/** A hill rising 1 m per 10 m northward (≈ 5.7°). */
const HILL = { heightAt: (_east: number, north: number) => north / 10 }
const FLAT = { heightAt: () => 0 }

describe("RoadGrade", () => {
  it("raises the view by the slope of the road being driven up", () => {
    expect(RoadGrade.at(drive(0), 10000, HILL)).toBeCloseTo(Math.atan(0.1) * 180 / Math.PI, 0)
  })

  it("lowers it going down, and states nothing on the level", () => {
    expect(RoadGrade.at(drive(0), 10000, { heightAt: (_e, n) => -n / 10 })).toBeLessThan(0)
    expect(RoadGrade.at(drive(0), 10000, FLAT)).toBe(0)
  })

  it("is nothing for an observer who stands, whatever the hill under them", () => {
    expect(RoadGrade.at(drive(0, 0), 10000, HILL)).toBe(0)
  })

  it("fades as the view turns away from the way they go, and is lost looking out of the side", () => {
    const ahead = RoadGrade.at(drive(0), 10000, HILL)
    expect(RoadGrade.at(drive(60), 10000, HILL)).toBeCloseTo(ahead / 2, 0)
    expect(RoadGrade.at(drive(90), 10000, HILL)).toBeCloseTo(0, 5)
  })

  it("is nothing for a recording that does not say where it is", () => {
    expect(RoadGrade.at(Sighting.create(), 0, HILL)).toBe(0)
  })
})
