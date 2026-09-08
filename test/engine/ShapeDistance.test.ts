import { describe, expect, it } from "vitest"
import { ShapeDistance } from "../../src/engine/shape/ShapeDistance.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const shape = (widthDeg: number) => ({
  sourceId: "ufo-1",
  shape: {
    kind: "oval" as const,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    color: "#c9c6bd",
    angle: 0,
    transparency: 0,
    haloScale: 0,
    selected: false,
    angular: { widthDeg, heightDeg: widthDeg / 2 }
  }
})

const pose = (lat: number, headingDeg: number) => ({
  lat, lng: 5.9632, elevationM: 600, headingDeg, pitchDeg: 0, fovDeg: 60
})

/**
 * Valensole, copied from the recording rr0.org publishes rather than read from it — the numbers are
 * the point of this test and are worth having in front of a reader.
 *
 * Maurice Masse walks due south (heading 180) from 43.845508 to 43.844758, which is 83.5 m, while
 * the craft grows from 2.22° to 30.09° across. Then he stops, and at 258 s the craft leaves and
 * shrinks again while he turns his head to follow it.
 */
const valensole = (): SightingRecordingJson => ({
  version: 1,
  time: { year: 1965, month: 7, day: 1, hour: 5, minute: 45 },
  utcOffsetHours: 1,
  place: [{ lat: 43.845508, lng: 5.9632 }],
  timeline: {
    keyframes: [
      { t: 0, shapes: [shape(2.2234)] },
      { t: 15000, shapes: [shape(2.9765)] },
      { t: 30000, shapes: [shape(4.5002)] },
      { t: 45000, shapes: [shape(9.224)] },
      { t: 55000, shapes: [shape(30.0897)] },
      { t: 250000, shapes: [shape(30.0897)] },
      { t: 260000, shapes: [shape(8.82)] },
      { t: 270000, shapes: [shape(4.26)] }
    ]
  },
  witnessTrack: {
    keyframes: [
      { t: 0, pose: pose(43.845508, 180) },
      { t: 15000, pose: pose(43.845304, 180) },
      { t: 30000, pose: pose(43.845099, 180) },
      { t: 45000, pose: pose(43.844895, 180) },
      { t: 55000, pose: pose(43.844758, 180) },
      { t: 250000, pose: pose(43.844758, 180) },
      { t: 260000, pose: pose(43.844758, 239.62) },
      { t: 270000, pose: pose(43.844758, 247.8) }
    ]
  }
})

describe("ShapeDistance", () => {
  it("recovers what Maurice Masse said, from a recording that says none of it", () => {
    // The account: "engin à 90 m", he approaches "jusqu'à 6 m", the craft is "3,5 m de large".
    // The recording holds angles and a walk, and not one metre of any of that.
    const estimate = ShapeDistance.of(fromSightingJson(valensole()), "ufo-1")!

    expect(estimate.distanceM[0].m).toBeCloseTo(90, 0)
    expect(estimate.nearestM).toBeCloseTo(6.5, 1)
    expect(estimate.widthM).toBeCloseTo(3.5, 1)
  })

  it("says which two instants it measured between, so the working can be checked by hand", () => {
    const estimate = ShapeDistance.of(fromSightingJson(valensole()), "ufo-1")!

    // The walk ends at 55 s and the craft only lifts off at 254 s, so the pair the witness moved
    // most between is also a pair the object was still through — which is the assumption the whole
    // derivation rests on, and the one nothing here can verify.
    expect(estimate.fromT).toBe(0)
    expect(estimate.toT).toBe(55000)
    expect(estimate.closedM).toBeCloseTo(83.5, 0)
  })

  it("follows the object back out once it leaves", () => {
    // Its real width does not change, so every later instant's distance falls out of its apparent
    // size — including instants after the witness stopped walking, where there is no baseline.
    const estimate = ShapeDistance.of(fromSightingJson(valensole()), "ufo-1")!
    const departing = estimate.distanceM.find(instant => instant.t === 270000)!

    expect(departing.m).toBeGreaterThan(40)
    expect(departing.m).toBeLessThan(60)
  })

  it("establishes nothing when the witness never moved", () => {
    // A driver who stopped their car has established nothing about distance, which is exactly why a
    // light in an empty sky stays a light at an unknown distance.
    const still = valensole()
    still.witnessTrack = {
      keyframes: still.witnessTrack!.keyframes.map(keyframe => ({ ...keyframe, pose: pose(43.845508, 180) }))
    }

    expect(ShapeDistance.of(fromSightingJson(still), "ufo-1")).toBeUndefined()
  })

  it("establishes nothing from a walk that never changed how big it looked", () => {
    // Strolling past a thing at a constant distance covers ground and settles nothing: it is the
    // component TOWARDS it that changes the angle. Here the witness walks south while looking east.
    const past = valensole()
    past.witnessTrack = {
      keyframes: past.witnessTrack!.keyframes.map(keyframe => ({ ...keyframe, pose: { ...keyframe.pose, headingDeg: 90 } }))
    }

    expect(ShapeDistance.of(fromSightingJson(past), "ufo-1")).toBeUndefined()
  })

  it("says nothing about a shape that states no apparent size", () => {
    const bare = valensole()
    bare.timeline.keyframes = bare.timeline.keyframes.map(keyframe => ({
      t: keyframe.t,
      shapes: keyframe.shapes.map(state => ({ sourceId: state.sourceId, shape: { ...state.shape, angular: undefined } }))
    }))

    expect(ShapeDistance.of(fromSightingJson(bare), "ufo-1")).toBeUndefined()
  })
})
