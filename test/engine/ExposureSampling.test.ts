import { describe, expect, it } from "vitest"
import { ExposureSampling } from "../../src/engine/model/ExposureSampling.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"
import { LIGHT_RIGS } from "../../src/engine/model/LightRig.js"

/** An airliner crossing at 3 km, from 3 km west of the witness to 3 km east, over `seconds`. */
function crossing(seconds: number, lights = LIGHT_RIGS.find(rig => rig.id === "airliner")!.create()): DecorObject {
  return {
    id: "plane",
    kind: "aircraft",
    eastM: 0,
    northM: 3000,
    lights,
    track: [
      { t: 0, eastM: -3000, northM: 3000, altitudeM: 3000 },
      { t: seconds * 1000, eastM: 3000, northM: 3000, altitudeM: 3000 }
    ]
  }
}

const STILL: DecorObject = { id: "tree", kind: "tree", eastM: 30, northM: 40 }

describe("ExposureSampling", () => {
  it("asks for one instant when nothing in the scene moves or flashes — a still scene is the same picture twice", () => {
    expect(ExposureSampling.instants([STILL], 0, 0, 30, 0.034)).toBe(1)
    expect(ExposureSampling.instants([], 0, 0, 300, 0.034)).toBe(1)
  })

  it("measures how far an aircraft really crossed, in degrees, over the pose", () => {
    // 3 km up and 3 km out on either side: the two lines of sight stand 70.5 degrees apart, which
    // is the angle itself and not the ground distance — a pass "across the sky" is not linear in it.
    expect(ExposureSampling.travelDegOver([crossing(10)], 0, 0, 10000)).toBeCloseTo(70.53, 1)
    // Half the pose is NOT half the angle: overhead the aircraft sweeps fastest.
    expect(ExposureSampling.travelDegOver([crossing(10)], 0, 0, 5000)).toBeCloseTo(35.26, 1)
    expect(ExposureSampling.travelDegOver([STILL], 0, 0, 30000)).toBe(0)
  })

  it("asks for an instant per couple of pixels of travel, so a lamp draws a line and not beads", () => {
    // 70.5 degrees at 0.034 deg/px is 2074 px, past any sane ceiling — hence the cap.
    expect(ExposureSampling.instants([crossing(10)], 0, 0, 10, 0.034)).toBe(ExposureSampling.MAX_INSTANTS)
    // A tenth of that pass, in the same ten seconds: 5.77 degrees, 170 px, one instant per two.
    expect(ExposureSampling.instants([crossing(100)], 0, 0, 10, 0.034)).toBe(85)
  })

  it("asks for two instants per flash, which is what tells one dot from the next", () => {
    // A single strobe at 60 a minute, nothing moving: 30 flashes in 30 s, so 60 instants.
    const strobeOnly: DecorObject = {
      id: "beacon", kind: "aircraft", eastM: 0, northM: 3000,
      lights: [{ id: "s", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", pattern: { kind: "flash", perMinute: 60, dutyCycle: 0.01 } }]
    }
    expect(ExposureSampling.flashesOver([strobeOnly], 30)).toBe(30)
    expect(ExposureSampling.instants([strobeOnly], 0, 0, 30, 0.034)).toBe(60)
    // A steady lamp has no rhythm to resolve.
    const steadyOnly: DecorObject = {
      ...strobeOnly,
      lights: [{ id: "s", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", pattern: { kind: "steady" } }]
    }
    expect(ExposureSampling.instants([steadyOnly], 0, 0, 30, 0.034)).toBe(1)
  })

  it("takes the coarsest demand of the two — an airliner's strobe is faster than its own crossing is wide", () => {
    // The Gennevilliers pose: ten seconds, an aircraft crossing 9 degrees, strobes at 60 a minute.
    const plane = crossing(100)
    const travelOnly = ExposureSampling.instants([{ ...plane, lights: undefined }], 0, 0, 10, 0.034)
    const flashesOnly = ExposureSampling.instants([{ ...plane, track: undefined }], 0, 0, 10, 0.034)
    expect(ExposureSampling.instants([plane], 0, 0, 10, 0.034)).toBe(Math.max(travelOnly, flashesOnly))
  })
})
