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

  describe("what the vehicle says of the plume", () => {
    const withEngine = (engine: NonNullable<LaunchJson["vehicle"]>["engine"], plume?: LaunchJson["plume"]) => LaunchPlumeSighting.plumeOf(launch({ vehicle: { engine }, plume }))

    test("a Merlin Vacuum's thrust and impulse are its 273 kg of exhaust a second, spreading at three quarters of the exhaust velocity", () => {
      const plume = withEngine({ thrustKN: 934, specificImpulseS: 348, propellant: "rp1-lox" })
      expect(plume.exhaustKgPerS).toBeCloseTo(273.6, 0)
      expect(plume.collarExpansionKmPerS).toBeCloseTo(2.5, 1)
    })

    test("a small hydrogen engine spreads faster and leaves less exhaust than a kerosene one", () => {
      const kerosene = withEngine({ thrustKN: 934, specificImpulseS: 348, propellant: "rp1-lox" })
      const hydrogen = withEngine({ thrustKN: 110, specificImpulseS: 465, propellant: "hydrogen-lox" })
      expect(hydrogen.exhaustKgPerS).toBeLessThan(kerosene.exhaustKgPerS / 5)
      expect(hydrogen.collarExpansionKmPerS).toBeGreaterThan(kerosene.collarExpansionKmPerS)
    })

    test("a solid motor's exhaust is already particles: more of it scatters", () => {
      expect(withEngine({ propellant: "solid" }).condensedShare).toBeGreaterThan(withEngine({ propellant: "rp1-lox" }).condensedShare * 2)
    })

    test("what the plume states beats what the engine implies", () => {
      expect(withEngine({ thrustKN: 934, specificImpulseS: 348 }, { exhaustKgPerS: 50 }).exhaustKgPerS).toBe(50)
    })

    test("a stronger engine makes a brighter plume, and a different one a different collar", () => {
      const observer = { lat: 0, lng: 94, heightM: 0 }
      const brightest = (engine: NonNullable<LaunchJson["vehicle"]>["engine"]) =>
        Math.max(...LaunchPlumeSighting.viewsAt([launch({ vehicle: { engine } })], 110000, observer, SUN).map(view => view.luminanceCdM2))
      expect(brightest({ thrustKN: 3000, specificImpulseS: 348, propellant: "rp1-lox" })).toBeGreaterThan(brightest({ thrustKN: 300, specificImpulseS: 348, propellant: "rp1-lox" }))
    })
  })

  test("coarse ice scatters white, ice finer than the wavelength blue", () => {
    const [red, , blue] = LaunchPlumeSighting.scatteringColour(0.5)
    expect(blue / red).toBeLessThan(1.15)
    const [fineRed, , fineBlue] = LaunchPlumeSighting.scatteringColour(0.1)
    // Rayleigh's law: the fourth power of 0.61 over 0.465.
    expect(fineBlue / fineRed).toBeCloseTo((0.61 / 0.465) ** 4, 1)
    // Large particles take twice their area out of the light, whatever its colour.
    expect(LaunchPlumeSighting.extinctionEfficiency(50, 0.55)).toBeCloseTo(2, 1)
  })

  describe("a stage that lets things go, seen from any side", () => {
    /** A spent stage 1 000 km up, coasting east along the equator over longitude 0 at its orbital speed, sunlit. */
    const coasting = (jets: LaunchJson["jets"]): LaunchJson => ({
      id: "stage",
      track: [{ t: 0, lat: 0, lng: 0, altitudeKm: 1000 }, { t: 120000, lat: 0, lng: 6.35, altitudeKm: 1000 }],
      jets
    })
    const vent: NonNullable<LaunchJson["jets"]>[number] = { kind: "vent", fromT: 0, untilT: 60000, angleDeg: 90, spinPeriodS: 20, speedKmPerS: 1, lifetimeS: 600 }
    const ecef = (p: { lat: number; lng: number; heightM: number }) => {
      const r = 6371 + p.heightM / 1000
      const lat = p.lat * Math.PI / 180
      const lng = p.lng * Math.PI / 180
      return [r * Math.cos(lat) * Math.cos(lng), r * Math.cos(lat) * Math.sin(lng), r * Math.sin(lat)]
    }
    const stageAt = (t: number) => ecef({ lat: 0, lng: 6.35 * t / 120000, heightM: 1000000 })

    test("says, of each puff an observer sees, which of what the stage let go it is and how high it is", () => {
      const views = LaunchPlumeSighting.viewsAt([coasting([vent])], 60000, { lat: 0, lng: 22, heightM: 0 }, SUN)
      expect(views.length).toBeGreaterThan(0)
      for (const view of views) {
        expect(view.release).toBe("jet:0")
        expect(view.heightKm).toBeGreaterThan(900)
        expect(view.heightKm).toBeLessThan(1100)
      }
    })

    test("with jets of its own and no ascent burn stated, a stage lets go only its jets", () => {
      const puffs = LaunchPlumeSighting.puffsAt([coasting([vent])], 60000)
      expect(puffs.length).toBeGreaterThan(0)
      for (const puff of puffs) expect(puff.release).toMatch(/^jet:/)
    })

    test("propellant vented sideways from a spinning stage draws a spiral round it, across its motion", () => {
      const t = 60000
      const stage = stageAt(t)
      const offsets = LaunchPlumeSighting.puffsAt([coasting([vent])], t).map(puff => ({ ageS: puff.ageS, offset: ecef(puff.at).map((c, i) => c - stage[i]) }))
      for (const { ageS, offset } of offsets.filter(o => o.ageS >= 10)) {
        const distance = Math.hypot(...offset)
        // As far out as it was thrown, give or take what the Earth's pull does to two neighbouring orbits.
        expect(distance / ageS).toBeGreaterThan(0.85)
        expect(distance / ageS).toBeLessThan(1.15)
        // And across the motion, east being the motion here.
        expect(Math.abs(offset[1]) / distance).toBeLessThan(0.15)
      }
      // Half a turn of the stage apart, two puffs went opposite ways: an arm winding round.
      const direction = (age: number) => {
        const o = offsets.reduce((best, x) => Math.abs(x.ageS - age) < Math.abs(best.ageS - age) ? x : best).offset
        const length = Math.hypot(...o)
        return o.map(c => c / length)
      }
      const a = direction(40)
      const b = direction(30)
      expect(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]).toBeLessThan(-0.9)
    })

    test("the same spiral is a disc to an observer it comes towards and a line to one it passes", () => {
      const spread = (observer: { lat: number; lng: number; heightM: number }) => {
        const views = LaunchPlumeSighting.viewsAt([coasting([vent])], 60000, observer, SUN)
        expect(views.length).toBeGreaterThan(20)
        // How far it reaches across the sky and up it, degrees: the narrower over the wider.
        const middle = views.reduce((sum, v) => sum + v.centre.azimuthDeg, 0) / views.length
        const across = views.map(v => (v.centre.azimuthDeg - middle) * Math.cos(v.centre.altitudeDeg * Math.PI / 180))
        const up = views.map(v => v.centre.altitudeDeg)
        const extents = [Math.max(...across) - Math.min(...across), Math.max(...up) - Math.min(...up)]
        return Math.min(...extents) / Math.max(...extents)
      }
      // Ahead of the stage, which comes from the west towards them: the spiral face on.
      expect(spread({ lat: 0, lng: 22, heightM: 0 })).toBeGreaterThan(0.6)
      // North of its track as it passes: the spiral edge on.
      expect(spread({ lat: 14, lng: 3.2, heightM: 0 })).toBeLessThan(0.3)
    })

    test("a braking burn throws its exhaust ahead of the stage", () => {
      const brake: NonNullable<LaunchJson["jets"]>[number] = { id: "brake", kind: "burn", fromT: 0, untilT: 5000, angleDeg: 180 }
      const t = 20000
      const stage = stageAt(t)
      const trail = LaunchPlumeSighting.puffsAt([coasting([brake])], t).filter(puff => puff.ageS > 15)
      expect(trail.length).toBeGreaterThan(0)
      // East of the stage, by about what the exhaust velocity carried it in that time.
      for (const puff of trail) expect((ecef(puff.at)[1] - stage[1]) / puff.ageS).toBeGreaterThan(2.5)
    })
  })
})

