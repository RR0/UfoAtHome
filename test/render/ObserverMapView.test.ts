import { describe, expect, it } from "vitest"
import { ObserverMapView } from "../../src/render/ObserverMapView.js"
import { fractionWithinBounds } from "../../src/render3d/terrain/TileMath.js"

const FITTED = { north: 49.1, south: 49.09, west: 2.3, east: 2.315 }

describe("ObserverMapView", () => {
  it("shows the fitted box until a reader changes it", () => {
    const view = new ObserverMapView()
    expect(view.changed).toBe(false)
    expect(view.boundsWithin(FITTED)).toBe(FITTED)
  })

  it("keeps the ground under the pointer where it is while zooming", () => {
    const view = new ObserverMapView()
    const before = ObserverMapView.pointAt(view.boundsWithin(FITTED), 0.8, 0.3)
    view.zoomAt(0.8, 0.3, 4)
    const bounds = view.boundsWithin(FITTED)
    const after = fractionWithinBounds(bounds, before.lng, before.lat)
    expect(after.x).toBeCloseTo(0.8, 9)
    expect(after.y).toBeCloseTo(0.3, 9)
    expect(bounds.east - bounds.west).toBeCloseTo((FITTED.east - FITTED.west) / 4, 12)
  })

  it("brings in what was to the west when dragged right", () => {
    const view = new ObserverMapView()
    view.zoomAt(0.5, 0.5, 2)
    const centred = view.boundsWithin(FITTED)
    view.panBy(0.25, 0)
    const panned = view.boundsWithin(FITTED)
    expect(panned.west).toBeLessThan(centred.west)
    expect(panned.west - centred.west).toBeCloseTo(-(centred.east - centred.west) / 4, 12)
  })

  it("stops zooming at its limits and goes back to the fitted box on reset", () => {
    const view = new ObserverMapView()
    view.zoomAt(0.5, 0.5, 1000)
    expect(view.zoomFactor).toBe(ObserverMapView.MAX_ZOOM)
    view.zoomAt(0.5, 0.5, 1e-6)
    expect(view.zoomFactor).toBe(ObserverMapView.MIN_ZOOM)
    view.reset()
    expect(view.changed).toBe(false)
  })

  it("keeps a zoomed view on the same ground when the fitted box is refitted", () => {
    const view = new ObserverMapView()
    view.zoomAt(0.3, 0.6, 3)
    const before = view.boundsWithin(FITTED)
    const refitted = { north: 49.104, south: 49.088, west: 2.297, east: 2.321 }
    view.refit(FITTED, refitted)
    const after = view.boundsWithin(refitted)
    // To a tenth of a metre, not exactly: one zoom factor for both axes, and the two boxes are not
    // quite the same shape in Mercator, so the north-south edges move by millimetres.
    for (const edge of ["north", "south", "west", "east"] as const) expect(after[edge]).toBeCloseTo(before[edge], 6)
  })

  it("turns a point of the map back into the coordinate drawn there", () => {
    const point = ObserverMapView.pointAt(FITTED, 0.2, 0.7)
    const fraction = fractionWithinBounds(FITTED, point.lng, point.lat)
    expect(fraction.x).toBeCloseTo(0.2, 9)
    expect(fraction.y).toBeCloseTo(0.7, 9)
  })
})
