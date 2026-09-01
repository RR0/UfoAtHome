import { describe, expect, it } from "vitest"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import { SightingShapes } from "../../src/engine/persistence/SightingShapes.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"
import { ImageProjection } from "../../src/engine/instrument/ImageProjection.js"
import { Instruments } from "../../src/engine/instrument/Instrument.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

/**
 * What a change of instrument may and may not do to a testimony.
 *
 * It may change every pixel — a square 126 frame is 360 wide where an eye's is 640, and a 50 mm
 * lens spreads 27 degrees across a height that held 60. It may NOT change where the witness said
 * the thing was, or how big they said it looked. Those are the record; the rest is a projection of
 * it.
 */
const OFF_CENTRE_PX = { x: 100, y: -60 }

function sightingWithShapeOffCentre(): Sighting {
  const width = 48
  const height = 28
  return fromSightingJson({
    version: 1,
    time: { year: 1965, month: 7, day: 1, hour: 5, minute: 45 },
    place: [{ lat: 45, lng: 5 }],
    timeline: {
      keyframes: [
        {
          t: 0,
          shapes: [
            {
              sourceId: "ufo-1",
              shape: {
                kind: "oval",
                bounds: {
                  x: ApparentSize.CANVAS_WIDTH_PX / 2 + OFF_CENTRE_PX.x - width / 2,
                  y: ApparentSize.CANVAS_HEIGHT_PX / 2 + OFF_CENTRE_PX.y - height / 2,
                  width,
                  height
                },
                color: "#39ff14",
                angle: 0,
                transparency: 0,
                haloScale: 1,
                selected: false,
                title: "Forme 1",
                angular: { widthDeg: 8, heightDeg: 4.6667 }
              }
            }
          ]
        }
      ],
      order: ["ufo-1"],
      groups: []
    }
  } as never)
}

/** Where the shape stands in the sky, as the witness's own frame says: how far off the axis, and
 * which way round. Both are read through whatever instrument and field the sighting states NOW. */
function skyPositionOf(sighting: Sighting): { offsetDeg: number; bearingDeg: number; widthDeg: number } {
  const bounds = sighting.timeline.allKeyframes[0].shapes[0].shape.bounds
  const halfWidth = Instruments.frameWidthPx(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX) / 2
  const dx = bounds.x + bounds.width / 2 - halfWidth
  const dy = bounds.y + bounds.height / 2 - ApparentSize.CANVAS_HEIGHT_PX / 2
  const projection = ImageProjection.of(
    sighting.instrument,
    ApparentSize.CANVAS_HEIGHT_PX,
    SightingShapes.fovOf(sighting, 0)
  )
  return {
    offsetDeg: projection.radiusPxToAngleDeg(Math.hypot(dx, dy)),
    bearingDeg: (Math.atan2(-dy, dx) * 180) / Math.PI,
    widthDeg: projection.pxToDeg(bounds.width)
  }
}

/** Changes the instrument the way the recorder does: capture the field the shapes were drawn
 * under, move to the new instrument's own field, then reproject. */
function switchInstrument(sighting: Sighting, id: string): void {
  const previous = sighting.instrument
  const fieldBefore = new Map(
    sighting.timeline.allKeyframes.map(keyframe => [keyframe.t, SightingShapes.fovOf(sighting, keyframe.t)])
  )
  sighting.instrumentId = id
  SightingShapes.reproject(sighting, previous, fieldBefore)
}

describe("A change of instrument, which reprojects a testimony without editing it", () => {
  it("leaves the object exactly where the witness put it in the sky", () => {
    const sighting = sightingWithShapeOffCentre()
    const before = skyPositionOf(sighting)
    expect(before.offsetDeg).toBeGreaterThan(15)

    for (const id of ["slr-35mm-50", "instamatic-126", "phone-portrait", "eye"]) {
      switchInstrument(sighting, id)
      const after = skyPositionOf(sighting)
      // The two numbers a witness actually gave: how far off their line of sight the thing stood,
      // and how big it looked. Neither is the picker's to change.
      expect(after.offsetDeg).toBeCloseTo(before.offsetDeg, 3)
      expect(after.bearingDeg).toBeCloseTo(before.bearingDeg, 3)
      expect(after.widthDeg).toBeCloseTo(before.widthDeg, 3)
    }
  })

  it("does change the pixels, and by the two things that make a format", () => {
    const sighting = sightingWithShapeOffCentre()
    const eyePixels = sighting.timeline.allKeyframes[0].shapes[0].shape.bounds.width
    switchInstrument(sighting, "slr-35mm-50")
    // A field less than half as wide over the same height: the same object fills more than twice
    // the pixels. If this were unchanged the reprojection would not be doing anything.
    expect(sighting.timeline.allKeyframes[0].shapes[0].shape.bounds.width).toBeGreaterThan(eyePixels * 2)
    // And the frame itself is a different shape.
    expect(Instruments.frameWidthPx(sighting.instrument, 360)).toBe(540)
    switchInstrument(sighting, "instamatic-126")
    expect(Instruments.frameWidthPx(sighting.instrument, 360)).toBe(360)
  })

  it("reads the old pixels under the OLD field, which is the whole trap", () => {
    // Reprojecting with the new instrument's field on both sides moves an off-centre shape: a thing
    // 19 degrees off-axis came back at 9. The frames differ in width too, so a shape also has to be
    // taken out of the old centre and put back around the new one.
    const sighting = sightingWithShapeOffCentre()
    const before = skyPositionOf(sighting)
    const previous = sighting.instrument
    sighting.instrumentId = "slr-35mm-50"
    // Deliberately WITHOUT the field-before map, the way the bug did it.
    SightingShapes.reproject(sighting, previous)
    expect(skyPositionOf(sighting).offsetDeg).not.toBeCloseTo(before.offsetDeg, 1)
  })
})
