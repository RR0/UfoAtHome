import { describe, expect, it } from "vitest"
import {
  skyColorsForAltitude,
  skyColorForPosition,
  visibleMagnitudeLimit,
  magnitudeToBrightness,
  horizontalToCartesian,
  cartesianToHorizontal,
  starBrightnessTierIndex,
  starColorScale,
  twinkleIntensity,
  glareStrength,
  glareRadius,
  glareOpacity,
  atmosphericTint,
  STAR_BRIGHTNESS_TIERS
} from "../../src/render3d/skyColors.js"
import type { RgbColor } from "../../src/render3d/skyColors.js"

describe("skyColorsForAltitude", () => {
  it("is near-black at deep night", () => {
    const { zenith, horizon } = skyColorsForAltitude(-45)
    expect(zenith.every(c => c < 0.05)).toBe(true)
    expect(horizon.every(c => c < 0.1)).toBe(true)
  })

  it("is bright blue at midday", () => {
    const { zenith } = skyColorsForAltitude(60)
    expect(zenith[2]).toBeGreaterThan(zenith[0])
    expect(zenith[2]).toBeGreaterThan(0.5)
  })

  it("warms the horizon near sunrise/sunset (altitude 0)", () => {
    const { horizon } = skyColorsForAltitude(0)
    expect(horizon[0]).toBeGreaterThan(horizon[2])
  })

  it("still reads as visibly warmer/dimmer shortly after sunrise (~9deg) than at midday", () => {
    // Regression test: an earlier version of this table jumped straight from a dramatic 0deg
    // sunrise/sunset horizon to an almost-neutral "10deg" stop, so real cases whose sun sat a
    // little above the horizon (this project's own Valensole/Socorro demo data, ~9-11deg) ended
    // up rendering indistinguishably from full midday — no visible dawn/dusk character at all.
    const shortlyAfterSunrise = skyColorsForAltitude(9)
    const midday = skyColorsForAltitude(60)
    expect(shortlyAfterSunrise.horizon[0] - shortlyAfterSunrise.horizon[2]).toBeGreaterThan(
      midday.horizon[0] - midday.horizon[2] + 0.1
    )
    expect(shortlyAfterSunrise.zenith[2]).toBeLessThan(midday.zenith[2] - 0.15)
  })

  it("clamps beyond the defined range instead of extrapolating", () => {
    expect(skyColorsForAltitude(-200)).toEqual(skyColorsForAltitude(-90))
    expect(skyColorsForAltitude(200)).toEqual(skyColorsForAltitude(90))
  })

  it("interpolates smoothly between adjacent stops", () => {
    const a = skyColorsForAltitude(-18)
    const mid = skyColorsForAltitude(-12)
    const b = skyColorsForAltitude(-6)
    expect(mid.zenith[2]).toBeGreaterThan(a.zenith[2])
    expect(mid.zenith[2]).toBeLessThan(b.zenith[2])
  })
})

describe("visibleMagnitudeLimit", () => {
  it("shows nothing but the brightest objects in daylight", () => {
    expect(visibleMagnitudeLimit(10)).toBeLessThan(0)
  })

  it("reaches the unaided eye's own limit once fully dark — not the catalog's, which is binocular territory", () => {
    expect(visibleMagnitudeLimit(-18)).toBe(6.5)
    expect(visibleMagnitudeLimit(-30)).toBe(6.5)
  })

  it("relaxes continuously between daylight and full night", () => {
    const twilight = visibleMagnitudeLimit(-9)
    expect(twilight).toBeGreaterThan(visibleMagnitudeLimit(0))
    expect(twilight).toBeLessThan(visibleMagnitudeLimit(-18))
  })
})

describe("magnitudeToBrightness", () => {
  it("stays within [0,1]", () => {
    for (const mag of [-1.5, 0, 2, 4.5, 7.5, 9]) {
      const brightness = magnitudeToBrightness(mag)
      expect(brightness).toBeGreaterThanOrEqual(0)
      expect(brightness).toBeLessThanOrEqual(1)
    }
  })

  it("is monotonically decreasing (brighter/lower magnitude -> higher brightness)", () => {
    expect(magnitudeToBrightness(0)).toBeGreaterThan(magnitudeToBrightness(4))
    expect(magnitudeToBrightness(4)).toBeGreaterThan(magnitudeToBrightness(7))
  })

  it("clamps beyond its own reference range", () => {
    expect(magnitudeToBrightness(-5)).toBe(1)
    expect(magnitudeToBrightness(20)).toBe(0)
  })

  it("spreads the naked-eye range across the scale instead of crowding it at the bottom", () => {
    // The whole point: interpolating flux put every star from magnitude 2 to the visibility limit
    // between 0.04 and 0.0004, an interval no display can show — they all came out the same grey.
    const spread = magnitudeToBrightness(2) - magnitudeToBrightness(6)
    expect(spread).toBeGreaterThan(0.3)
    // and the steps between whole magnitudes stay perceptible all the way down
    for (const mag of [1, 2, 3, 4, 5]) {
      expect(magnitudeToBrightness(mag) - magnitudeToBrightness(mag + 1)).toBeGreaterThan(0.05)
    }
  })

  it("renders the faintest visible stars genuinely faint", () => {
    expect(starColorScale(magnitudeToBrightness(6))).toBeLessThan(0.2)
    expect(starColorScale(magnitudeToBrightness(-1.46))).toBeGreaterThan(0.9)
  })

  it("gives the brightest stars a bigger point size, and the ordinary ones the smallest", () => {
    expect(STAR_BRIGHTNESS_TIERS[starBrightnessTierIndex(magnitudeToBrightness(-1.46))].size).toBe(3.2)
    expect(STAR_BRIGHTNESS_TIERS[starBrightnessTierIndex(magnitudeToBrightness(1.5))].size).toBe(2)
    expect(STAR_BRIGHTNESS_TIERS[starBrightnessTierIndex(magnitudeToBrightness(4))].size).toBe(1.2)
  })
})

describe("horizontalToCartesian / cartesianToHorizontal", () => {
  it("round-trips altitude/azimuth through Cartesian and back", () => {
    for (const [altitudeDeg, azimuthDeg] of [
      [0, 0],
      [45, 90],
      [-30, 180],
      [89, 270],
      [-89, 359]
    ]) {
      const { x, y, z } = horizontalToCartesian(altitudeDeg, azimuthDeg, 100)
      const back = cartesianToHorizontal(x, y, z)
      expect(back.altitudeDeg).toBeCloseTo(altitudeDeg, 5)
      expect(back.azimuthDeg).toBeCloseTo(azimuthDeg, 5)
    }
  })

  it("places due north (azimuth 0) on the -Z axis and straight up (altitude 90) on +Y", () => {
    const north = horizontalToCartesian(0, 0, 100)
    expect(north.x).toBeCloseTo(0)
    expect(north.z).toBeCloseTo(-100)

    const zenith = horizontalToCartesian(90, 0, 100)
    expect(zenith.y).toBeCloseTo(100)
  })

  it("places due east (azimuth 90) on the +X axis", () => {
    const east = horizontalToCartesian(0, 90, 100)
    expect(east.x).toBeCloseTo(100)
    expect(east.z).toBeCloseTo(0)
  })
})

describe("skyColorForPosition", () => {
  it("is azimuth-independent when the sun is deep below the horizon (no glow anywhere)", () => {
    const colorEast = skyColorForPosition(20, 90, 200, -40)
    const colorWest = skyColorForPosition(20, 270, 200, -40)
    expect(colorEast).toEqual(colorWest)
  })

  it("warms the sky near the sun's own azimuth at dawn/dusk more than the opposite side", () => {
    const nearSun = skyColorForPosition(5, 90, 90, 0) // sun on the horizon, due east
    const awayFromSun = skyColorForPosition(5, 270, 90, 0) // opposite compass direction
    expect(nearSun[0]).toBeGreaterThan(awayFromSun[0])
  })

  it("is driven by the sun's altitude, not the vertex's own altitude — the same zenith point is much darker at deep night than at midday", () => {
    // Regression test: an earlier version of this function accidentally passed the vertex's own
    // altitude into skyColorsForAltitude() instead of the sun's, which made every point near the
    // zenith render as if it were always daytime regardless of the real sun position.
    const zenithVertexAltitude = 89
    const atNight = skyColorForPosition(zenithVertexAltitude, 0, 0, -30)
    const atMidday = skyColorForPosition(zenithVertexAltitude, 0, 0, 60)
    const brightnessOf = (color: RgbColor) => color[0] + color[1] + color[2]
    expect(brightnessOf(atNight)).toBeLessThan(brightnessOf(atMidday) / 4)
  })
})

describe("starColorScale", () => {
  it("floors just above black at brightness 0, and reaches 1 at brightness 1", () => {
    // A low floor on purpose: the old 0.3 lifted the faintest star to nearly a third of full
    // white, which is most of why a night sky read as a field of identical dots.
    expect(starColorScale(0)).toBeCloseTo(0.12)
    expect(starColorScale(1)).toBeCloseTo(1)
  })
})

describe("starBrightnessTierIndex", () => {
  it("buckets a dim, medium, and bright star into distinct, ordered tiers", () => {
    const dim = starBrightnessTierIndex(0.1)
    const medium = starBrightnessTierIndex(0.7)
    const bright = starBrightnessTierIndex(0.99)
    expect(dim).toBeLessThan(medium)
    expect(medium).toBeLessThan(bright)
    expect(bright).toBe(STAR_BRIGHTNESS_TIERS.length - 1)
  })
})

describe("twinkleIntensity", () => {
  it("always stays within [0,1]", () => {
    for (let t = 0; t < 10; t += 0.37) {
      expect(twinkleIntensity(1, { phase: 0, speedFactor: 1 }, t)).toBeGreaterThanOrEqual(0)
      expect(twinkleIntensity(1, { phase: 0, speedFactor: 1 }, t)).toBeLessThanOrEqual(1)
    }
  })

  it("dips further below its resting value for a bright star than a dim one", () => {
    // A phase where sin(...) is negative: the *rising* half of the cycle always clamps to
    // exactly 1 regardless of brightness (the resting value is already the ceiling — twinkle
    // can only ever dim, never brighten further), so the dimming half is where the two
    // brightnesses' amplitudes actually differ observably.
    const phase = { phase: -Math.PI / 6, speedFactor: 1 }
    const brightDip = 1 - twinkleIntensity(1, phase, 0)
    const dimDip = 1 - twinkleIntensity(0, phase, 0)
    expect(brightDip).toBeGreaterThan(dimDip)
    expect(brightDip).toBeGreaterThan(0)
  })

  it("clamps to exactly 1 when the raw swing would overshoot", () => {
    const value = twinkleIntensity(1, { phase: Math.PI / 2, speedFactor: 1 }, 0)
    expect(value).toBe(1)
  })
})

describe("glareStrength", () => {
  it("is zero for ordinary planets/stars", () => {
    expect(glareStrength(0.5)).toBe(0) // Saturn-ish
    expect(glareStrength(-2.5)).toBe(0) // Jupiter at its brightest
    expect(glareStrength(7.5)).toBe(0) // faintest catalog star
  })

  it("is only barely positive for Venus at its historical brightest", () => {
    const venusMax = glareStrength(-4.9)
    expect(venusMax).toBeGreaterThan(0)
    expect(venusMax).toBeLessThan(2)
  })

  it("is far larger for the Sun than for a full Moon", () => {
    const sun = glareStrength(-26.7)
    const fullMoon = glareStrength(-12.7)
    expect(sun).toBeGreaterThan(fullMoon * 2)
  })
})

describe("glareRadius / glareOpacity", () => {
  it("are both zero at zero strength", () => {
    expect(glareRadius(0)).toBe(0)
    expect(glareOpacity(0)).toBe(0)
  })

  it("grow with strength but stay capped (sub-linear radius, saturating opacity)", () => {
    const sunStrength = glareStrength(-26.7)
    const moonStrength = glareStrength(-12.7)
    expect(glareRadius(sunStrength)).toBeGreaterThan(glareRadius(moonStrength))
    // Sun's strength is roughly 2.5x the Moon's, but sqrt-compression keeps its radius well
    // under 2.5x wider, not proportionally larger.
    expect(glareRadius(sunStrength)).toBeLessThan(glareRadius(moonStrength) * 2.5)
    // Both are bright enough to have already saturated opacity.
    expect(glareOpacity(sunStrength)).toBeCloseTo(glareOpacity(moonStrength))
  })
})

describe("atmosphericTint", () => {
  it("is neutral (no tint) at the zenith", () => {
    const [r, g, b] = atmosphericTint(90)
    expect(r).toBeCloseTo(1)
    expect(g).toBeCloseTo(1)
    expect(b).toBeCloseTo(1)
  })

  it("reddens (green/blue drop below red) near the horizon", () => {
    const [r, g, b] = atmosphericTint(0)
    expect(g).toBeLessThan(r)
    expect(b).toBeLessThan(g)
  })

  it("reads clearly warmer shortly after sunrise (~9deg) than at midday (~50deg), matching this project's own demo cases", () => {
    const dawn = atmosphericTint(9)
    const midday = atmosphericTint(50)
    expect(dawn[2]).toBeLessThan(midday[2] - 0.05)
  })

  it("never darkens the red channel (only relative green/blue loss)", () => {
    for (const altitudeDeg of [-4, 0, 9, 25, 50, 90]) {
      expect(atmosphericTint(altitudeDeg)[0]).toBe(1)
    }
  })
})
