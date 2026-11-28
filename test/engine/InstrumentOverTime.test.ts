import { describe, expect, it } from "vitest"
import { Sighting, resolveObserverPoseAt } from "../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import { SightingShapes } from "../../src/engine/persistence/SightingShapes.js"
import { Instruments } from "../../src/engine/instrument/Instrument.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"
import { Stance } from "../../src/engine/place/Stance.js"

/** Carl Hart Jr.'s night as Ruppelt tells it: a first pass seen from his bed, then his Kodak 35 at a tenth of a second for the next two. */
function lookedThenPhotographed(): Sighting {
  const sighting = Sighting.create({ year: 1951, month: 8, day: 31 }, [{ lat: 33.57, lng: -101.87 }])
  sighting.instrumentId = "kodak-35"
  sighting.exposureSeconds = 0.1
  sighting.iso = 50
  const pose = { lat: 33.57, lng: -101.87, elevationM: 0, pitchDeg: 60, headingDeg: 0 }
  sighting.observerTrack.addKeyframe(0, { ...pose, fovDeg: 60, instrument: "eye" })
  sighting.observerTrack.addKeyframe(4000, { ...pose, fovDeg: 60, instrument: "eye" })
  sighting.observerTrack.addKeyframe(5000, { ...pose, fovDeg: Instruments.fieldOfViewDeg(Instruments.byId("kodak-35")), fNumber: 3.5 })
  return sighting
}

describe("An instrument that changes in the course of an observation", () => {
  it("is the one the pose names, held until a pose names another, and the recording's own where none does", () => {
    const sighting = lookedThenPhotographed()
    expect(sighting.instrumentAt(0).id).toBe("eye")
    expect(sighting.instrumentAt(4500).id).toBe("eye")
    expect(sighting.instrumentAt(5000).id).toBe("kodak-35")
    expect(sighting.instrumentAt(9000).id).toBe("kodak-35")
    expect(resolveObserverPoseAt(sighting, 4500)?.instrument).toBe("eye")
    expect(sighting.changesInstrument).toBe(true)
  })

  it("leaves a recording through one instrument as it was", () => {
    const sighting = Sighting.create(undefined, [{ lat: 0, lng: 0 }])
    sighting.instrumentId = "instamatic-126"
    sighting.observerTrack.addKeyframe(0, { elevationM: 0, pitchDeg: 0, fovDeg: 36 })
    expect(sighting.changesInstrument).toBe(false)
    expect(sighting.instrumentAt(1000).id).toBe("instamatic-126")
    expect(sighting.exposureAt(1000)).toBe(sighting.exposure)
  })

  it("gives the recording's shutter, film and speed to its own instrument only", () => {
    const sighting = lookedThenPhotographed()
    expect(sighting.exposureAt(1000)).toBeUndefined()
    expect(sighting.isoAt(1000)).toBeUndefined()
    expect(sighting.exposureAt(6000)).toBe(0.1)
    expect(sighting.isoAt(6000)).toBe(50)
  })

  it("is kept by a round trip through the file", () => {
    const restored = fromSightingJson(JSON.parse(JSON.stringify(toSightingJson(lookedThenPhotographed()))))
    expect(restored.instrumentAt(1000).id).toBe("eye")
    expect(restored.instrumentAt(6000).id).toBe("kodak-35")
  })

  it("places a direction in the frame of the instrument looked through then", () => {
    const sighting = lookedThenPhotographed()
    const eyeCentre = Instruments.frameWidthPx(Instruments.byId("eye"), ApparentSize.CANVAS_HEIGHT_PX) / 2
    const cameraCentre = Instruments.frameWidthPx(Instruments.byId("kodak-35"), ApparentSize.CANVAS_HEIGHT_PX) / 2
    expect(eyeCentre).not.toBe(cameraCentre)
    const box = (centreX: number) => ({ x: centreX - 5, y: ApparentSize.CANVAS_HEIGHT_PX / 2 - 5, width: 10, height: 10 })
    // A box in the middle of each frame is straight ahead, whichever frame it is.
    expect(SightingShapes.aimOf(sighting, 1000, box(eyeCentre))?.azimuthDeg).toBeCloseTo(0, 5)
    expect(SightingShapes.aimOf(sighting, 6000, box(cameraCentre))?.azimuthDeg).toBeCloseTo(0, 5)
  })

  it("holds still through the eye and sways in the hand", () => {
    const sighting = lookedThenPhotographed()
    sighting.exposureSeconds = 0.1
    const eye = Stance.of(sighting, 1000)!.offsetAt(2500).yawDeg
    const hand = Stance.of(sighting, 6000)!.offsetAt(2500).yawDeg
    expect(Math.abs(hand)).toBeGreaterThan(Math.abs(eye))
  })
})
