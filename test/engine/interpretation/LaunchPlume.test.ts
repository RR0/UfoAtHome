import { describe, expect, test } from "vitest"
import { LaunchPlumeSighting } from "../../../src/engine/interpretation/LaunchPlume.js"
import type { LaunchJson } from "../../../src/engine/interpretation/LaunchPlume.js"

/** The Sun along the Earth-fixed x axis: noon on the equator at longitude 0, midnight at 180. */
const SUN: [number, number, number] = [1, 0, 0]

/**
 * A stage flying due east along the equator at 120 km from longitude 92 to 97, burning all the while:
 * just past the terminator, where the Earth's shadow at that height has not yet closed over it.
 */
const launch = (overrides: Partial<LaunchJson> = {}): LaunchJson => ({
  id: "test",
  track: [
    { t: 0, lat: 0, lng: 92, altitudeKm: 120 },
    { t: 60000, lat: 0, lng: 94.5, altitudeKm: 120 },
    { t: 120000, lat: 0, lng: 97, altitudeKm: 120 }
  ],
  ...overrides
})

describe("LaunchPlumeSighting", () => {
  test("the Sun is where the almanac puts it", () => {
    // Midday UT at the June solstice: over the Tropic of Cancer, within a degree or two of Greenwich.
    const [x, y, z] = LaunchPlumeSighting.sunDirectionAt(new Date("2026-06-21T12:00:00Z"))
    expect(Math.asin(z) * 180 / Math.PI).toBeCloseTo(23.4, 0)
    expect(Math.atan2(y, x) * 180 / Math.PI).toBeGreaterThan(-3)
    expect(Math.atan2(y, x) * 180 / Math.PI).toBeLessThan(3)
  })

  test("everything on the day side is in the light, with none of it taken by the air", () => {
    const light = LaunchPlumeSighting.sunlightAt({ lat: 0, lng: 0, heightM: 10000 }, SUN)
    expect(light.lit).toBe(1)
    expect(light.transmittance).toEqual([1, 1, 1])
  })

  test("past the terminator the shadow takes what is low and leaves what is high", () => {
    // Five degrees beyond the terminator, where the shadow's edge stands about 20 km up.
    const at = (kilometres: number) => LaunchPlumeSighting.sunlightAt({ lat: 0, lng: 95, heightM: kilometres * 1000 }, SUN)
    expect(at(10).lit).toBe(0)
    expect(at(60).lit).toBe(1)
    // Just clear of it, the light has grazed the air: little of it is left.
    expect(at(60).transmittance[1]).toBeLessThan(0.5)
    // And the higher it is, the more of the light arrives.
    expect(at(150).transmittance[1]).toBeGreaterThan(at(60).transmittance[1])
    expect(at(150).transmittance[1]).toBeGreaterThan(0.99)
  })

  test("directly behind the Earth nothing is lit, at any height below the shadow's width", () => {
    expect(LaunchPlumeSighting.sunlightAt({ lat: 0, lng: 180, heightM: 400000 }, SUN).lit).toBe(0)
  })

  test("the Sun's light that the ozone layer has crossed is bluer than it left", () => {
    // A ray that skims the layer's heart (about 25 km): the orange is gone before the blue.
    const { transmittance } = LaunchPlumeSighting.sunlightAt({ lat: 0, lng: 95, heightM: 50000 }, SUN)
    expect(transmittance[2]).toBeGreaterThan(transmittance[0])
    expect(transmittance[0]).toBeGreaterThan(0)
  })

  test("light scattered forward is stronger than light thrown back", () => {
    // The plume between the observer and the Sun, then the Sun behind the observer.
    const forward = LaunchPlumeSighting.scatteringPhase({ lat: 0, lng: 90, heightM: 0 }, { lat: 0, lng: 98, heightM: 100000 }, [-1, 0, 0])
    const back = LaunchPlumeSighting.scatteringPhase({ lat: 0, lng: 90, heightM: 0 }, { lat: 0, lng: 98, heightM: 100000 }, [1, 0, 0])
    expect(forward).toBeGreaterThan(back)
  })

  test("a plume is seen from where it is in the light and above the horizon, and not before the engine burns", () => {
    const observer = { lat: 0, lng: 94, heightM: 0 }
    expect(LaunchPlumeSighting.viewsAt([launch()], 60000, observer, SUN).length).toBeGreaterThan(0)
    expect(LaunchPlumeSighting.viewsAt([launch({ burnFromT: 80000 })], 60000, observer, SUN)).toEqual([])
    // Every puff stands in the sky above the horizon.
    for (const puff of LaunchPlumeSighting.viewsAt([launch()], 90000, observer, SUN)) expect(puff.centre.altitudeDeg).toBeGreaterThanOrEqual(0)
  })

  test("the middle of a young puff is a bright head, as a sunlit cloud is, not as the Sun", () => {
    const [puff] = LaunchPlumeSighting.viewsAt([launch()], 60000, { lat: 0, lng: 94, heightM: 0 }, SUN)
    expect(puff.luminanceCdM2).toBeGreaterThan(0)
    // A white cloud in full sun is some 10 000 cd/m2, the Moon's disc 2 500; a twilight sky about 1.
    expect(puff.luminanceCdM2).toBeLessThan(10000)
  })

  test("a puff that has spread is bigger in the sky and dimmer than a young one", () => {
    const observer = { lat: 0, lng: 94, heightM: 0 }
    const views = LaunchPlumeSighting.viewsAt([launch()], 110000, observer, SUN).sort((a, b) => a.ageS - b.ageS)
    const youngest = views[0]
    const older = views.find(view => view.ageS > youngest.ageS + 40)!
    expect(older.radiusDeg / older.centre.distanceKm).toBeGreaterThan(0)
    expect(older.luminanceCdM2).toBeLessThan(youngest.luminanceCdM2)
    const km = (view: typeof youngest) => Math.tan(view.radiusDeg * Math.PI / 180) * view.centre.distanceKm
    expect(km(older)).toBeGreaterThan(km(youngest))
  })

  test("a plume in the Earth's shadow is not seen, though it flies in plain view", () => {
    const shadowed = launch({ track: launch().track.map(point => ({ ...point, lng: point.lng + 50 })) })
    expect(LaunchPlumeSighting.viewsAt([shadowed], 60000, { lat: 0, lng: 144, heightM: 0 }, SUN)).toEqual([])
  })

  test("a plume is gone after its lifetime", () => {
    const short = launch({ plume: { lifetimeS: 10 }, burnUntilT: 10000 })
    expect(LaunchPlumeSighting.viewsAt([short], 100000, { lat: 0, lng: 94, heightM: 0 }, SUN)).toEqual([])
  })

  test("the collar is wider than the trail it leaves, and gone within seconds while the trail lasts", () => {
    const observer = { lat: 0, lng: 94, heightM: 0 }
    const views = LaunchPlumeSighting.viewsAt([launch()], 110000, observer, SUN)
    const young = views.filter(v => v.ageS >= 3 && v.ageS <= 5).map(v => v.radiusDeg)
    // The same age, two populations: the collar's radius against the trail's.
    expect(Math.max(...young)).toBeGreaterThan(1.5 * Math.min(...young))
    // Nothing of the collar is left past its lifetime, and what is left is faint beside the head.
    const head = Math.max(...views.filter(v => v.ageS < 1).map(v => v.luminanceCdM2))
    const old = views.filter(v => v.ageS > 10)
    expect(old.length).toBeGreaterThan(0)
    expect(Math.max(...old.map(v => v.luminanceCdM2))).toBeLessThan(head / 10)
  })
})
