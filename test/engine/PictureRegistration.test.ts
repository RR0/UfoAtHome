import { describe, expect, it } from "vitest"
import { Vector3 } from "three"
import { PictureRegistration } from "../../src/engine/reference/PictureRegistration.js"
import type { Landmark } from "../../src/engine/reference/PictureRegistration.js"
import type { ReferenceRegistration } from "../../src/engine/model/Reference.js"
import { PhenomenonSystem } from "../../src/render3d/PhenomenonSystem.js"

const ASPECT = 552 / 385

/** Landmarks a picture registered `truth` would show at these points — the scene direction of each
 * being where the truth puts the pixel. */
function landmarksUnder(truth: ReferenceRegistration, points: { u: number; v: number }[]): Landmark[] {
  return points.map(picture => ({
    picture,
    scene: PictureRegistration.aimOf(PictureRegistration.worldDirectionOf(picture, truth, ASPECT))
  }))
}

function expectRegistration(actual: ReferenceRegistration, expected: ReferenceRegistration, digits = 6): void {
  expect(actual.headingDeg).toBeCloseTo(expected.headingDeg, digits)
  expect(actual.pitchDeg).toBeCloseTo(expected.pitchDeg, digits)
  expect(actual.rollDeg ?? 0).toBeCloseTo(expected.rollDeg ?? 0, digits)
  expect(actual.fovDeg).toBeCloseTo(expected.fovDeg, digits)
}

describe("PictureRegistration", () => {
  it("names directions the way the scene does", () => {
    const aim = { azimuthDeg: 288, altitudeDeg: 18.7 }
    const mine = PictureRegistration.worldDirection(aim)
    const scenes = PhenomenonSystem.directionOf(aim, new Vector3())
    expect(mine.distanceTo(scenes)).toBeLessThan(1e-12)
    const back = PictureRegistration.aimOf(mine)
    expect(back.azimuthDeg).toBeCloseTo(288, 9)
    expect(back.altitudeDeg).toBeCloseTo(18.7, 9)
  })

  it("reads its three angles back off the rotation it built, roll included", () => {
    for (const registration of [
      { headingDeg: 275, pitchDeg: -1, fovDeg: 27 },
      { headingDeg: 12.5, pitchDeg: 30, rollDeg: -7, fovDeg: 40 },
      { headingDeg: 359.9, pitchDeg: -45, rollDeg: 12, fovDeg: 60 }
    ]) {
      const angles = PictureRegistration.anglesOf(PictureRegistration.rotationOf(registration))
      expectRegistration({ ...angles, fovDeg: registration.fovDeg }, registration, 9)
    }
  })

  it("puts a picture point in the world and back again", () => {
    const registration = { headingDeg: 288, pitchDeg: 5, rollDeg: 3, fovDeg: 30 }
    for (const point of [{ u: 0.5, v: 0.5 }, { u: 0.1, v: 0.9 }, { u: 0.95, v: 0.05 }]) {
      const direction = PictureRegistration.worldDirectionOf(point, registration, ASPECT)
      const back = PictureRegistration.picturePointOf(direction, registration, ASPECT)!
      expect(back.u).toBeCloseTo(point.u, 9)
      expect(back.v).toBeCloseTo(point.v, 9)
    }
    // Behind the picture, or beside it: nowhere on it.
    const behind = PictureRegistration.worldDirection({ azimuthDeg: 108, altitudeDeg: 0 })
    expect(PictureRegistration.picturePointOf(behind, registration, ASPECT)).toBeUndefined()
    const beside = PictureRegistration.worldDirection({ azimuthDeg: 340, altitudeDeg: 0 })
    expect(PictureRegistration.picturePointOf(beside, registration, ASPECT)).toBeUndefined()
  })

  it("recovers heading, pitch and roll from two landmarks at a known field", () => {
    const truth = { headingDeg: 281.3, pitchDeg: -2.4, rollDeg: 1.7, fovDeg: 27 }
    const landmarks = landmarksUnder(truth, [{ u: 0.2, v: 0.45 }, { u: 0.8, v: 0.5 }])
    const fit = PictureRegistration.solve(landmarks, ASPECT, 27)!
    expectRegistration(fit.registration, truth)
    expect(fit.residualDeg).toBeLessThan(1e-6)
  })

  it("recovers the field too, from three landmarks or more", () => {
    const truth = { headingDeg: 275, pitchDeg: -1, rollDeg: 0, fovDeg: 27 }
    const landmarks = landmarksUnder(truth, [{ u: 0.15, v: 0.4 }, { u: 0.85, v: 0.5 }, { u: 0.5, v: 0.1 }, { u: 0.6, v: 0.9 }])
    const fit = PictureRegistration.solve(landmarks, ASPECT, 60)!
    expectRegistration(fit.registration, truth, 2)
    expect(fit.residualDeg).toBeLessThan(1e-2)
  })

  it("holds the field when told to, even with landmarks enough to fit it", () => {
    const truth = { headingDeg: 275, pitchDeg: -1, fovDeg: 27 }
    const landmarks = landmarksUnder(truth, [{ u: 0.15, v: 0.4 }, { u: 0.85, v: 0.5 }, { u: 0.5, v: 0.1 }])
    const fit = PictureRegistration.solve(landmarks, ASPECT, 27, false)!
    expect(fit.registration.fovDeg).toBe(27)
    expectRegistration(fit.registration, truth)
  })

  it("reports how badly a wrong landmark fits rather than pretending", () => {
    const truth = { headingDeg: 100, pitchDeg: 10, fovDeg: 40 }
    const landmarks = landmarksUnder(truth, [{ u: 0.2, v: 0.5 }, { u: 0.8, v: 0.5 }, { u: 0.5, v: 0.2 }])
    landmarks[2]!.scene.altitudeDeg += 6
    const fit = PictureRegistration.solve(landmarks, ASPECT, 40, false)!
    expect(fit.residualDeg).toBeGreaterThan(1)
    expect(fit.residualDeg).toBeLessThan(6)
  })

  it("has nothing to say from one landmark, or two that coincide", () => {
    const truth = { headingDeg: 100, pitchDeg: 10, fovDeg: 40 }
    expect(PictureRegistration.solve(landmarksUnder(truth, [{ u: 0.5, v: 0.5 }]), ASPECT, 40)).toBeUndefined()
    expect(PictureRegistration.solve(landmarksUnder(truth, [{ u: 0.5, v: 0.5 }, { u: 0.5, v: 0.5 }]), ASPECT, 40)).toBeUndefined()
  })
})
