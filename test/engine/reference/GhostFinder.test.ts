import { describe, expect, it } from "vitest"
import { GhostFinder, type PicturePixels } from "../../../src/engine/reference/GhostFinder.js"

/** A dark picture with soft round spots of light: each { x, y, peak, radius, color }. */
function picture(width: number, height: number, spots: { x: number, y: number, peak: number, radius: number, color?: [number, number, number] }[]): PicturePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 12
    data[i * 4 + 3] = 255
  }
  for (const spot of spots) {
    const [r, g, b] = spot.color ?? [1, 1, 1]
    for (let y = Math.floor(spot.y - 3 * spot.radius); y <= spot.y + 3 * spot.radius; y++) {
      for (let x = Math.floor(spot.x - 3 * spot.radius); x <= spot.x + 3 * spot.radius; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        const v = spot.peak * Math.exp(-((x - spot.x) ** 2 + (y - spot.y) ** 2) / (2 * spot.radius ** 2))
        const i = (y * width + x) * 4
        data[i] = Math.min(255, data[i] + v * r)
        data[i + 1] = Math.min(255, data[i + 1] + v * g)
        data[i + 2] = Math.min(255, data[i + 2] + v * b)
      }
    }
  }
  return { width, height, data }
}

describe("GhostFinder", () => {
  // A picture cropped off its lens's axis: the axis at (450, 345) of an 800 x 600 picture.
  const centre = { x: 450, y: 345 }
  const lamps = [{ x: 300, y: 520 }, { x: 380, y: 540 }, { x: 470, y: 525 }, { x: 560, y: 545 }, { x: 650, y: 510 }]
  const mirrored = lamps.map(lamp => ({ x: 2 * centre.x - lamp.x, y: 2 * centre.y - lamp.y }))

  it("finds the ghosts mirrored through the lens's axis, and the axis, off the picture's centre", () => {
    const search = GhostFinder.find(picture(800, 600, [
      ...lamps.map(lamp => ({ ...lamp, peak: 255, radius: 3 })),
      ...mirrored.map(ghost => ({ ...ghost, peak: 90, radius: 2.5 })),
      // Stars and other faint lights that are no one's ghost.
      { x: 90, y: 60, peak: 80, radius: 1.5 }, { x: 720, y: 90, peak: 70, radius: 1.5 }, { x: 150, y: 380, peak: 60, radius: 2 }
    ]))
    expect(search.confidence).toBe("high")
    expect(search.scale).toBe(-1)
    expect(search.pairs).toHaveLength(5)
    expect(search.centre!.x).toBeCloseTo(centre.x, 0)
    expect(search.centre!.y).toBeCloseTo(centre.y, 0)
    expect(search.cropped).toBe(true)
    for (const pair of search.pairs) expect(pair.residualPx).toBeLessThan(1.5)
  })

  it("finds a ghost at another scale when enough of them agree on it", () => {
    const scale = -0.5
    const search = GhostFinder.find(picture(800, 600, [
      ...lamps.map(lamp => ({ ...lamp, peak: 255, radius: 3 })),
      ...lamps.map(lamp => ({ x: centre.x + scale * (lamp.x - centre.x), y: centre.y + scale * (lamp.y - centre.y), peak: 80, radius: 2 }))
    ]))
    expect(search.scale).toBeCloseTo(scale, 6)
    expect(search.pairs.length).toBeGreaterThanOrEqual(4)
  })

  it("finds nothing in a picture whose faint spots line up with no light", () => {
    const search = GhostFinder.find(picture(800, 600, [
      ...lamps.map(lamp => ({ ...lamp, peak: 255, radius: 3 })),
      { x: 90, y: 60, peak: 80, radius: 1.5 }, { x: 610, y: 140, peak: 70, radius: 1.5 }
    ]))
    expect(search.confidence).toBe("none")
    expect(search.pairs).toHaveLength(0)
  })

  it("takes one ghost alone only when it lies across the picture's own centre", () => {
    const one = (axis: { x: number, y: number }) => GhostFinder.find(picture(800, 600, [
      { x: 250, y: 500, peak: 255, radius: 3 }, { x: 2 * axis.x - 250, y: 2 * axis.y - 500, peak: 90, radius: 2.5 }
    ]))
    expect(one({ x: 400, y: 300 }).confidence).toBe("low")
    expect(one({ x: 600, y: 120 }).confidence).toBe("none")
  })
})
