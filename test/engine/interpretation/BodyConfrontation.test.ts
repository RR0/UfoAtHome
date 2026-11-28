import { describe, expect, it } from "vitest"
import { BodyConfrontation } from "../../../src/engine/interpretation/BodyConfrontation.js"
import type { BodyState } from "../../../src/engine/interpretation/BodyPlacement.js"
import { Timeline } from "../../../src/engine/model/Timeline.js"
import { createOval } from "../../../src/engine/shape/Shape.js"
import { WitnessError } from "../../../src/engine/witness/WitnessError.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"

const eye = { eastM: 0, northM: 0, upM: 0 }

const sphereAt = (northM: number, diameterM: number, id = "sphere"): BodyState => ({
  id: "craft",
  model: { id },
  explains: ["ufo"],
  eastM: 0,
  northM,
  upM: 0,
  sizeM: { widthM: diameterM, lengthM: diameterM, heightM: diameterM },
  attitude: { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
  appearance: { color: "#fff", albedo: 0.5, finish: "matt", luminanceCdM2: 0, transparency: 0, haloScale: 1 },
  throwsFlame: false
})

const degrees = (radians: number) => radians * 180 / Math.PI

describe("BodyConfrontation", () => {
  it("projects a sphere to its true angular diameter, in the direction of its centre", () => {
    const projection = BodyConfrontation.projectionOf(sphereAt(100, 10), eye)!
    expect(projection.aim.azimuthDeg).toBeCloseTo(0, 6)
    expect(projection.aim.altitudeDeg).toBeCloseTo(0, 6)
    // Its points sampled around the equator span 2·atan(5/100); the silhouette itself is 2·asin(5/100).
    expect(projection.angular.widthDeg).toBeCloseTo(degrees(2 * Math.atan(5 / 100)), 2)
    expect(projection.angular.heightDeg).toBeCloseTo(degrees(2 * Math.atan(5 / 100)), 2)
  })

  it("measures a turned body across its view, not along its own axes", () => {
    const long = { ...sphereAt(100, 1, "box"), sizeM: { widthM: 1, lengthM: 20, heightM: 1 } }
    const endOn = BodyConfrontation.projectionOf(long, eye)!
    const broadside = BodyConfrontation.projectionOf({ ...long, attitude: { headingDeg: 90, pitchDeg: 0, rollDeg: 0 } }, eye)!
    expect(broadside.angular.widthDeg).toBeGreaterThan(endOn.angular.widthDeg * 5)
  })

  it("agrees with a account the body reproduces, and says where one it does not reproduce departs", () => {
    const stated = { aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 5.7, heightDeg: 5.7 } }
    const agrees = BodyConfrontation.compare("ufo", "craft", stated, BodyConfrontation.projectionOf(sphereAt(100, 10), eye)!)
    expect(agrees.disagreements).toEqual([])
    // The same claim, ten times further: the observer said it filled six degrees, and this would be
    // a spark.
    const far = BodyConfrontation.compare("ufo", "craft", stated, BodyConfrontation.projectionOf(sphereAt(1000, 10), eye)!)
    expect(far.disagreements).toEqual(["width", "height"])
    expect(far.widthRatio).toBeCloseTo(0.1, 1)
  })

  it("answers a phenomenon several bodies claim by the one that is there, not by those kilometres off", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "ufo", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 5.7, heightDeg: 5.7 } } }])
    // A flock for each of three passes of the same light: one in front of the eye, one gone south, one not yet come from the north-east.
    const here = { ...sphereAt(100, 10), id: "here" }
    const gone = { ...sphereAt(-2000, 10), id: "gone" }
    const coming = { ...sphereAt(2000, 10), id: "coming", eastM: 2000 }
    const readings = new BodyConfrontation(timeline).at(0, [gone, here, coming], eye)
    expect(readings).toHaveLength(1)
    expect(readings[0].bodyId).toBe("here")
    expect(readings[0].disagreements).toEqual([])
  })

  it("measures the bodies of one ensemble as one, by all their outlines: a flock taken for one craft", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "ufo", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 5.7, heightDeg: 1 } } }])
    // Three birds a metre wide, ten metres apart across the line of sight, a hundred metres off: one band of some 11.5°.
    const bird = (eastM: number, id: string): BodyState => ({ ...sphereAt(100, 1), id, eastM, ensemble: "flock" })
    const readings = new BodyConfrontation(timeline).at(0, [bird(-5, "a"), bird(0, "b"), bird(5, "c")], eye)
    expect(readings).toHaveLength(1)
    expect(readings[0].bodyId).toBe("flock")
    expect(readings[0].predicted.angular.widthDeg).toBeCloseTo(degrees(2 * Math.atan(5.5 / 100)), 0)
  })

  it("contradicts a direction off by more than the thing's own half-width", () => {
    const stated = { aim: { azimuthDeg: 10, altitudeDeg: 0 }, angular: { widthDeg: 5.7, heightDeg: 5.7 } }
    const reading = BodyConfrontation.compare("ufo", "craft", stated, BodyConfrontation.projectionOf(sphereAt(100, 10), eye)!)
    expect(reading.separationDeg).toBeCloseTo(10, 6)
    expect(reading.disagreements).toEqual(["direction"])
  })

  it("reads the account's own shape at the instant, for every phenomenon a body explains", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "ufo", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 5.7, heightDeg: 5.7 } } }])
    const readings = new BodyConfrontation(timeline).at(0, [sphereAt(100, 10)], eye)
    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({ sourceId: "ufo", bodyId: "craft", disagreements: [] })
  })

  it("measures nothing against a phenomenon the observer did not see at that instant", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "ufo", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), transparency: 1, aim: { azimuthDeg: 90, altitudeDeg: 0 } } }])
    expect(new BodyConfrontation(timeline).at(0, [sphereAt(100, 10)], eye)).toEqual([])
  })

  it("judges a size compared with a known object by its own law, not as one estimated at arm's length", () => {
    // "like the full Moon", and a body that is half a degree across: as large as said.
    const stated = { aim: { azimuthDeg: 0, altitudeDeg: 0 }, angular: { widthDeg: 0.52, heightDeg: 0.52 } }
    const moonSized = BodyConfrontation.projectionOf(sphereAt(1000, 1000 * 0.52 * Math.PI / 180), eye)!
    const tolerance = BodyConfrontation.lawsOf(WitnessError.MODELS[0])
    // At arm's length a witness says three to four times too much: a body as large as said is too large.
    expect(BodyConfrontation.compare("ufo", "craft", stated, moonSized, tolerance).disagreements).toContain("width")
    expect(BodyConfrontation.compare("ufo", "craft", { ...stated, sizeHow: "recalled-object" }, moonSized, tolerance).disagreements).toEqual([])
  })

  it("reads how a size was given from the provenance of the last keyframe stating it", () => {
    const timeline = { allKeyframes: [
      { t: 0, shapes: [{ sourceId: "ufo", shape: { angular: { widthDeg: 0.52, heightDeg: 0.52 } } }] },
      { t: 1000, shapes: [{ sourceId: "ufo", shape: { aim: { azimuthDeg: 1, altitudeDeg: 1 } } }] }
    ] } as never
    const { provenance } = Provenance.strip({ timeline: { keyframes: [
      { t: 0, shapes: [{ sourceId: "ufo", shape: { angular: { value: { widthDeg: 0.52, heightDeg: 0.52 }, basis: "stated", how: "recalled-object" } } }] }
    ] } } as never)
    const howOf = BodyConfrontation.sizeHows(timeline, provenance)
    expect(howOf(500, "ufo")).toBe("recalled-object")
    expect(howOf(1500, "ufo")).toBe("recalled-object")
    expect(howOf(500, "other")).toBeUndefined()
  })
})
