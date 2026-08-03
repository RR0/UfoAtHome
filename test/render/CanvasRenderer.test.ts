import { describe, expect, it, vi } from "vitest"
import { CanvasRenderer } from "../../src/render/CanvasRenderer.js"
import { createOval, createPolygon } from "../../src/engine/shape/Shape.js"
import { handlePointsFor } from "../../src/engine/shape/ShapeHandles.js"

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

    const points = handlePointsFor(shape)
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
})
