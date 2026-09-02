import { describe, expect, it, vi, beforeAll } from "vitest"

/**
 * The rain drop's own shape, which is all this texture is.
 *
 * three's CanvasTexture only wants an image, so the whole thing is one ImageData this test can
 * read back — no WebGL, no renderer, just the profile the shader will sample.
 */
const drawn: { data?: ImageData } = {}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((): unknown => ({
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4)
    }),
    putImageData: (image: ImageData) => {
      drawn.data = image
    }
  })) as typeof HTMLCanvasElement.prototype.getContext)
})

async function streakAlpha(): Promise<{ size: number, at: (x: number, y: number) => number }> {
  const { getRainStreakTexture } = await import("../../src/render3d/RainSystem.js")
  getRainStreakTexture()
  const image = drawn.data!
  return { size: image.width, at: (x, y) => image.data[(y * image.width + x) * 4 + 3] }
}

describe("rain streak texture", () => {
  it("falls off smoothly across its width, with no plateau and no shoulder", async () => {
    const { size, at } = await streakAlpha()
    const middle = Math.floor(size / 2)
    const across: number[] = []
    for (let x = middle; x < middle + 12; x++) across.push(at(x, middle))

    // Strictly decreasing from the axis outward: a tent profile with a flat top and a corner —
    // which is what this used to be, five gradient stops wide — reads as a bar, not a drop.
    for (let i = 1; i < across.length; i++) {
      expect(across[i]).toBeLessThan(across[i - 1])
    }
    expect(across[0]).toBeGreaterThan(240)
    expect(across[across.length - 1]).toBeLessThan(60)
  })

  /*
   * The streak is a drop swept along a line, so its outline is a capsule and both ends are round
   * for free. The taper is not a fade painted onto a bar: it is the drop's own shape at the two
   * instants the exposure caught it starting and finishing.
   */
  it("tapers to nothing at both ends", async () => {
    const { size, at } = await streakAlpha()
    const middle = Math.floor(size / 2)

    expect(at(middle, middle)).toBeGreaterThan(240)
    expect(at(middle, 1)).toBeLessThan(10)
    expect(at(middle, size - 2)).toBeLessThan(10)
    // And it gets there gradually rather than being cut: a tenth of the way in it is already well
    // down from the middle, but not yet gone.
    const tenth = at(middle, Math.round(size * 0.1))
    expect(tenth).toBeGreaterThan(10)
    expect(tenth).toBeLessThan(200)
  })

  it("stays a hairline rather than a column", async () => {
    const { size, at } = await streakAlpha()
    const middle = Math.floor(size / 2)
    let visible = 0
    for (let x = 0; x < size; x++) if (at(x, middle) > 25) visible++

    // Well under a sixth of the texture: an early version ramped its opacity across nearly half
    // the canvas and rendered as a fat blurry column.
    expect(visible).toBeLessThan(size / 6)
    expect(visible).toBeGreaterThan(4)
  })
})
