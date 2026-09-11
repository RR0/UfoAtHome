import { describe, expect, it } from "vitest"
import { LayeredCloudSystem } from "../../src/render3d/LayeredCloudSystem.js"
import { RainbowEffect } from "../../src/render3d/RainbowEffect.js"

const PRECIPITATION_RENDER_ORDER = 6

describe("LayeredCloudSystem.deckOrder", () => {
  it("draws a deck the witness stands under behind the rainbow, which is rain fallen from it", () => {
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
