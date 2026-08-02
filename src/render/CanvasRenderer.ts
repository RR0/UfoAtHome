import type { Shape } from "../engine/shape/Shape.js"

const CORNER_SIZE = 6
const HALF_CORNER_SIZE = CORNER_SIZE / 2
const HALO_BLUR_UNIT = 20

/**
 * Paints shapes onto a Canvas2D context, replacing DrawShape/OvalShape/
 * PolygonShape's AWT paint(Graphics) methods.
 *
 * ctx.ellipse's native rotation parameter handles ovals at any angle in one
 * call, replacing both OvalShape's cardinal-angle special case and its
 * polygon-rotation fallback (which looked non-functional in the original —
 * see UfoAtHome/applets .../OvalShape.java). The halo/glow effect uses
 * ctx.shadowBlur/shadowColor, replacing the original's manual
 * PixelGrabber/MemoryImageSource pixel-masking hack entirely.
 */
export class CanvasRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {
  }

  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height)
  }

  paintShape(shape: Shape): void {
    this.ctx.save()
    this.ctx.globalAlpha = 1 - shape.transparency
    if (shape.haloScale > 0) {
      this.paintHalo(shape)
    }
    this.paintBase(shape)
    if (shape.selected) {
      this.paintSelectionHandles(shape)
    }
    this.ctx.restore()
  }

  private paintBase(shape: Shape): void {
    this.ctx.fillStyle = shape.color
    this.ctx.beginPath()
    if (shape.kind === "oval") {
      const { x, y, width, height } = shape.bounds
      const rx = width / 2
      const ry = height / 2
      this.ctx.ellipse(x + rx, y + ry, rx, ry, shape.angle, 0, 2 * Math.PI)
    } else {
      const { x, y } = shape.bounds
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate(shape.angle)
      shape.points.forEach((point, index) => {
        if (index === 0) {
          this.ctx.moveTo(point.x, point.y)
        } else {
          this.ctx.lineTo(point.x, point.y)
        }
      })
      this.ctx.closePath()
      this.ctx.restore()
    }
    this.ctx.fill()
  }

  private paintHalo(shape: Shape): void {
    this.ctx.save()
    this.ctx.shadowColor = shape.color
    this.ctx.shadowBlur = HALO_BLUR_UNIT * shape.haloScale
    this.paintBase(shape)
    this.ctx.restore()
  }

  private paintSelectionHandles(shape: Shape): void {
    const { x, y, width, height } = shape.bounds
    const halfWidth = width / 2
    const halfHeight = height / 2
    this.ctx.strokeStyle = "lightgray"
    this.ctx.strokeRect(x, y, width, height)
    this.ctx.fillStyle = "lightgray"
    const handlePoints: [number, number][] = [
      [x, y],
      [x + halfWidth, y],
      [x + width, y],
      [x + width, y + halfHeight],
      [x + width, y + height],
      [x + halfWidth, y + height],
      [x, y + height],
      [x, y + halfHeight]
    ]
    for (const [hx, hy] of handlePoints) {
      this.ctx.fillRect(hx - HALF_CORNER_SIZE, hy - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE)
    }
  }
}
