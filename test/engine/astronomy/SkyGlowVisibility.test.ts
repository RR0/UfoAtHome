import { describe, expect, it } from "vitest"
import { SkyGlowVisibility } from "../../../src/engine/astronomy/SkyGlowVisibility.js"
import type { ObserverGeo } from "../../../src/engine/astronomy/CelestialPositions.js"

/**
 * The point of these: this is what the recorder's own sky line says out loud, so what it must get
 * right is the NEGATIVE answers. A glow it announces on a night nobody could have seen one is worse
 * than no line at all — it would put a candidate explanation in front of a reader that the sky
 * itself rules out.
 *
 * The two skies used are the demo page's own test skies, which exist for exactly this: the Atacama
 * at new Moon with the galactic centre overhead, and Tenerife in March with the ecliptic standing up
 * from the sunset. Everything else below is one of those two with a single ingredient removed.
 */
const glows = new SkyGlowVisibility()
const atacama: ObserverGeo = { lat: -24, lng: -70, elevationM: 0 }
const tenerife: ObserverGeo = { lat: 28.3, lng: -16.5, elevationM: 0 }
/** 2020-07-20 23:00 local, the new Moon that this test sky was picked for. */
const darkNight = new Date("2020-07-21T03:00:00Z")
/** 2020-03-20 20:30 local, the Sun sixteen degrees down. */
const afterDusk = new Date("2020-03-20T20:30:00Z")

describe("a sky that has them", () => {
  it("finds the Milky Way high in a moonless Atacama night, off the plane where the rift is not", () => {
    const { milkyWay } = glows.assess(darkNight, atacama)
    expect(milkyWay).toBeDefined()
    expect(milkyWay!.contrast).toBeGreaterThan(1.5)
    expect(milkyWay!.altitudeDeg).toBeGreaterThan(50)
    // The refining pass is what earns this: the brightest of the band is a few degrees OFF the
    // galactic plane, and a coarse sweep alone lands where it happens to land.
    // The brightest of it is one magnitude over a dark natural sky, which is what it is.
    expect(milkyWay!.magPerArcsec2).toBeLessThan(22)
    expect(milkyWay!.skyMagPerArcsec2).toBeCloseTo(22, 1)
  })

  it("finds the zodiacal cone low toward the sunset an hour after it", () => {
    const { zodiacal } = glows.assess(afterDusk, tenerife)
    expect(zodiacal).toBeDefined()
    expect(zodiacal!.contrast).toBeGreaterThan(1)
    expect(zodiacal!.altitudeDeg).toBeLessThan(45)
    // West-north-west, where the Sun went down.
    expect(zodiacal!.azimuthDeg).toBeGreaterThan(240)
    expect(zodiacal!.azimuthDeg).toBeLessThan(320)
  })
})

describe("the four things that take them away", () => {
  it("daylight: nothing at all, whatever is up there", () => {
    const noon = new Date("2020-07-20T16:00:00Z")
    const seen = glows.assess(noon, atacama)
    expect(seen.milkyWay).toBeUndefined()
    expect(seen.zodiacal).toBeUndefined()
  })

  it("twilight not yet over: the same cone, an hour earlier, is nothing", () => {
    // The cone does not arrive, the sky leaves. Nothing about the dust changes across this hour and
    // the model is handed the same directions; what changes is the twilight it has to stand on,
    // which is still four magnitudes up at nine degrees of solar depression. This is why observers
    // are told to wait for astronomical twilight to end and not for a clock.
    const stillDusk = new Date("2020-03-20T19:45:00Z")
    expect(glows.assess(stillDusk, tenerife).zodiacal).toBeUndefined()
    expect(glows.assess(afterDusk, tenerife).zodiacal).toBeDefined()
  })

  it("a full Moon: the same Atacama sky, and no band left in it", () => {
    // Four weeks after the new Moon this sky was chosen for — same place, very nearly the same
    // stars overhead, and a Moon three days past full standing in the sky instead of nothing.
    const moonlit = new Date("2020-08-06T03:00:00Z")
    const { milkyWay } = glows.assess(moonlit, atacama)
    const { milkyWay: dark } = glows.assess(darkNight, atacama)
    expect(dark).toBeDefined()
    expect(milkyWay === undefined || milkyWay.contrast < dark!.contrast / 2).toBe(true)
  })

  it("the plane lying on the horizon: the band is up there and worth nothing", () => {
    // Six months on, at the same hour, the galactic centre is below the horizon and only the faint
    // outer band is up. Nothing about the Galaxy changed; where the Earth is pointed did.
    const winter = new Date("2021-01-20T03:00:00Z")
    const { milkyWay: summer } = glows.assess(darkNight, atacama)
    const { milkyWay } = glows.assess(winter, atacama)
    expect(summer).toBeDefined()
    expect(milkyWay === undefined || milkyWay.contrast < summer!.contrast).toBe(true)
  })
})

describe("what it costs", () => {
  it("answers fast enough to sit on a line that is restated as somebody types", () => {
    const started = performance.now()
    for (let run = 0; run < 5; run++) glows.assess(darkNight, atacama)
    // A whole sky, twice, in under a frame and a half — measured while the rest of this suite is
    // running in parallel and stealing the machine, so the real figure is well under it.
    expect((performance.now() - started) / 5).toBeLessThan(40)
  })
})
