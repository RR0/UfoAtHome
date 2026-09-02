import { describe, expect, it, vi } from "vitest"
import { CanvasRenderer } from "../../src/render/CanvasRenderer.js"
import { createOval, createPolygon } from "../../src/engine/shape/Shape.js"
import { ShapeHandles } from "../../src/engine/shape/ShapeHandles.js"

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn()
  } as unknown as CanvasRenderingContext2D
}

describe("CanvasRenderer", () => {
  it("paints an oval via ctx.ellipse with the shape's rotation", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = createOval({ x: 0, y: 0, width: 20, height: 10 })

    renderer.paintShape(shape)

    expect(ctx.ellipse).toHaveBeenCalledWith(10, 5, 10, 5, 0, 0, 2 * Math.PI)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("draws a halo (shadowBlur) only when haloScale > 0", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintShape(createOval({ x: 0, y: 0, width: 10, height: 10 }))
    expect(ctx.ellipse).toHaveBeenCalledTimes(1)

    renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 10, height: 10 }), haloScale: 2 })
    // once for the halo pass, once for the base shape
    expect(ctx.ellipse).toHaveBeenCalledTimes(3)
  })

  it("paints a polygon by tracing its points and rotating around its center", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = createPolygon({ x: 5, y: 5, width: 10, height: 10 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 }
    ])

    renderer.paintShape(shape)

    // Center-pivoted (10,10) — not the bounds' top-left corner (5,5) — to match oval rotation
    // (ctx.ellipse's rotation is inherently center-pivoted) and the selection handles.
    expect(ctx.translate).toHaveBeenCalledWith(10, 10)
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0)
    expect(ctx.lineTo).toHaveBeenCalledTimes(2)
    expect(ctx.closePath).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("draws selection handles only when selected", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintShape(createOval({ x: 0, y: 0, width: 10, height: 10 }))
    expect(ctx.stroke).not.toHaveBeenCalled()

    renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 10, height: 10 }), selected: true })
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0) // nw corner of the outline
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 10) // se corner of the outline
    expect(ctx.fillRect).toHaveBeenCalledTimes(8) // one per resize handle
    expect(ctx.stroke).toHaveBeenCalledTimes(2) // outline path + rotate-handle connector line
  })

  it("draws selection handles at handlePointsFor's (rotated) positions, not raw unrotated bounds", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = { ...createOval({ x: 10, y: 20, width: 10, height: 10 }), selected: true, angle: Math.PI / 4 }

    renderer.paintShape(shape)

    const points = ShapeHandles.handlePointsFor(shape)
    expect(ctx.moveTo).toHaveBeenCalledWith(points.nw.x, points.nw.y)
    expect(ctx.lineTo).toHaveBeenCalledWith(points.se.x, points.se.y)
    expect(ctx.fillRect).toHaveBeenCalledWith(points.n.x - 3, points.n.y - 3, 6, 6)
  })

  it("draws selection handles at full opacity, unaffected by the shape's own transparency", () => {
    // A richer mock than createMockContext's: tracks globalAlpha through save/restore for
    // real (the shared mock's restore() is a no-op stub, which would hide this bug — the
    // fix relies on ctx.restore() actually reverting globalAlpha before handles are painted).
    let globalAlpha = 1
    const alphaAtStroke: number[] = []
    const alphaAtFillRect: number[] = []
    const ctx = {
      ...createMockContext(),
      restore: vi.fn(() => {
        globalAlpha = 1
      }),
      get globalAlpha() {
        return globalAlpha
      },
      set globalAlpha(value: number) {
        globalAlpha = value
      },
      stroke: vi.fn(() => alphaAtStroke.push(globalAlpha)),
      fillRect: vi.fn(() => alphaAtFillRect.push(globalAlpha))
    } as unknown as CanvasRenderingContext2D
    const renderer = new CanvasRenderer(ctx)

    renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 10, height: 10 }), selected: true, transparency: 0.8 })

    expect(alphaAtStroke.every(alpha => alpha === 1)).toBe(true)
    expect(alphaAtFillRect.every(alpha => alpha === 1)).toBe(true)
  })

  it("paintMemberOutline draws only the outline, no resize-handle squares", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintMemberOutline(createOval({ x: 0, y: 0, width: 10, height: 10 }))

    expect(ctx.stroke).toHaveBeenCalledTimes(1) // outline only
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("paintGroupHandles draws the 8 corner handles + outline + rotate stem/circle", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintGroupHandles({ x: 0, y: 0, width: 20, height: 10 })

    expect(ctx.fillRect).toHaveBeenCalledTimes(8)
    expect(ctx.stroke).toHaveBeenCalledTimes(2) // outline + rotate-handle connector line
    expect(ctx.ellipse).toHaveBeenCalledTimes(1) // rotate-handle glyph
  })
})

describe("CanvasRenderer stated brilliance", () => {
  function brightContext(): CanvasRenderingContext2D {
    return {
      ...(createMockContext() as unknown as Record<string, unknown>),
      arc: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    } as unknown as CanvasRenderingContext2D
  }

  /*
   * The three things a light too bright to look at does, none of which a halo does — a halo is a
   * coloured fringe, and no fringe reads as painful. A screen cannot go brighter than white, so
   * brilliance can only be said by what the light does to what surrounds it.
   */
  it("spreads a veil far beyond the shape, which a halo never does", () => {
    const ctx = brightContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = { ...createOval({ x: 0, y: 0, width: 20, height: 20 }), brightness: 1 }

    renderer.paintShape(shape)

    // A radial gradient centred on the shape and far wider than it.
    const veil = (ctx.createRadialGradient as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(veil[5]).toBeGreaterThan(20)
    expect(ctx.arc).toHaveBeenCalled()
  })

  /*
   * Clipping is not a shape. A first version painted the saturated core as a radial gradient,
   * which put a round white blob inside a triangle and gave an oval a visible inner bead — neither
   * of which anything in the world does. What saturates is every part of the image over the
   * threshold at once, so the body is one flat colour carried toward white, whatever its outline.
   */
  it("clips the whole body to one colour rather than painting a disc inside it", () => {
    const ctx = brightContext()
    const renderer = new CanvasRenderer(ctx)
    const triangle = { ...createPolygon({ x: 0, y: 0, width: 20, height: 20 }, [{ x: 0, y: 20 }, { x: 10, y: 0 }, { x: 20, y: 20 }]), color: "#39ff14", brightness: 0.7 }

    renderer.paintShape(triangle)

    // One radial gradient only — the veil around it. The body itself is a plain colour.
    expect((ctx.createRadialGradient as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    expect(typeof ctx.fillStyle).toBe("string")
    // #39ff14 carried 70% of the way to white.
    expect(ctx.fillStyle).toBe("rgb(196, 255, 185)")
  })

  /*
   * A spike is thrown by the edge of an aperture blade, which belongs to the camera. Turning the
   * object turns nothing — and two bright things through one lens must star in the same
   * directions, which is also what the Sun's own shader does in the same scene.
   */
  it("keeps the spikes fixed in the image when the shape is rotated", () => {
    const tips = (angle: number): unknown[] => {
      const ctx = brightContext()
      const renderer = new CanvasRenderer(ctx)
      renderer.setStarPoints(6)
      renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 20, height: 20 }), brightness: 1, angle })
      return (ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls
    }

    expect(tips(Math.PI / 4)).toEqual(tips(0))
  })

  // The one thing that DOES turn them, because it turns the blades that throw them.
  it("turns the spikes with the instrument's own roll", () => {
    const spikes = (roll: number): unknown[] => {
      const ctx = brightContext()
      const renderer = new CanvasRenderer(ctx)
      renderer.setStarPoints(6)
      renderer.setRoll(roll)
      renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 20, height: 20 }), brightness: 1 })
      return (ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls
    }

    expect(spikes(0.4)).not.toEqual(spikes(0))
    // Six spikes 60° apart, so a sixth of a turn lands the star back on itself — the same set of
    // directions, drawn in a different order, which is why this compares sets and not sequences.
    const sixth = (2 * Math.PI) / 6
    const directions = (calls: unknown[]): string[] =>
      (calls as number[][]).map(call => call.map(value => Math.round(value * 1000)).join(",")).sort()
    expect(directions(spikes(sixth))).toEqual(directions(spikes(0)))
  })

  it("says nothing extra about a light nobody called bright", () => {
    const ctx = brightContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintShape(createOval({ x: 0, y: 0, width: 20, height: 20 }))

    expect(ctx.arc).not.toHaveBeenCalled()
    expect(ctx.createLinearGradient).not.toHaveBeenCalled()
  })

  // The star a bright light wears is the aperture's, not a style: the same dazzling light is a
  // round glow through a phone and a starburst through an SLR stopped down.
  it("gives it the spikes the instrument's own aperture throws, and none for a round one", () => {
    const ctx = brightContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = { ...createOval({ x: 0, y: 0, width: 20, height: 20 }), brightness: 1 }

    renderer.setStarPoints(6)
    renderer.paintShape(shape)
    expect((ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls.length).toBe(6)

    const roundCtx = brightContext()
    const roundRenderer = new CanvasRenderer(roundCtx)
    roundRenderer.setStarPoints(0)
    roundRenderer.paintShape(shape)
    expect(roundCtx.createLinearGradient).not.toHaveBeenCalled()
    // The veil is still there: a round aperture glows, it just does not star.
    expect(roundCtx.arc).toHaveBeenCalled()
  })
})
