import { describe, expect, it } from "vitest"
import { CloudField } from "../../src/render3d/CloudSystem.js"

/**
 * The CPU twin of the cloud shader's own coverage field — what lets the app answer "is there cloud
 * in THIS direction", which is the question hiding a UFO shape behind a cloud comes down to. Its
 * job is to agree with what the GPU draws, so these pin the properties both share.
 */
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

  it("leaves real gaps at partial coverage — a broken deck is not a lid", () => {
    let clear = 0
    for (let i = 0; i < 200; i++) {
      const azimuth = (i / 200) * Math.PI * 2
      const direction = { x: Math.sin(azimuth) * 0.7, y: 0.7, z: Math.cos(azimuth) * 0.7 }
      if (CloudField.alphaAt(direction, 250, 0.4) < 0.5) clear++
    }
    expect(clear).toBeGreaterThan(20)
  })

  it("draws nothing in the last couple of degrees above the horizon, where the deck itself stops", () => {
    expect(CloudField.alphaAt({ x: 1, y: 0.01, z: 0 }, 250, 1)).toBe(0)
  })

  it("is deterministic — the same direction always gives the same answer", () => {
    const direction = { x: 0.3, y: 0.6, z: 0.74 }
    expect(CloudField.alphaAt(direction, 250, 0.6)).toBe(CloudField.alphaAt(direction, 250, 0.6))
  })
})
