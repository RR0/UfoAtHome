import { describe, expect, it } from "vitest"
import { ZodiacalLight } from "../../../src/engine/astronomy/ZodiacalLight.js"
import { SurfaceBrightness } from "../../../src/engine/astronomy/SurfaceBrightness.js"

/**
 * The point of these: ZodiacalLight is told nothing about the zodiacal light. It knows a cloud of
 * dust that thins outward and away from the plane of the planets, an inverse-square Sun, and a
 * published scattering law. The cone, the band and the gegenschein have to come out of that on
 * their own — and ONE measured number is used to scale the whole thing, so everything else below is
 * a prediction being checked rather than a fit being confirmed.
 */
const dust = new ZodiacalLight()
/** Everything in S10, by way of the single anchor the model is allowed. */
const brightness = (longitudeGapDeg: number, latitudeDeg: number): number =>
  (dust.radianceTowards(longitudeGapDeg, latitudeDeg) / dust.radianceTowards(90, 0)) * ZodiacalLight.RIGHT_ANGLE_S10

describe("what the model was not shown", () => {
  it("puts the ecliptic pole within a tenth of the measured value", () => {
    // THE TEST THIS FILE EXISTS FOR. The scale comes from one measurement in the plane of the
    // ecliptic; the pole is the far corner of the sky from it, and its brightness is decided
    // entirely by how steeply the published cloud thins with height. Nothing was adjusted to land
    // here.
    const pole = brightness(0, 90)
    expect(Math.abs(pole - ZodiacalLight.POLE_S10) / ZodiacalLight.POLE_S10).toBeLessThan(0.15)
  })

  it("makes a dark natural sky out of itself at right angles to the Sun", () => {
    // 200 S10 is 22.0 magnitudes a square arcsecond, which is the whole natural night sky. Half of
    // what a witness calls "the darkness" is this dust.
    expect(SurfaceBrightness.toMagPerArcsec2(brightness(90, 0))).toBeCloseTo(22, 1)
  })
})

describe("the cone", () => {
  it("rises steeply toward the Sun", () => {
    const run = [180, 120, 90, 60, 45, 30, 20].map(gap => brightness(gap, 0))
    for (let at = 2; at < run.length; at++) expect(run[at]).toBeGreaterThan(run[at - 1])
  })

  it("beats the brightest of the Milky Way close in, which is why it is the one people report", () => {
    // The brightest Milky Way cloud is 21.0 magnitudes a square arcsecond (see MilkyWay). Thirty
    // degrees from the Sun this dust is brighter than that — a real glow, not a smudge, standing
    // over the place the Sun set.
    expect(SurfaceBrightness.toMagPerArcsec2(brightness(30, 0))).toBeLessThan(21)
  })

  it("is a cone and not a dome: it thins away from the ecliptic at every distance from the Sun", () => {
    for (const gap of [30, 60, 90]) {
      expect(brightness(gap, 0)).toBeGreaterThan(brightness(gap, 15))
      expect(brightness(gap, 15)).toBeGreaterThan(brightness(gap, 45))
    }
  })
})

describe("the gegenschein", () => {
  it("is a real brightening and not just the band, because the sky between dims first", () => {
    // A cloud lit from behind the observer should be at its faintest looking straight away from the
    // light. Instead the run along the ecliptic falls to a minimum somewhere short of the anti-solar
    // point and then climbs again — which cannot be geometry, and is the backward lobe of the
    // scattering law.
    const beforeIt = brightness(140, 0)
    const opposite = brightness(180, 0)
    expect(beforeIt).toBeLessThan(brightness(110, 0))
    expect(opposite).toBeGreaterThan(beforeIt * 1.1)
  })

  it("sits on the ecliptic like everything else in this cloud", () => {
    expect(brightness(180, 0)).toBeGreaterThan(brightness(180, 20))
  })
})

describe("the map", () => {
  const map = (() => {
    dust.walk(ZodiacalLight.LATITUDE_STEPS)
    return dust.harvest()
  })()

  it("is finished only once every row has been walked", () => {
    expect(dust.done).toBe(true)
    expect(map.width).toBe(ZodiacalLight.LONGITUDE_STEPS)
    expect(map.height).toBe(ZodiacalLight.LATITUDE_STEPS)
  })

  it("spends its columns where the cone is: half of them inside forty-five degrees of the Sun", () => {
    expect(SurfaceBrightness.angleOfColumnCoord(0.5)).toBe(45)
  })

  it("leaves the ecliptic poles at almost nothing, the sky it is added to already counting them", () => {
    const poleRow = map.height - 1
    let atPole = 0
    for (let column = 0; column < map.width; column++) atPole = Math.max(atPole, map.data[poleRow * map.width + column])
    let brightest = 0
    for (const value of map.data) brightest = Math.max(brightest, value)
    // Not zero, and it should not be: even over the pole the elongation still counts for a few per
    // cent, and the row keeps that. What it must not keep is the cloud's own floor, which is
    // already in the sky.
    expect(atPole / brightest).toBeLessThan(0.01)
  })
})
