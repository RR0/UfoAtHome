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
      // Far from where any lamp mirrors through the centre (the top middle of the picture).
      { x: 90, y: 400, peak: 80, radius: 1.5 }, { x: 720, y: 140, peak: 70, radius: 1.5 }
    ]))
    expect(search.confidence).toBe("none")
    expect(search.pairs).toHaveLength(0)
  })

  it("takes the ghost of the sun alone, as bright as the sun but far smaller, in a lit sky and off a cropped picture's centre", () => {
    // A sunset: a bright sky, the sun low in it, and its ghost, saturated too, where the sun mirrors through an axis 5 % of the diagonal
    // off the picture's centre (a crop), with a lit building's windows below.
    const width = 800, height = 600, axis = { x: 445, y: 265 }, sun = { x: 405, y: 390 }
    const pixels = picture(width, height, [
      { ...sun, peak: 255, radius: 22 },
      { x: 2 * axis.x - sun.x, y: 2 * axis.y - sun.y, peak: 255, radius: 4 },
      ...[120, 200, 280, 520, 600, 680].map(x => ({ x, y: 520, peak: 90, radius: 2 }))
    ])
    for (let i = 0; i < width * height; i++) if (i < width * 450 && pixels.data[i * 4] < 110) pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 110
    const search = GhostFinder.find(pixels)
    expect(search.confidence).toBe("low")
    expect(search.pairs).toHaveLength(1)
    expect(search.centre!.x).toBeCloseTo(axis.x, -1)
    expect(search.centre!.y).toBeCloseTo(axis.y, -1)
    expect(search.cropped).toBe(true)
  })

  it("takes one ghost alone only when it lies across the picture's own centre", () => {
    const one = (axis: { x: number, y: number }) => GhostFinder.find(picture(800, 600, [
      { x: 250, y: 500, peak: 255, radius: 3 }, { x: 2 * axis.x - 250, y: 2 * axis.y - 500, peak: 90, radius: 2.5 }
    ]))
    expect(one({ x: 400, y: 300 }).confidence).toBe("low")
    expect(one({ x: 600, y: 120 }).confidence).toBe("none")
  })

  it("finds a lit front's ghost, the whole front upside down and as bright as it, in a sky over a lit ground", () => {
    // A pier's row of lights low in the picture, its ghost the same row across the centre (up and reversed), and the lit ground below.
    const centre = { x: 410, y: 290 }
    const row = Array.from({ length: 12 }, (_, i) => ({ x: 420 + 14 * i, y: 380 + (i % 3) * 4 }))
    const pixels = picture(800, 600, [
      ...row.map(light => ({ ...light, peak: 255, radius: 4 })),
      ...row.map(light => ({ x: 2 * centre.x - light.x, y: 2 * centre.y - light.y, peak: 200, radius: 4 }))
    ])
    for (let y = 470; y < 600; y++) for (let x = 0; x < 800; x++) {
      const i = (y * 800 + x) * 4
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 60 + ((x * 7 + y * 13) % 40)
    }
    const search = GhostFinder.find(pixels)
    expect(search.confidence).toBe("high")
    expect(search.centre!.x).toBeCloseTo(centre.x, -1)
    expect(search.centre!.y).toBeCloseTo(centre.y, -1)
    for (const pair of search.pairs) expect(pair.ghost.y).toBeLessThan(centre.y)
    // A ghost for each light of the front, though its lights run together into a few wide spots.
    expect(search.pairs.length).toBeGreaterThanOrEqual(row.length - 2)
  })

  it("finds a lamp's ghost that is a large pale disc of the aperture, not a spot", () => {
    const centre = { x: 400, y: 300 }, lamp = { x: 560, y: 470 }
    const pixels = picture(800, 600, [
      { ...lamp, peak: 255, radius: 9 },
      ...[{ x: 120, y: 80 }, { x: 650, y: 140 }, { x: 300, y: 500 }].map(star => ({ ...star, peak: 120, radius: 1.2 }))
    ])
    // The disc: flat, faint, 45 pixels across its radius, across the centre from the lamp.
    const disc = { x: 2 * centre.x - lamp.x, y: 2 * centre.y - lamp.y }
    for (let y = 0; y < 600; y++) for (let x = 0; x < 800; x++) {
      if (Math.hypot(x - disc.x, y - disc.y) > 45) continue
      const i = (y * 800 + x) * 4
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 55
    }
    const search = GhostFinder.find(pixels)
    expect(search.confidence).not.toBe("none")
    expect(search.pairs).toHaveLength(1)
    expect(Math.hypot(search.pairs[0].ghost.x - disc.x, search.pairs[0].ghost.y - disc.y)).toBeLessThan(15)
    expect(search.pairs[0].ghost.radius).toBeGreaterThan(25)
  })

  it("finds the axis of a regular row of lamps, not one half a spacing off that pairs each ghost with the next lamp", () => {
    // Two rows of lamps about evenly spaced, as along a front (a row spaced to the pixel would be as well explained by an axis half a
    // spacing off, turned over or not: no finding then), their ghosts mirrored, a few missing, and stars.
    const centre = { x: 430, y: 330 }
    const off = [0, 7, -5, 12, -9, 4, -3, 9, -6]
    const lamps = [...Array.from({ length: 9 }, (_, i) => ({ x: 200 + 60 * i + off[i], y: 520 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 260 + 60 * i - off[i], y: 560 }))]
    const ghosts = lamps.filter((_, i) => i % 4 !== 3).map(lamp => ({ x: 2 * centre.x - lamp.x, y: 2 * centre.y - lamp.y }))
    const search = GhostFinder.find(picture(900, 650, [
      ...lamps.map(lamp => ({ ...lamp, peak: 255, radius: 3 })),
      ...ghosts.map(ghost => ({ ...ghost, peak: 70, radius: 2.5 })),
      ...[{ x: 80, y: 60 }, { x: 820, y: 90 }, { x: 600, y: 40 }, { x: 150, y: 300 }].map(star => ({ ...star, peak: 60, radius: 1.5 }))
    ]))
    expect(search.confidence).toBe("high")
    expect(search.centre!.x).toBeCloseTo(centre.x, 0)
    expect(search.centre!.y).toBeCloseTo(centre.y, 0)
    expect(search.pairs.length).toBeGreaterThanOrEqual(ghosts.length - 1)
  })

  it("takes no circle drawn round a ghost on the picture, across from the sun's wide glare, for more ghosts", () => {
    const centre = { x: 300, y: 400 }, sun = { x: 120, y: 600 }
    const ghost = { x: 2 * centre.x - sun.x, y: 2 * centre.y - sun.y }
    const pixels = picture(600, 800, [
      { ...sun, peak: 255, radius: 40 },
      { ...ghost, peak: 200, radius: 3 }
    ])
    // A blue sky, and a circle drawn round the ghost, thin and faint.
    for (let i = 0; i < 600 * 800; i++) if (pixels.data[i * 4] < 70) pixels.data[i * 4 + 2] = 70
    for (let a = 0; a < 2000; a++) {
      const angle = a / 2000 * 2 * Math.PI
      const x = Math.round(ghost.x + 70 * Math.cos(angle)), y = Math.round(ghost.y + 90 * Math.sin(angle))
      const i = (y * 600 + x) * 4
      pixels.data[i] = 120
    }
    const search = GhostFinder.find(pixels)
    expect(search.pairs).toHaveLength(1)
    expect(Math.hypot(search.pairs[0].ghost.x - ghost.x, search.pairs[0].ghost.y - ghost.y)).toBeLessThan(4)
    expect(Math.hypot(search.pairs[0].light.x - sun.x, search.pairs[0].light.y - sun.y)).toBeLessThan(15)
  })
})
