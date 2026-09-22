import { describe, expect, it } from "vitest"
import { ObserverPath } from "../../../src/engine/place/ObserverPath.js"
import { Sighting } from "../../../src/engine/model/Sighting.js"
import { geoToLocalMeters } from "../../../src/render3d/terrain/GeoProjection.js"

/** Zamora's own first and last recorded positions, from public/demo-data/observer-socorro.json —
 * about 1.1 km of Socorro road, which is the case this whole feature exists for. */
const START = { lat: 34.052376, lng: -106.89344 }
const END = { lat: 34.042635, lng: -106.89775 }

function sightingWithTrack(poses: Array<{ t: number; lat?: number; lng?: number; headingDeg?: number }>): Sighting {
  const sighting = Sighting.create()
  for (const pose of poses) {
    sighting.observerTrack.addKeyframe(pose.t, {
      lat: pose.lat,
      lng: pose.lng,
      elevationM: 0,
      headingDeg: pose.headingDeg,
      pitchDeg: 0,
      fovDeg: 60
    })
  }
  return sighting
}

describe("ObserverPath", () => {
  it("has nothing to show for a recording that states no place at all", () => {
    expect(ObserverPath.of(Sighting.create())).toBeUndefined()
  })

  it("falls back to the one place an untracked recording names", () => {
    const sighting = Sighting.create(undefined, [{ lat: START.lat, lng: START.lng }])
    const path = ObserverPath.of(sighting)!
    expect(path.points).toHaveLength(1)
    expect(path.moved).toBe(false)
  })

  it("skips keyframes with no coordinates instead of holding the previous position", () => {
    // Holding would claim the observer stood still through a stretch the file says nothing about.
    // A pose can carry a heading and a field with no lat/lng — that is an editor mid-edit, and it
    // is not a place.
    const path = ObserverPath.of(sightingWithTrack([{ t: 0, ...START }, { t: 1000, headingDeg: 200 }, { t: 2000, ...END }]))!
    expect(path.points.map(point => point.t)).toEqual([0, 2000])
  })

  it("measures how far the observer went, and calls a single spot standing still", () => {
    expect(ObserverPath.of(sightingWithTrack([{ t: 0, ...START }, { t: 1000, ...END }]))!.spanM).toBeCloseTo(1084, 0)
    expect(ObserverPath.of(sightingWithTrack([{ t: 0, ...START }, { t: 1000, ...START }]))!.moved).toBe(false)
    expect(ObserverPath.of(sightingWithTrack([{ t: 0, ...START }, { t: 1000, ...END }]))!.moved).toBe(true)
  })

  it("frames a square piece of GROUND, not a square of degrees", () => {
    // The bug this exists to prevent: a box built by adding the same number of degrees on all four
    // sides is 1/cos(lat) wider than it is tall — 21% at Socorro — so a straight road drawn on a
    // square canvas comes out leaning, and every distance read off it east-west is wrong by a fifth.
    const path = ObserverPath.of(sightingWithTrack([{ t: 0, ...START }, { t: 1000, ...END }]))!
    const bounds = path.boundsAround(400, 0.6)
    const centerLat = (bounds.south + bounds.north) / 2
    const centerLng = (bounds.west + bounds.east) / 2
    const widthM = Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)
    const heightM = Math.abs(geoToLocalMeters(bounds.north, centerLng, bounds.south, centerLng).z)
    expect(widthM / heightM).toBeCloseTo(1, 2)
    expect(widthM).toBeCloseTo(1084 * 1.6, -1)
  })

  it("never zooms closer than its own floor, however still the observer stood", () => {
    const path = ObserverPath.of(sightingWithTrack([{ t: 0, ...START }]))!
    const bounds = path.boundsAround(400, 0.6)
    const centerLat = (bounds.south + bounds.north) / 2
    expect(Math.abs(geoToLocalMeters(centerLat, bounds.east, centerLat, bounds.west).x)).toBeCloseTo(400, 0)
  })
})
