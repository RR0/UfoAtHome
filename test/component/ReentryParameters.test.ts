import { describe, expect, it } from "vitest"
import { ReentryParameters } from "../../src/modules/sky-events/reentries/ReentryParameters.js"
import type { ReentryJson } from "../../src/modules/sky-events/reentries/Reentry.js"

const kmBetween = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const rad = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

describe("a re-entry where the witness saw it", () => {
  const observer = { lat: 45, lng: 5 }

  it("overhead is above the witness, and on the horizon over a thousand kilometres off at 100 km", () => {
    expect(kmBetween(ReentryParameters.placeSeen(observer, 0, 90, 100), observer)).toBeLessThan(0.01)
    // √(2 R h): some 1 130 km.
    const horizon = ReentryParameters.placeSeen(observer, 90, 0, 100)
    expect(kmBetween(horizon, observer)).toBeGreaterThan(1080)
    expect(kmBetween(horizon, observer)).toBeLessThan(1140)
    expect(horizon.lng).toBeGreaterThan(observer.lng)
    // 45° up at 100 km: about 100 km off, a little less for the Earth's curvature.
    const north = ReentryParameters.placeSeen(observer, 0, 45, 100)
    expect(kmBetween(north, observer)).toBeGreaterThan(90)
    expect(kmBetween(north, observer)).toBeLessThan(100)
    expect(north.lat).toBeGreaterThan(observer.lat)
  })

  it("gives its path once all of it is said, over the time it was seen, at the heights of its path", () => {
    const meteor: ReentryJson = {
      id: "m", type: "meteor",
      track: [{ t: 2000, lat: 0, lng: 0, altitudeKm: 100 }, { t: 3000, lat: 0, lng: 0, altitudeKm: 85 }],
      fragments: [{ absoluteMagnitude: 0 }],
      seen: { fromAzimuthDeg: 120, fromAltitudeDeg: 40, toAzimuthDeg: 150, toAltitudeDeg: 25 }
    }
    expect(ReentryParameters.trackFromSeen(meteor, observer)).toBeUndefined()
    const track = ReentryParameters.trackFromSeen({ ...meteor, seen: { ...meteor.seen, durationS: 1.5 } }, observer)!
    expect(track.map(place => [place.t, place.altitudeKm])).toEqual([[2000, 100], [3500, 85]])
    expect(track[0].lat).toBeLessThan(observer.lat)
    expect(track[0].lng).toBeGreaterThan(observer.lng)
  })
})
