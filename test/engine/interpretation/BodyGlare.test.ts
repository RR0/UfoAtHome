import { describe, expect, it } from "vitest"
import { BodyGlare } from "../../../src/engine/interpretation/BodyGlare.js"
import type { BodyState } from "../../../src/engine/interpretation/BodyPlacement.js"
import type { DecorLight } from "../../../src/engine/model/Decor.js"
import { BodyConfrontation } from "../../../src/engine/interpretation/BodyConfrontation.js"
import { Timeline } from "../../../src/engine/model/Timeline.js"
import { createOval } from "../../../src/engine/shape/Shape.js"

/** The illuminance at the eye of a star of `magnitude`. */
const luxOf = (magnitude: number) => Math.pow(10, (-14.18 - magnitude) / 2.5)

const body = (northM: number, headingDeg: number, lamps: DecorLight[]): BodyState => ({
  id: "plane", model: { id: "sphere" }, explains: ["light"], eastM: 0, northM, upM: 0,
  sizeM: { widthM: 30, lengthM: 30, heightM: 10 },
  attitude: { headingDeg, pitchDeg: 0, rollDeg: 0 },
  appearance: { color: "#fff", albedo: 0.5, finish: "matt", luminanceCdM2: 0, transparency: 0, haloScale: 1 },
  throwsFlame: false, lamps
})
const landing: DecorLight = { id: "landing", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", intensity: 600, pattern: { kind: "steady" }, beamDeg: 10 }
const eye = { eastM: 0, northM: 0, upM: 0 }

describe("BodyGlare", () => {
  it("sizes a star as Tycho saw them: two and a half minutes at the first magnitude, eighteen seconds at the sixth", () => {
    expect(BodyGlare.TYCHO.diameterDeg(luxOf(1)) * 3600).toBeCloseTo(150, 5)
    expect(BodyGlare.TYCHO.diameterDeg(luxOf(6)) * 3600).toBeCloseTo(18, 5)
    expect(BodyGlare.TYCHO.diameterDeg(0)).toBe(0)
  })

  it("sends a landing light's whole beam to an eye ahead of it, and none to one behind", () => {
    // The body is north of the eye: heading south, its nose is towards the eye.
    expect(BodyGlare.candelaToward(body(1000, 180, [landing]), eye, 0)).toBeCloseTo(60000, -1)
    expect(BodyGlare.candelaToward(body(1000, 0, [landing]), eye, 0)).toBe(0)
    // Ten degrees off its axis, half of it.
    const off = body(1000, 170, [landing])
    expect(BodyGlare.candelaToward(off, eye, 0)).toBeCloseTo(30000, -2)
  })

  it("leaves out a lamp switched off or between its flashes", () => {
    const strobe: DecorLight = { id: "strobe", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", intensity: 20, pattern: { kind: "flash", perMinute: 60, dutyCycle: 0.1 } }
    expect(BodyGlare.candelaToward(body(1000, 180, [strobe]), eye, 50)).toBeCloseTo(2000, 5)
    expect(BodyGlare.candelaToward(body(1000, 180, [strobe]), eye, 500)).toBe(0)
    const out: DecorLight = { ...landing, keyframes: [{ t: 1000, intensity: 0 }] }
    expect(BodyGlare.candelaToward(body(1000, 180, [out]), eye, 2000)).toBe(0)
  })

  it("sees lights by Tycho's sizes at night only", () => {
    const at = (time: string) => ({ event: { time: { year: 2024, month: 11, day: 30, hour: Number(time.slice(0, 2)), minute: 0 }, place: [{ lat: 40.85, lng: -74.19 }], utcOffsetHours: -5 } })
    expect(BodyGlare.seeingOf(at("00") as never)).toBe(BodyGlare.TYCHO)
    expect(BodyGlare.seeingOf(at("12") as never)).toBeUndefined()
  })

  it("sizes a body by the light of its lamps where that is larger than its outline, and says so", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "light", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 0.5, heightDeg: 0.5 } } }])
    // An airliner twenty kilometres off, its landing light at the eye.
    const far = body(20000, 180, [landing])
    const plain = new BodyConfrontation(timeline).at(0, [far], eye)[0]
    const lit = new BodyConfrontation(timeline, undefined, undefined, BodyGlare.TYCHO).at(0, [far], eye)[0]
    expect(plain.predicted.angular.widthDeg).toBeLessThan(0.1)
    expect(plain.lightSized).toBeUndefined()
    expect(lit.predicted.angular.widthDeg).toBeGreaterThan(0.3)
    expect(lit.lightSized).toBe(true)
  })
})
