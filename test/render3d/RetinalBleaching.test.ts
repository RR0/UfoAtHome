import { describe, expect, it } from "vitest"
import { RetinalBleaching } from "../../src/render3d/RetinalBleaching.js"

const FIELD = { width: 107, height: 60 }
const middle = (retina: RetinalBleaching) => (retina as unknown as { left: Float32Array }).left[45 * RetinalBleaching.WIDTH + 80]

describe("RetinalBleaching", () => {
  it("bleaches where a light brighter than the Sun falls, in a fraction of a second, and leaves the rest", () => {
    const retina = new RetinalBleaching()
    retina.advance(0, [], FIELD)
    // Chelyabinsk at its peak: some 850 000 lux at the eye, in the middle of the picture.
    const bolide = [{ ndcX: 0.0, ndcY: 0.0, lux: 8.5e5 }]
    for (let t = 20; t <= 300; t += 20) retina.advance(t, bolide, FIELD)
    expect(retina.any).toBe(true)
    expect(middle(retina)).toBeLessThan(0.3)
    const corner = (retina as unknown as { left: Float32Array }).left[0]
    expect(corner).toBe(1)
  })

  it("leaves nothing for a light no brighter than a bright meteor", () => {
    const retina = new RetinalBleaching()
    retina.advance(0, [], FIELD)
    for (let t = 20; t <= 2000; t += 20) retina.advance(t, [{ ndcX: 0, ndcY: 0, lux: 0.1 }], FIELD)
    expect(retina.any).toBe(false)
  })

  it("regenerates over minutes, a factor e in 110 s, and forgets everything on a jump", () => {
    const retina = new RetinalBleaching()
    retina.advance(0, [], FIELD)
    for (let t = 20; t <= 300; t += 20) retina.advance(t, [{ ndcX: 0, ndcY: 0, lux: 8.5e5 }], FIELD)
    const bleached = 1 - middle(retina)
    for (let t = 1300; t <= 110300; t += 1000) retina.advance(t, [], FIELD)
    expect(1 - middle(retina)).toBeCloseTo(bleached / Math.E, 2)
    retina.advance(500000, [], FIELD)
    expect(retina.any).toBe(false)
  })

  it("draws a sweeping light as a trail, not as the dots of the instants it was drawn at", () => {
    const retina = new RetinalBleaching()
    retina.advance(0, [{ ndcX: -0.5, ndcY: 0, lux: 8.5e5 }], FIELD)
    // One instant a second later, the light 27 degrees further: between them, the cells it crossed are bleached too.
    retina.advance(1000, [{ ndcX: 0, ndcY: 0, lux: 8.5e5 }], FIELD)
    const left = (retina as unknown as { left: Float32Array }).left
    const row = 45 * RetinalBleaching.WIDTH
    const along = Array.from({ length: 41 }, (_, i) => left[row + 40 + i])
    expect(Math.max(...along)).toBeLessThan(0.9)
  })
})
