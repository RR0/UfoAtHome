import { describe, expect, it } from "vitest"
import { buildCloudGeometry, CloudField } from "../../src/render3d/CloudSystem.js"

/** CPU coverage used for celestial transmission must agree with the cloud surface. */
describe("CloudField.alphaAt", () => {
  const up = { x: 0, y: 1, z: 0 }
  const sample = (coverage: number, layerHeight = 250) => {
    // A spread of directions rather than one, since the field is noise: what matters is how much
    // of the sky it covers, not any single ray.
    let sum = 0
    const count = 400
    for (let i = 0; i < count; i++) {
      const azimuth = (i / count) * Math.PI * 2
      const altitude = 0.2 + (i % 20) * 0.04
      const direction = { x: Math.cos(altitude) * Math.sin(azimuth), y: Math.sin(altitude), z: Math.cos(altitude) * Math.cos(azimuth) }
      sum += CloudField.alphaAt(direction, layerHeight, coverage)
    }
    return sum / count
  }

  it("is empty sky at zero coverage and solid at full", () => {
    expect(CloudField.alphaAt(up, 250, 0)).toBe(0)
    expect(CloudField.alphaAt(up, 250, 1)).toBeCloseTo(1, 5)
  })

  it("covers more sky as coverage rises", () => {
    const quarter = sample(0.25)
    const half = sample(0.5)
    const most = sample(0.9)
    expect(quarter).toBeLessThan(half)
    expect(half).toBeLessThan(most)
    expect(most).toBeGreaterThan(0.9)
  })

  it("covers about the fraction of sky the coverage states", () => {
    // Uniform over the sky above the deck's own cutoff, not a fixed spread: the fraction is what
    // is being checked, so the sample must not favour any part of the field.
    const fraction = (coverage: number) => {
      let sum = 0
      const count = 3000
      for (let i = 0; i < count; i++) {
        const altitude = Math.asin(0.05 + 0.95 * ((i * 0.618033988749895) % 1))
        const azimuth = (i / count) * Math.PI * 2
        sum += CloudField.alphaAt(
          { x: Math.sin(azimuth) * Math.cos(altitude), y: Math.sin(altitude), z: -Math.cos(azimuth) * Math.cos(altitude) },
          875,
          coverage
        )
      }
      return sum / count
    }
    expect(fraction(0.12)).toBeGreaterThan(0.06)
    expect(fraction(0.12)).toBeLessThan(0.2)
    expect(fraction(0.5)).toBeGreaterThan(0.4)
    expect(fraction(0.5)).toBeLessThan(0.6)
    expect(fraction(0.8)).toBeGreaterThan(0.7)
  })

  it("leaves real gaps at partial coverage — a broken deck is not a lid", () => {
    let clear = 0
    for (let i = 0; i < 200; i++) {
      const azimuth = (i / 200) * Math.PI * 2
      const direction = { x: Math.sin(azimuth) * 0.7, y: 0.7, z: Math.cos(azimuth) * 0.7 }
      if (CloudField.alphaAt(direction, 250, 0.4) < 0.5) clear++
    }
    expect(clear).toBeGreaterThan(20)
  })

  it("keeps overcast coverage all the way to the horizon", () => {
    for (const y of [0, 0.001, 0.01, 0.026, 0.052]) {
      expect(CloudField.alphaAt({ x: Math.sqrt(1 - y * y), y, z: 0 }, 250, 1)).toBe(1)
      expect(CloudField.alphaAt({ x: Math.sqrt(1 - y * y), y, z: 0 }, 250, 0)).toBe(0)
    }
  })

  it("extends the cloud hemisphere to the horizon without extending below it", () => {
    const geometry = buildCloudGeometry(700)
    try {
      const positions = geometry.getAttribute("position")
      let lowest = Infinity
      for (let i = 0; i < positions.count; i++) lowest = Math.min(lowest, positions.getY(i))
      expect(lowest).toBeCloseTo(0, 8)
      expect(geometry.parameters.thetaLength).toBe(Math.PI / 2)
    } finally {
      geometry.dispose()
    }
  })

  it("is deterministic — the same direction always gives the same answer", () => {
    const direction = { x: 0.3, y: 0.6, z: 0.74 }
    expect(CloudField.alphaAt(direction, 250, 0.6)).toBe(CloudField.alphaAt(direction, 250, 0.6))
  })
})

/** The ice deck's field, which is not the water's: narrower, and fibrous. */
describe("CloudField.iceAlphaAt", () => {
  // Over several skies: the veil's presence is a field as broad as the deck is high, so one sky
  // holds only a few of its features and its cover strays from the stated one, as a real sky does.
  // At the height a cirrus deck at 8 km of size 2 200 m is drawn at.
  const fraction = (coverage: number) => {
    let sum = 0
    const count = 3000
    const skies = 8
    for (let sky = 0; sky < skies; sky++) {
      const fieldOffset = { x: sky * 7919, z: sky * 3571 }
      for (let i = 0; i < count; i++) {
        const altitude = Math.asin(0.05 + 0.95 * ((i * 0.618033988749895) % 1))
        const azimuth = (i / count) * Math.PI * 2
        sum += CloudField.iceAlphaAt({ x: Math.sin(azimuth) * Math.cos(altitude), y: Math.sin(altitude), z: -Math.cos(azimuth) * Math.cos(altitude) }, 1273, coverage, fieldOffset)
      }
    }
    return sum / (count * skies)
  }

  it("covers about the fraction of sky the coverage states", () => {
    // Read at the water's threshold, 12% came out 8% and 88% came out 94%; at the ice's with the
    // water's ramp, 17% and 81%.
    for (const coverage of [0.12, 0.3, 0.45, 0.6, 0.7, 0.88]) {
      expect(Math.abs(fraction(coverage) - coverage)).toBeLessThan(0.045)
    }
  })

  it("leaves its gaps as broad clear areas, not lanes of sky between the fibres", () => {
    // A veil at 85% read off the fibres alone left its 15% as long thin lanes across them: blue
    // stripes combed through a sky that is, in a photo, one continuous milky sheet. Walk across the
    // fibres (along z on the deck's plane) and count, for every clear point, whether the sky is
    // still clear a fibre's width (25 units) to either side. 67% of them were lanes.
    const height = 1273
    let clear = 0
    let lanes = 0
    for (let sky = 0; sky < 8; sky++) {
      const fieldOffset = { x: sky * 7919, z: sky * 3571 }
      const at = (x: number, z: number) => {
        const length = Math.hypot(x, height, z)
        return CloudField.iceAlphaAt({ x: x / length, y: height / length, z: z / length }, height, 0.85, fieldOffset)
      }
      for (let x = -2000; x <= 2000; x += 200) {
        for (let z = -2000; z <= 2000; z += 10) {
          if (at(x, z) >= 0.5) continue
          clear++
          if (at(x, z - 25) >= 0.5 && at(x, z + 25) >= 0.5) lanes++
        }
      }
    }
    expect(clear).toBeGreaterThan(100)
    expect(lanes / clear).toBeLessThan(0.02)
  })

  it("keeps sparse ice in filaments drawn out along the wind", () => {
    // What tells scattered cirrus from a cirrostratus: the veil is a sheet, the sparse ice is
    // fibres, long along x and narrow across z. Same step both ways, how often cloud stays cloud.
    const height = 1273
    const along = { same: 0, of: 0 }
    const across = { same: 0, of: 0 }
    for (let sky = 0; sky < 8; sky++) {
      const fieldOffset = { x: sky * 7919, z: sky * 3571 }
      const at = (x: number, z: number) => {
        const length = Math.hypot(x, height, z)
        return CloudField.iceAlphaAt({ x: x / length, y: height / length, z: z / length }, height, 0.2, fieldOffset) >= 0.5
      }
      for (let x = -2000; x <= 2000; x += 100) {
        for (let z = -2000; z <= 2000; z += 100) {
          if (!at(x, z)) continue
          along.of++
          across.of++
          if (at(x + 40, z)) along.same++
          if (at(x, z + 40)) across.same++
        }
      }
    }
    expect(along.of).toBeGreaterThan(100)
    expect(along.same / along.of).toBeGreaterThan(across.same / across.of + 0.1)
  })

})
