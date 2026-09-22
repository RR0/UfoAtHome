import { describe, expect, it } from "vitest"
import { LayeredCloudSystem } from "../../src/render3d/LayeredCloudSystem.js"
import { RainbowEffect } from "../../src/render3d/RainbowEffect.js"

const PRECIPITATION_RENDER_ORDER = 6

describe("LayeredCloudSystem.deckOrder", () => {
  it("draws a deck the observer stands under behind the rainbow, which is rain fallen from it", () => {
    for (let index = 0; index < 3; index++) {
      expect(LayeredCloudSystem.deckOrder(false, index, 3)).toBeLessThan(RainbowEffect.RENDER_ORDER)
    }
  })

  it("draws a deck under the eye over the rainbow, since it stands between the eye and the rain", () => {
    for (let index = 0; index < 3; index++) {
      const order = LayeredCloudSystem.deckOrder(true, index, 3)
      expect(order).toBeGreaterThan(RainbowEffect.RENDER_ORDER)
      expect(order).toBeLessThan(PRECIPITATION_RENDER_ORDER)
    }
  })

  it("keeps the layers' own order within each group", () => {
    expect(LayeredCloudSystem.deckOrder(false, 0, 3)).toBeLessThan(LayeredCloudSystem.deckOrder(false, 2, 3))
    expect(LayeredCloudSystem.deckOrder(true, 0, 3)).toBeLessThan(LayeredCloudSystem.deckOrder(true, 2, 3))
  })
})

describe("LayeredCloudSystem.sunVisibility", () => {
  it("gives a cloud the whole Sun however low it stands, not the sine of its altitude", () => {
    expect(LayeredCloudSystem.sunVisibility(2, 1500)).toBe(1)
    expect(LayeredCloudSystem.sunVisibility(0.5, 0)).toBe(1)
  })

  it("keeps a high cloud lit after the Sun has set for the ground, and none at night", () => {
    // From 1500 m the horizon dips 1.24°: a Sun a degree under still lights the cloud.
    expect(LayeredCloudSystem.sunVisibility(-1, 0)).toBe(0)
    expect(LayeredCloudSystem.sunVisibility(-1, 1500)).toBeGreaterThan(0.5)
    expect(LayeredCloudSystem.sunVisibility(-23, 3000)).toBe(0)
  })
})
