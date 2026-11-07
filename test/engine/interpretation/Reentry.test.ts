import { describe, expect, test } from "vitest"
import { ReentrySighting } from "../../../src/modules/sky-events/reentries/Reentry.js"
import type { ReentryJson } from "../../../src/modules/sky-events/reentries/Reentry.js"

/** Due east along the equator, 1 degree (111 km) every 15 s, at a constant 80 km. Its pieces shed nothing unless they say (the geometry
 * is what most of these tests are about; see the tests of the shedding for what a piece does when it says nothing). */
const reentry = (fragments: ReentryJson["fragments"]): ReentryJson => ({
  id: "test",
  track: [
    { t: 0, lat: 0, lng: 0, altitudeKm: 80 },
    { t: 15000, lat: 0, lng: 1, altitudeKm: 80 },
    { t: 30000, lat: 0, lng: 2, altitudeKm: 80 }
  ],
  fragments: fragments.map(fragment => ({ sheds: [], ...fragment }))
})

describe("ReentrySighting", () => {
  test("a point straight overhead is at the zenith, at its height", () => {
    const seen = ReentrySighting.seenFrom({ lat: 45, lng: 5, heightM: 0 }, { lat: 45, lng: 5, heightM: 80000 })
    expect(seen.altitudeDeg).toBeCloseTo(90, 6)
    expect(seen.distanceKm).toBeCloseTo(80, 6)
  })

  test("the Earth's curvature lowers a distant piece, and sinks one past the horizon", () => {
    // 80 km up and 300 km north: flat reckoning says atan(80/300) = 14.9 degrees; the sphere says
    // about 1.3 degrees less.
    const north = 300 / 111.2
    const near = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: north, lng: 0, heightM: 80000 })
    expect(near.azimuthDeg).toBeCloseTo(0, 3)
    expect(near.altitudeDeg).toBeGreaterThan(13)
    expect(near.altitudeDeg).toBeLessThan(14)
    // The horizon distance of a point 80 km up is about 1010 km: at 1200 km it is under it.
    const far = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: 1200 / 111.2, lng: 0, heightM: 80000 })
    expect(far.altitudeDeg).toBeLessThan(0)
  })

  test("a piece sheds smaller ones that break off where it is, then drop back, sink and go out, the same at every replay", () => {
    const shedding = reentry([{ id: "a", absoluteMagnitude: -3, sheds: [{ perS: 2, lifeS: 4, magnitudeDrop: 3, dropBack: 0.3, spreadKmS: 1, sinkKmS: 0.6 }] }])
    const pieces = ReentrySighting.piecesOf(shedding)
    // Thirty seconds at two a second, and the piece itself.
    expect(pieces).toHaveLength(61)
    expect(ReentrySighting.piecesOf(shedding)).toBe(pieces)
    const parent = pieces[0]
    const shed = pieces[10]
    // Where its parent is when it breaks off, and fainter.
    const atBreak = ReentrySighting.pieceAt(shedding, shed, shed.fromT)!
    const parentAtBreak = ReentrySighting.pieceAt(shedding, parent, shed.fromT)!
    expect(atBreak.lat).toBeCloseTo(parentAtBreak.lat, 6)
    expect(atBreak.lng).toBeCloseTo(parentAtBreak.lng, 6)
    expect(atBreak.heightM).toBeCloseTo(parentAtBreak.heightM, 3)
    expect(shed.magnitudeAt(shed.fromT)).toBeGreaterThanOrEqual(parent.magnitudeAt(shed.fromT) + 1.5)
    // Later: behind it along the path (west of it, as the track runs east), and lower.
    const later = shed.fromT + 2000
    const shedLater = ReentrySighting.pieceAt(shedding, shed, later)!
    const parentLater = ReentrySighting.pieceAt(shedding, parent, later)!
    expect(shedLater.lng).toBeLessThan(parentLater.lng)
    expect(shedLater.heightM).toBeLessThan(parentLater.heightM)
    // Gone after its life, and the same pieces again from the same statement.
    expect(shed.untilT - shed.fromT).toBeLessThanOrEqual(4 * 1.6 * 1000)
    const again = ReentrySighting.piecesOf(reentry([{ id: "a", absoluteMagnitude: -3, sheds: [{ perS: 2, lifeS: 4, magnitudeDrop: 3, dropBack: 0.3, spreadKmS: 1, sinkKmS: 0.6 }] }]))
    expect(again[10].fromT).toBe(shed.fromT)
    expect(again[10].lagMsAt(later)).toBe(shed.lagMsAt(later))
  })

  test("a shed piece slows down to nothing and never flies back along the path", () => {
    // Its lag grows at first as the square of the time, then never faster than the time itself.
    expect(ReentrySighting.lagOfBraking(1, 0.1)).toBeCloseTo(0.1 ** 2 / 2, 3)
    let previous = 0
    for (let s = 0.5; s <= 20; s += 0.5) {
      const lag = ReentrySighting.lagOfBraking(1, s)
      expect(lag - previous).toBeLessThanOrEqual(0.5 + 1e-9)
      previous = lag
    }
    // On the path: always ahead of where it was half a second before, in the direction of travel (east here).
    const shedding = reentry([{ id: "a", absoluteMagnitude: -3, sheds: [{ perS: 1, lifeS: 10, magnitudeDrop: 3, dropBack: 0.5 }] }])
    const shed = ReentrySighting.piecesOf(shedding)[3]
    for (let t = shed.fromT + 500; t < shed.untilT; t += 500) {
      expect(ReentrySighting.pieceAt(shedding, shed, t)!.lng).toBeGreaterThanOrEqual(ReentrySighting.pieceAt(shedding, shed, t - 500)!.lng - 1e-9)
    }
  })

  test("a piece that says nothing of its break-up crumbles, and bursts at each flare of its light curve", () => {
    const quiet = { ...reentry([]), fragments: [{ id: "a", absoluteMagnitude: -3 }] }
    expect(ReentrySighting.shedsOf(quiet.fragments[0])).toEqual([ReentrySighting.DEFAULT_CRUMBLING])
    expect(ReentrySighting.piecesOf(quiet).length).toBeGreaterThan(30)
    const flaring = { absoluteMagnitude: -3, lightCurve: [{ t: 0, absoluteMagnitude: -3 }, { t: 10000, absoluteMagnitude: -6 }, { t: 20000, absoluteMagnitude: -3 }] }
    const bursts = ReentrySighting.shedsOf(flaring).slice(1)
    expect(bursts).toHaveLength(1)
    expect(bursts[0].fromT).toBeLessThan(10000)
    expect(bursts[0].untilT).toBeGreaterThan(10000)
    // Saying none is saying none.
    expect(ReentrySighting.shedsOf({ ...flaring, sheds: [] })).toEqual([])
  })

  test("a bright flare low enough is heard as a detonation, after the time sound takes to cover the distance", () => {
    const low: ReentryJson = {
      id: "fireball",
      track: [{ t: 0, lat: 0, lng: 0, altitudeKm: 40 }, { t: 20000, lat: 0, lng: 0.5, altitudeKm: 20 }],
      fragments: [{ absoluteMagnitude: -10, sheds: [], untilT: 15000,
        lightCurve: [{ t: 0, absoluteMagnitude: -10 }, { t: 10000, absoluteMagnitude: -25 }, { t: 15000, absoluteMagnitude: -8 }] }]
    }
    const observer = { lat: 0, lng: 0.25, heightM: 0 }
    const [bang] = ReentrySighting.detonationsOf([low], observer)
    expect(bang.flashT).toBe(10000)
    // 30 km up at its flare, nearly overhead: some 30 km at 0.31 km/s, a minute and a half.
    expect(bang.t - bang.flashT).toBeCloseTo((bang.distanceKm / ReentrySighting.SOUND_KM_S) * 1000, 3)
    expect(bang.distanceKm).toBeLessThan(31)
    // The same flare 70 km up is not heard.
    const high = { ...low, track: low.track.map(keyframe => ({ ...keyframe, altitudeKm: 70 })) }
    expect(ReentrySighting.detonationsOf([high], observer)).toEqual([])
  })

  test("only a re-entry bright enough to bleach an eye is followed for its afterimage", () => {
    expect(ReentrySighting.mayDazzle(reentry([{ absoluteMagnitude: -3 }]))).toBe(false)
    expect(ReentrySighting.mayDazzle(reentry([{ absoluteMagnitude: -3, lightCurve: [{ t: 0, absoluteMagnitude: -3 }, { t: 10000, absoluteMagnitude: -20 }] }]))).toBe(true)
  })

  test("east is azimuth 90", () => {
    const seen = ReentrySighting.seenFrom({ lat: 0, lng: 0, heightM: 0 }, { lat: 0, lng: 1, heightM: 80000 })
    expect(seen.azimuthDeg).toBeCloseTo(90, 3)
  })

  test("the leading point moves along its track and is absent outside it", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    expect(ReentrySighting.leadAt(r, 7500)?.lng).toBeCloseTo(0.5, 6)
    expect(ReentrySighting.leadAt(r, 22500)?.lng).toBeCloseTo(1.5, 6)
    expect(ReentrySighting.leadAt(r, -1)).toBeUndefined()
    expect(ReentrySighting.leadAt(r, 30001)).toBeUndefined()
  })

  test("a piece lags behind on the same path, and is seen only between its appearing and going out", () => {
    const r = reentry([{ id: "lead", absoluteMagnitude: -2 }, { id: "late", lagS: 3, fromT: 10000, untilT: 20000, absoluteMagnitude: 0 }])
    const observer = { lat: 0, lng: 1, heightM: 0 }
    expect(ReentrySighting.viewsAt([r], 5000, observer).map(v => v.fragmentId)).toEqual(["lead"])
    const both = ReentrySighting.viewsAt([r], 15000, observer)
    expect(both.map(v => v.fragmentId)).toEqual(["lead", "late"])
    // The lead is overhead at 15 s; the late piece, 3 s behind, is west of it.
    expect(both[0].head.altitudeDeg).toBeCloseTo(90, 3)
    expect(both[1].head.azimuthDeg).toBeCloseTo(270, 1)
    expect(ReentrySighting.viewsAt([r], 21000, observer).map(v => v.fragmentId)).toEqual(["lead"])
  })

  test("its magnitude is its absolute one moved to its real distance", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    // Overhead at 80 km: 5 log(0.8) brighter than at the standard 100 km.
    const [view] = ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 1, heightM: 0 })
    expect(view.magnitude).toBeCloseTo(-2 + 5 * Math.log10(0.8), 6)
  })

  test("it brightens as it appears rather than between two frames", () => {
    const r = reentry([{ absoluteMagnitude: -2, fromT: 10000 }])
    const observer = { lat: 0, lng: 1, heightM: 0 }
    const [early] = ReentrySighting.viewsAt([r], 10100, observer)
    const [later] = ReentrySighting.viewsAt([r], 12000, observer)
    expect(early.magnitude).toBeGreaterThan(later.magnitude + 1)
  })

  test("however bright, it goes out gradually and is invisible at its end, not cut off while dazzling", () => {
    // Chelyabinsk's pieces end at magnitude -15: faded by a share of their light they were still blinding on their last frame.
    const r = reentry([{ absoluteMagnitude: -15, untilT: 20000 }])
    const observer = { lat: 0, lng: 1, heightM: 0 }
    const at = (t: number) => ReentrySighting.viewsAt([r], t, observer)[0].magnitude
    const full = at(15000)
    const half = at(20000 - ReentrySighting.FADE_MS / 2)
    const last = at(20000 - 16)
    expect(half).toBeGreaterThan(full + 5)
    expect(half).toBeLessThan(last - 5)
    expect(last).toBeGreaterThan(ReentrySighting.FADED_MAGNITUDE - 0.5)
  })

  test("its train runs back along its own path, never before it appeared", () => {
    const r = reentry([{ absoluteMagnitude: -2, trainS: 2, fromT: 14000 }])
    const [view] = ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 1, heightM: 0 })
    // Only one second of past at 15 s: the train stops where it appeared, 1 s back (1/15 degree west).
    const last = view.train[view.train.length - 1]
    expect(last.azimuthDeg).toBeCloseTo(270, 1)
    const westKm = 111.32 / 15
    expect(last.altitudeDeg).toBeCloseTo((Math.atan2(80, westKm) * 180) / Math.PI, 0)
  })

  test("a piece under the observer's horizon is not seen", () => {
    const r = reentry([{ absoluteMagnitude: -2 }])
    expect(ReentrySighting.viewsAt([r], 15000, { lat: 0, lng: 20, heightM: 0 })).toEqual([])
  })

  test("follows a fragment's light curve where it has one, and its one magnitude where not", () => {
    // A great fireball brightens as it plunges and dies away: Chelyabinsk was a faint streak at 95 km and brighter than the Sun at 30.
    const curve = [{ t: 5000, absoluteMagnitude: -4 }, { t: 15000, absoluteMagnitude: -24 }, { t: 25000, absoluteMagnitude: -10 }]
    const piece = { absoluteMagnitude: -2, lightCurve: curve }
    expect(ReentrySighting.absoluteMagnitudeAt(piece, 0)).toBe(-4)
    expect(ReentrySighting.absoluteMagnitudeAt(piece, 10000)).toBeCloseTo(-14, 9)
    expect(ReentrySighting.absoluteMagnitudeAt(piece, 15000)).toBe(-24)
    expect(ReentrySighting.absoluteMagnitudeAt(piece, 30000)).toBe(-10)
    expect(ReentrySighting.absoluteMagnitudeAt({ absoluteMagnitude: -2 }, 10000)).toBe(-2)
    // And the view an observer gets is that much brighter at the peak than at the start, at the same distance.
    const observer = { lat: 0, lng: 1, heightM: 0 }
    const [peak] = ReentrySighting.viewsAt([reentry([piece])], 15000, observer)
    expect(peak.magnitude).toBeLessThan(-20)
  })
})
