import { describe, expect, it } from "vitest"
import { ShapeModel } from "../../src/engine/shape/ShapeModel.js"
import type { Appearance } from "../../src/engine/shape/Shape.js"

const appearance: Appearance = { presetId: "oval", color: "#ff0000", transparency: 0.2, haloScale: 1, blur: 0.1, brightness: 0 }
const bounds = { x: 100, y: 50, width: 60, height: 20 }

describe("ShapeModel", () => {
  it("adds only ovals and polygons, in the editor's own colour", () => {
    for (const model of ShapeModel.ALL) {
      for (const shape of model.shapesIn(bounds, appearance)) {
        expect(["oval", "polygon"]).toContain(shape.kind)
        expect(shape.color).toBe("#ff0000")
        expect(shape.transparency).toBe(0.2)
        expect(shape.blur).toBe(0.1)
      }
    }
  })

  it("makes a saucer of a dome behind a disc, both within the model's box", () => {
    const saucer = ShapeModel.byId("saucer")!
    const box = saucer.boundsAt(bounds)
    const [dome, disc] = saucer.shapesIn(box, appearance)
    expect(saucer.partNames).toEqual(["dome", "disc"])
    expect(dome.kind).toBe("oval")
    expect(disc.bounds.width).toBe(box.width)
    expect(dome.bounds.y).toBeLessThan(disc.bounds.y)
    for (const shape of [dome, disc]) {
      expect(shape.bounds.x).toBeGreaterThanOrEqual(box.x)
      expect(shape.bounds.y + shape.bounds.height).toBeLessThanOrEqual(box.y + box.height + 1e-9)
    }
  })

  it("keeps the requested box's centre and width, with its own aspect", () => {
    const cigar = ShapeModel.byId("cigar")!
    const box = cigar.boundsAt(bounds)
    expect(box.width).toBe(60)
    expect(box.height).toBeCloseTo(15)
    expect(box.y + box.height / 2).toBe(bounds.y + bounds.height / 2)
  })

  it("draws a triangle's points within its own box", () => {
    const [triangle] = ShapeModel.byId("triangle")!.shapesIn(bounds, appearance)
    expect(triangle.kind).toBe("polygon")
    if (triangle.kind !== "polygon") return
    expect(triangle.points).toEqual([{ x: 30, y: 0 }, { x: 60, y: 20 }, { x: 0, y: 20 }])
  })

  it("states at least a light's halo and brilliance, never less than the editor's", () => {
    const light = ShapeModel.byId("light")!
    const [glow] = light.shapesIn(bounds, appearance)
    expect(glow.haloScale).toBe(2.5)
    expect(glow.brightness).toBe(0.5)
    const [brighter] = light.shapesIn(bounds, { ...appearance, haloScale: 3, brightness: 0.9 })
    expect(brighter.haloScale).toBe(3)
    expect(brighter.brightness).toBe(0.9)
  })
})
