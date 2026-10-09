import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { gunzipSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { LunarLimb, LunarRelief, type LimbProfile } from "../../src/engine/astronomy/LunarLimb.js"

const REIMS = { lat: 49.2583, lng: 4.0317, elevationM: 85 }
const TOTALITY = new Date(Date.UTC(1999, 7, 11, 10, 25, 30))
const RELIEF_FILE = resolve(process.cwd(), "src/assets/lunar-relief.bin.gz")

describe("the limb of the real Moon", () => {
  const present = existsSync(RELIEF_FILE)
  const relief = present ? new LunarRelief(new Int8Array(gunzipSync(readFileSync(RELIEF_FILE)))) : undefined
  const profileAt = (): LimbProfile => LunarLimb.profile(TOTALITY, REIMS, relief!, 1440)

  it.skipIf(!present)("is ragged by seconds of arc, a few at the most", () => {
    const profile = profileAt()
    const arcseconds = Array.from(profile.radiusDeg, value => (value - profile.meanRadiusDeg) * 3600)
    expect(Math.max(...arcseconds)).toBeGreaterThan(1)
    expect(Math.max(...arcseconds)).toBeLessThan(8)
    expect(Math.min(...arcseconds)).toBeGreaterThan(-8)
    expect(Math.min(...arcseconds)).toBeLessThan(-0.5)
  })

  it.skipIf(!present)("lets a sliver of the Sun through where a smooth Moon would have covered it all", () => {
    const profile = profileAt()
    const sun = 0.2629
    // The Sun's disc touching the Moon's from inside, at the position angle where the real edge is lowest: on a smooth
    // Moon that is the very last instant of totality, and here a valley of the limb lets some Sun through.
    const lowest = profile.radiusDeg.indexOf(Math.min(...profile.radiusDeg))
    const angle = (lowest / profile.radiusDeg.length) * 2 * Math.PI
    const offset = profile.meanRadiusDeg - sun
    const sunFromMoon = { upDeg: offset * Math.cos(angle), rightDeg: offset * Math.sin(angle) }
    const smooth = { radiusDeg: new Float32Array(profile.radiusDeg.length).fill(profile.meanRadiusDeg), meanRadiusDeg: profile.meanRadiusDeg }
    expect(LunarLimb.uncoveredFraction(smooth, sun, sunFromMoon)).toBeLessThan(1e-9)
    const sliver = LunarLimb.uncoveredFraction(profile, sun, sunFromMoon)
    expect(sliver).toBeGreaterThan(1e-7)
    expect(sliver).toBeLessThan(1e-3)
  })
})
