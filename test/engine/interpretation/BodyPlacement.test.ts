import { describe, expect, it } from "vitest"
import { BodyPlacement } from "../../../src/engine/interpretation/BodyPlacement.js"
import type { Ground, LocalPoint } from "../../../src/engine/interpretation/BodyPlacement.js"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"

const flat: Ground = { heightAt: () => 0 }
/** Rising one metre every ten metres northwards. */
const slope: Ground = { heightAt: (_east, north) => Math.max(0, north) / 10 }
const eyeAtOrigin = (ground: Ground) => (): LocalPoint => ({ eastM: 0, northM: 0, upM: ground.heightAt(0, 0) + BodyPlacement.EYE_HEIGHT_M })

const craft = (track: BodyJson["track"]): BodyJson => ({ id: "craft", model: { id: "ellipsoid" }, track })

describe("BodyPlacement", () => {
  it("stands a body stated in the world where it says, its centre half its height above the ground", () => {
    const placement = new BodyPlacement(craft([{ t: 0, eastM: 10, northM: 20, onGround: true, sizeM: { widthM: 4, lengthM: 4, heightM: 2 } }]), flat, eyeAtOrigin(flat))
    expect(placement.at(0)).toMatchObject({ eastM: 10, northM: 20, upM: 1 })
  })

  it("does not exist before its first keyframe, and stays as its last one left it", () => {
    const placement = new BodyPlacement(craft([{ t: 1000, eastM: 0, northM: 5, onGround: true }]), flat, eyeAtOrigin(flat))
    expect(placement.at(999)).toBeUndefined()
    expect(placement.at(50000)?.northM).toBe(5)
  })

  // The rule the whole relief work was for: a body on the ground stands on the ground there, and
  // the uphill edge of its footprint decides, not its centre.
  it("stands a grounded body on the highest point under its footprint", () => {
    const placement = new BodyPlacement(craft([{ t: 0, eastM: 0, northM: 20, onGround: true, sizeM: { widthM: 2, lengthM: 4, heightM: 2 } }]), slope, eyeAtOrigin(slope))
    // Ground is 2 m at its centre and 2.2 m under its northern end.
    expect(placement.at(0)?.upM).toBeCloseTo(2.2 + 1, 6)
  })

  it("follows the ground between two grounded keyframes instead of cutting through it", () => {
    const hill: Ground = { heightAt: (_east, north) => (north > 40 && north < 60 ? 10 : 0) }
    const placement = new BodyPlacement(craft([
      { t: 0, eastM: 0, northM: 20, onGround: true, sizeM: { widthM: 1, lengthM: 1, heightM: 1 } },
      { t: 1000, eastM: 0, northM: 80, onGround: true }
    ]), hill, eyeAtOrigin(hill))
    expect(placement.at(500)?.upM).toBeCloseTo(10.5, 6)
  })

  it("puts a direction from the witness with a distance at that distance along it", () => {
    const placement = new BodyPlacement(craft([{ t: 0, azimuthDeg: 90, altitudeDeg: 30, distanceM: 100 }]), flat, eyeAtOrigin(flat))
    const state = placement.at(0)!
    expect(state.eastM).toBeCloseTo(100 * Math.cos(Math.PI / 6), 6)
    expect(state.northM).toBeCloseTo(0, 6)
    expect(state.upM).toBeCloseTo(BodyPlacement.EYE_HEIGHT_M + 50, 6)
  })

  it("finds the distance of a grounded body stated by direction alone where the line of sight meets the relief", () => {
    // Looking down at 1.6/16 from 1.6 m over flat ground meets it 16 m out.
    const altitudeDeg = -Math.atan(0.1) * 180 / Math.PI
    const placement = new BodyPlacement(craft([{ t: 0, azimuthDeg: 0, altitudeDeg, onGround: true }]), flat, eyeAtOrigin(flat))
    expect(placement.at(0)?.northM).toBeCloseTo(16, 3)
  })

  it("fixes a keyframe stated from the witness with their pose at its own instant, not the one being drawn", () => {
    // The witness walks 10 m north between the two instants; a body stated 20 m north of them at
    // t=0 is 20 m north of the start, wherever they walk to afterwards.
    const walking = (t: number): LocalPoint => ({ eastM: 0, northM: t / 100, upM: BodyPlacement.EYE_HEIGHT_M })
    const placement = new BodyPlacement(craft([{ t: 0, azimuthDeg: 0, altitudeDeg: 0, distanceM: 20 }]), flat, walking)
    expect(placement.at(1000)?.northM).toBeCloseTo(20, 6)
  })

  it("never finds ground along a line of sight above the horizon over a plain", () => {
    expect(BodyPlacement.lineOfSightMeetsGround({ eastM: 0, northM: 0, upM: 1.6 }, 0, 5, flat)).toBeUndefined()
  })

  it("carries what a keyframe leaves unstated over from the one before, and blends what both state", () => {
    const placement = new BodyPlacement(craft([
      { t: 0, eastM: 0, northM: 0, onGround: true, sizeM: { widthM: 2, lengthM: 2, heightM: 2 }, attitude: { headingDeg: 350 }, appearance: { color: "#ff0000" } },
      { t: 1000, eastM: 100, northM: 0, altitudeAboveGroundM: 50, attitude: { headingDeg: 10 } }
    ]), flat, eyeAtOrigin(flat))
    const middle = placement.at(500)!
    expect(middle.sizeM.widthM).toBe(2)
    expect(middle.appearance.color).toBe("#ff0000")
    // The short way round, through north.
    expect(middle.attitude.headingDeg).toBeCloseTo(0, 6)
    expect(middle.upM).toBeCloseTo(25 + 1, 6)
  })

  it("lights a flame at the keyframe that states it, holds it, and puts it out when told to", () => {
    const flame = { lengthM: 2, widthM: 1, color: "#7fc4ff", luminanceCdM2: 20000 }
    const placement = new BodyPlacement(craft([
      { t: 0, eastM: 0, northM: 10, onGround: true },
      { t: 1000, flame },
      { t: 2000 },
      { t: 3000, flame: { ...flame, luminanceCdM2: 0 } }
    ]), flat, eyeAtOrigin(flat))
    // Not fading in over the second before it catches.
    expect(placement.at(500)?.flame).toBeUndefined()
    expect(placement.at(1000)?.flame?.luminanceCdM2).toBe(20000)
    expect(placement.at(2000)?.flame?.luminanceCdM2).toBe(20000)
    expect(placement.at(2500)?.flame?.luminanceCdM2).toBe(10000)
    expect(placement.at(3000)?.flame).toBeUndefined()
  })
})
