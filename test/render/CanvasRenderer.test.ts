import { describe, expect, it, vi } from "vitest"
import { CanvasRenderer } from "../../src/render/CanvasRenderer.js"
import { createOval, createPolygon } from "../../src/engine/shape/Shape.js"

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

  it("paints a polygon by tracing its points and rotating around bounds origin", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)
    const shape = createPolygon({ x: 5, y: 5, width: 10, height: 10 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 }
    ])

    renderer.paintShape(shape)

    expect(ctx.translate).toHaveBeenCalledWith(5, 5)
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0)
    expect(ctx.lineTo).toHaveBeenCalledTimes(2)
    expect(ctx.closePath).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("draws selection handles only when selected", () => {
    const ctx = createMockContext()
    const renderer = new CanvasRenderer(ctx)

    renderer.paintShape(createOval({ x: 0, y: 0, width: 10, height: 10 }))
    expect(ctx.strokeRect).not.toHaveBeenCalled()

    renderer.paintShape({ ...createOval({ x: 0, y: 0, width: 10, height: 10 }), selected: true })
    expect(ctx.strokeRect).toHaveBeenCalledWith(0, 0, 10, 10)
    expect(ctx.fillRect).toHaveBeenCalledTimes(8)
  })
})
