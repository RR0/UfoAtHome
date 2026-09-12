import type { Shape, ShapeBounds } from "../engine/shape/Shape.js"
import { RESIZE_HANDLE_IDS, ShapeHandles, type HandleId } from "../engine/shape/ShapeHandles.js"

const CORNER_SIZE = 6
const HALF_CORNER_SIZE = CORNER_SIZE / 2
const HALO_BLUR_UNIT = 20
/**
 * Canvas pixels of blur radius at a stated blur of 1 — the point at which an object has no edge
 * left to speak of.
 *
 * A drawing scale, deliberately, not a physical one: the recording states how indistinct the thing
 * looked, and what that is worth in metres is read back out of the instrument rather than baked in
 * here (see DepthOfField and the editor's own distance bound).
 */
export const BLUR_RADIUS_UNIT = 24
/**
 * How far the veil of a fully dazzling light reaches, as a multiple of the shape's own radius.
 *
 * The veil is the thing that actually reads as brilliance on a screen, and it has to be wide to do
 * it: what makes a light look painful is not its core, which is only ever as bright as white, but
 * how much of the field around it it washes out. The Sun's own glare in the 3D scene reaches
 * comparably far (see SceneRenderer's glareRadius).
 */
const DAZZLE_VEIL_RADIUS_SCALE = 9
/** How steeply that veil falls off. Light scattered in an eye or a lens goes roughly as 1/θ², the
 * same law the Sun's dazzle uses — approximated here by stacking gradient stops on that curve,
 * since a canvas gradient interpolates linearly between whatever stops it is given. */
const DAZZLE_VEIL_STOPS = 6
/** Length of a diffraction spike at full brightness, as a multiple of the shape's own radius. */
const DAZZLE_SPIKE_LENGTH_SCALE = 7
/** Smallest radius, in image pixels, a dazzle veil is drawn at when the shape throwing it is
 * brighter than nothing — scaled by that brightness, so a faintly-stated light still gets a faint
 * veil. See paintDazzle for why a floor is the honest rendering of a bright point rather than an
 * inflation of it. */
const MIN_DAZZLE_VEIL_PX = 6
const VERTEX_HANDLE_RADIUS = 4

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
  /** The instrument's own spike count — see setStarPoints. */
  private starPoints = 0
  /** The instrument's own roll, radians — see setRoll. */
  private roll = 0

  constructor(private readonly ctx: CanvasRenderingContext2D) {
  }

  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height)
  }

  /**
   * The box, in the same canvas pixels as `shape.bounds`, that paintShape actually touches — the
   * body, plus whatever its halo, its blur, its veil and its spikes reach past it.
   *
   * What a texture of the shape has to be sized to (see PhenomenonSystem): a glow cut off at the
   * body's own edge is a glow with a square hole in it. Symmetric about the body's centre, since
   * every one of those effects is, so the box and the body share a centre and the plane carrying
   * the texture can be placed by the body's own direction.
   *
   * Conservative on purpose — a CSS blur has a tail past its stated radius, and so does a canvas
   * shadow — and a little empty margin in a texture costs nothing.
   */
  static paintExtent(shape: Shape): ShapeBounds {
    const { x, y, width, height } = shape.bounds
    const centreX = x + width / 2
    const centreY = y + height / 2
    // A rotated body reaches past its own axis-aligned box, as far as its half-diagonal.
    const rotated = shape.angle % (2 * Math.PI) !== 0
    const halfDiagonal = Math.hypot(width, height) / 2
    const halfWidth = rotated ? halfDiagonal : width / 2
    const halfHeight = rotated ? halfDiagonal : height / 2
    const radius = Math.max(width, height) / 2
    const brightness = shape.brightness ?? 0
    const veilReach = brightness > 0
      ? Math.max(radius * (1 + DAZZLE_VEIL_RADIUS_SCALE * brightness), MIN_DAZZLE_VEIL_PX * brightness) - radius
      : 0
    const spikeReach = brightness > 0 ? radius * (1 + DAZZLE_SPIKE_LENGTH_SCALE * brightness) - radius : 0
    const soft = 3 * BLUR_RADIUS_UNIT * (shape.blur ?? 0) + 1.5 * HALO_BLUR_UNIT * shape.haloScale
    const pad = Math.max(veilReach, spikeReach, 0) + soft + 2
    return {
      x: centreX - halfWidth - pad,
      y: centreY - halfHeight - pad,
      width: 2 * (halfWidth + pad),
      height: 2 * (halfHeight + pad)
    }
  }

  /**
   * Paints the shape as paintShape would, but with the canvas's origin moved so that `extent`'s
   * top-left corner lands at (0, 0) and every canvas pixel is `scale` device pixels — what fills a
   * texture the size of paintExtent's box (see PhenomenonSystem). Selection handles are never
   * painted here: they are an editing affordance and stay on the overlay the pointer works on.
   */
  paintInto(shape: Shape, extent: ShapeBounds, scale: number): void {
    this.ctx.save()
    this.ctx.scale(scale, scale)
    this.ctx.translate(-extent.x, -extent.y)
    this.paintShape(shape.selected ? { ...shape, selected: false } : shape)
    this.ctx.restore()
  }

  paintShape(shape: Shape): void {
    this.ctx.save()
    this.ctx.globalAlpha = 1 - shape.transparency
    // Applied to the whole shape, halo included, and before either is painted: ctx.filter affects
    // what is drawn AFTER it. A blurred edge and a blurred glow are the same statement — the
    // witness could not place the boundary — so blurring the fringe while leaving the body's own
    // outline crisp would draw a hard edge inside a soft one, which is nothing anybody saw.
    const blur = shape.blur ?? 0
    if (blur > 0) {
      this.ctx.filter = `blur(${(BLUR_RADIUS_UNIT * blur).toFixed(2)}px)`
    }
    const brightness = shape.brightness ?? 0
    if (brightness > 0) {
      this.paintDazzle(shape, brightness)
    }
    if (shape.haloScale > 0) {
      this.paintHalo(shape)
    }
    this.paintBase(shape)
    this.ctx.restore()
    // Painted after restoring globalAlpha: the selection indicator is an editor-only overlay,
    // not part of the sighting itself, so it shouldn't fade out along with a transparent shape.
    if (shape.selected) {
      this.paintSelectionHandles(shape)
    }
  }

  /**
   * How many diffraction spikes a bright light wears here — the instrument's own, never a style.
   *
   * Set by whoever knows which instrument the recording names (see UfoElement), because the same
   * dazzling light is a round glow through a phone and a starburst through an SLR stopped down,
   * and that difference is a fact about the camera rather than a decoration. 0 for a round
   * aperture, and for the naked eye.
   */
  setStarPoints(points: number): void {
    this.starPoints = Math.max(0, Math.floor(points))
  }

  /** How far the instrument was rolled about its line of sight, radians — the ONE thing that does
   * turn the spikes, because it turns the blades that throw them. Set alongside the count, from
   * the same pose (see UfoElement). */
  setRoll(radians: number): void {
    this.roll = radians
  }

  /**
   * The three things a light too bright to look at does, none of which a halo does.
   *
   * A veil first, far wider than the shape and falling off as roughly 1/θ² — that is what washes
   * out the field around a painful light, and what a bigger halo can never be, since a halo is a
   * fringe and this is a wash. Then the spikes its aperture throws. The saturated white core is
   * painted last, with the body itself (see paintBase): on a screen nothing can be brighter than
   * white, so brilliance can only be said by what a light DOES to what surrounds it.
   */
  private paintDazzle(shape: Shape, brightness: number): void {
    const { x, y, width, height } = shape.bounds
    const centerX = x + width / 2
    const centerY = y + height / 2
    const radius = Math.max(width, height) / 2
    // Floored, and for the same reason DecorSystem floors a lamp's own drawn radius (see
    // LAMP_MIN_ANGULAR_RADIUS_RAD): what reaches an eye from a bright light is its BLOOM, not its
    // outline, and a bloom scaled from an outline a third of a pixel across reaches nobody. Socorro
    // is the case that showed it — the flame Zamora saw from a kilometre off is 0.06 degrees of
    // actual flame, which is a third of a pixel, and it was simply absent from the reconstruction
    // while the account has him seeing it from the road. The floor is on the VEIL only: the shape's
    // own stated size is untouched, so nothing here claims the flame was bigger than it was.
    const veilRadius = Math.max(radius * (1 + DAZZLE_VEIL_RADIUS_SCALE * brightness), MIN_DAZZLE_VEIL_PX * brightness)
    if (veilRadius <= 0) return
    this.ctx.save()
    // Additive, like the Sun's own glare sprite: two overlapping veils are brighter than either,
    // which is what light does and what a plain alpha blend refuses to do.
    this.ctx.globalCompositeOperation = "lighter"
    const veil = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, veilRadius)
    for (let stop = 0; stop <= DAZZLE_VEIL_STOPS; stop++) {
      const fraction = stop / DAZZLE_VEIL_STOPS
      // 1/(1+kθ²) rather than 1/θ², which is infinite at the centre — the same finite-core shape
      // the scattering law takes once the source has a size at all.
      const falloff = 1 / (1 + 24 * fraction * fraction)
      this.ctx.globalAlpha = 1
      veil.addColorStop(fraction, this.withAlpha(shape.color, falloff * brightness * 0.55))
    }
    this.ctx.fillStyle = veil
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, veilRadius, 0, 2 * Math.PI)
    this.ctx.fill()

    if (this.starPoints > 0) {
      const length = radius * (1 + DAZZLE_SPIKE_LENGTH_SCALE * brightness)
      this.ctx.lineWidth = Math.max(1, radius * 0.12)
      this.ctx.lineCap = "round"
      for (let spike = 0; spike < this.starPoints; spike++) {
        // Turned by the INSTRUMENT's roll and by nothing else. A spike is thrown by the edge of
        // an aperture blade, which belongs to the camera: turning the object turns nothing, and
        // two bright things seen through one lens star in the same directions. An earlier version
        // added shape.angle here, which had every bright shape claiming a differently-oriented
        // diaphragm — and disagreeing with the Sun's own star in the same frame.
        const angle = (spike / this.starPoints) * Math.PI * 2 + this.roll
        const tipX = centerX + Math.cos(angle) * length
        const tipY = centerY + Math.sin(angle) * length
        // Faded along its own length rather than drawn as a bar. A diffraction spike is the
        // aperture's edge spreading light outward, and it runs out of light as it goes — a stroke
        // of constant alpha reads as a drawn ray, which is the one thing this must not look like.
        const taper = this.ctx.createLinearGradient(centerX, centerY, tipX, tipY)
        taper.addColorStop(0, this.withAlpha(shape.color, brightness * 0.55))
        taper.addColorStop(0.35, this.withAlpha(shape.color, brightness * 0.22))
        taper.addColorStop(1, this.withAlpha(shape.color, 0))
        this.ctx.strokeStyle = taper
        this.ctx.beginPath()
        this.ctx.moveTo(centerX, centerY)
        this.ctx.lineTo(tipX, tipY)
        this.ctx.stroke()
      }
    }
    this.ctx.restore()
  }

  /**
   * The colour of a light that has saturated whatever was looking at it: its own, carried toward
   * white by how bright it was said to be. Flat, and that is the whole point.
   *
   * Clipping is not a shape. A first version painted this as a radial gradient — white in the
   * middle, falling back to the hue at the rim — which put a round white blob inside a triangle
   * and gave an oval a visible inner bead, neither of which anything in the world does. What
   * saturates in a real eye or a real sensor is every part of the image over the threshold at
   * once, so a light called dazzling is white ACROSS ITS WHOLE apparent area, whatever that area's
   * outline. The hue survives where the light falls off, which is beyond the object's own edge —
   * that is the veil (see paintDazzle), and it is already coloured.
   */
  private dazzledFill(shape: Shape, brightness: number): string {
    if (brightness <= 0) return shape.color
    const hex = /^#([0-9a-f]{6})$/i.exec(shape.color.trim())
    if (!hex) return shape.color
    const value = Number.parseInt(hex[1], 16)
    const clipped = (channel: number): number => Math.round(channel + (255 - channel) * brightness)
    return `rgb(${clipped((value >> 16) & 255)}, ${clipped((value >> 8) & 255)}, ${clipped(value & 255)})`
  }

  /** A CSS colour at a given alpha. Canvas gradients need a colour string per stop, and the shape's
   * own colour is whatever CSS the recording states — hex here, but not necessarily forever, so
   * this goes through the context rather than parsing it. */
  private withAlpha(color: string, alpha: number): string {
    const clamped = Math.max(0, Math.min(1, alpha))
    const hex = /^#([0-9a-f]{6})$/i.exec(color.trim())
    if (!hex) return color
    const value = Number.parseInt(hex[1], 16)
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${clamped.toFixed(3)})`
  }

  private paintBase(shape: Shape): void {
    this.ctx.fillStyle = this.dazzledFill(shape, shape.brightness ?? 0)
    this.ctx.beginPath()
    if (shape.kind === "oval") {
      const { x, y, width, height } = shape.bounds
      const rx = width / 2
      const ry = height / 2
      this.ctx.ellipse(x + rx, y + ry, rx, ry, shape.angle, 0, 2 * Math.PI)
    } else {
      const { x, y, width, height } = shape.bounds
      this.ctx.save()
      // Center-pivoted (not corner-pivoted) to match oval rotation (ctx.ellipse's rotation
      // parameter is inherently center-pivoted) and the selection handles below.
      this.ctx.translate(x + width / 2, y + height / 2)
      this.ctx.rotate(shape.angle)
      this.ctx.translate(-width / 2, -height / 2)
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

  /** Draws from ShapeHandles.handlePointsFor's canvas-space (already-rotated) points — the same
   * source of truth ShapeHandles.hitTestHandle uses — so rendering and hit-testing can never
   * disagree. No ctx.rotate needed here: the outline is a path through the 4 (already-rotated)
   * corner points, and handle squares stay upright at their (rotated) position, matching
   * Figma/PowerPoint-style resize handles rather than rotating into diamonds. */
  private paintSelectionHandles(shape: Shape): void {
    this.paintHandleFrame(ShapeHandles.handlePointsFor(shape), { includeRotate: true })
    // Vertex handles are drawn ON TOP of (in addition to, not instead of) the bbox resize/rotate
    // handles above — the two are functionally distinct (bbox = scale the whole shape, vertex =
    // reshape one corner) and Figma/Illustrator-style editors commonly show both kinds of handle
    // at once, so there's no need to pick one over the other. A round marker (not the bbox
    // handles' own square) keeps the two visually distinguishable at a glance.
    if (shape.kind === "polygon") this.paintVertexHandles(shape)
  }

  private paintVertexHandles(shape: Shape & { kind: "polygon" }): void {
    this.ctx.fillStyle = "#39f"
    for (const point of ShapeHandles.vertexPointsFor(shape)) {
      this.ctx.beginPath()
      this.ctx.ellipse(point.x, point.y, VERTEX_HANDLE_RADIUS, VERTEX_HANDLE_RADIUS, 0, 0, 2 * Math.PI)
      this.ctx.fill()
    }
  }

  /** Thin outline only (no handle squares) — drawn for each individually-selected shape when a
   * multi-selection/group of >1 is active, so the user can see which shapes are included, while
   * the actual resize handles live on the shared group bbox instead (see paintGroupHandles). */
  paintMemberOutline(shape: Shape): void {
    this.paintOutline(ShapeHandles.handlePointsFor(shape))
  }

  /** The selection indicator alone, with no shape under it — for a shape the 3D scene has already
   * stood up (see UfoElement.paintsShapes). Selection is an editing affordance and lives on the
   * overlay, where the pointer works; the shape itself is in the scene. */
  paintSelectionOnly(shape: Shape): void {
    this.paintSelectionHandles(shape)
  }

  /**
   * The outline of a picture of the place being lined up, and the landmarks named on it — the
   * selection indicator of a picture, where a shape's is its handles (see
   * SightingEditorElement.paintPictureOverlay). A dashed frame through the picture's four corners
   * as the scene projects them, so that a turned or rolled picture shows its actual edge; each
   * landmark as a ring where it is on the picture and a dot where it is in the render, the two
   * joined, so that a landmark that does not fit shows as a gap. A landmark whose picture half is
   * named and whose render half is not yet is a ring alone.
   */
  paintPictureFrame(
    corners: { x: number; y: number }[] | undefined,
    landmarks: { picture: { x: number; y: number }; scene?: { x: number; y: number }; label: string; selected: boolean; residualDeg?: number }[],
    hint?: string
  ): void {
    const ctx = this.ctx
    ctx.save()
    if (corners && corners.length === 4) {
      ctx.strokeStyle = "#39f"
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(corners[0]!.x, corners[0]!.y)
      for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y)
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
    }
    for (const landmark of landmarks) {
      // Its colour is its fit: green within a degree, orange within three, red beyond — so that the
      // landmark to go back to is the one that stands out. The selected one is bolder, with a white
      // rim, the way a selected shape's handles stand out from the others.
      const colour = CanvasRenderer.landmarkColour(landmark.residualDeg)
      const weight = landmark.selected ? 3 : 2
      if (landmark.selected) {
        ctx.strokeStyle = "#fff"
        ctx.lineWidth = weight + 3
        ctx.beginPath()
        ctx.ellipse(landmark.picture.x, landmark.picture.y, VERTEX_HANDLE_RADIUS + 2, VERTEX_HANDLE_RADIUS + 2, 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
      if (landmark.scene) {
        ctx.strokeStyle = colour
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(landmark.picture.x, landmark.picture.y)
        ctx.lineTo(landmark.scene.x, landmark.scene.y)
        ctx.stroke()
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.ellipse(landmark.scene.x, landmark.scene.y, VERTEX_HANDLE_RADIUS, VERTEX_HANDLE_RADIUS, 0, 0, 2 * Math.PI)
        ctx.fill()
      }
      ctx.strokeStyle = colour
      ctx.lineWidth = weight
      ctx.beginPath()
      ctx.ellipse(landmark.picture.x, landmark.picture.y, VERTEX_HANDLE_RADIUS + 2, VERTEX_HANDLE_RADIUS + 2, 0, 0, 2 * Math.PI)
      ctx.stroke()
      // Its number, or its name, beside the ring — what ties the ring to the list's own row.
      this.paintLabel(landmark.label, landmark.picture.x + VERTEX_HANDLE_RADIUS + 5, landmark.picture.y - VERTEX_HANDLE_RADIUS - 2, colour)
    }
    // What the next click does, on the canvas it does it on — a status line under the fields is
    // not where the eyes are while pointing.
    if (hint) this.paintLabel(hint, 8, 8, "#fff", 13)
    ctx.restore()
  }

  /** Within a degree the landmark fits; within three it is worth a look; beyond, it is wrong or
   * the picture cannot fit. Unknown (a landmark still being named) reads as "worth a look". */
  static landmarkColour(residualDeg: number | undefined): string {
    if (residualDeg === undefined) return "#ffb000"
    if (residualDeg <= 1) return "#3c3"
    if (residualDeg <= 3) return "#ffb000"
    return "#f33"
  }

  /** Legible text over any picture: dark backing, light face. */
  private paintLabel(text: string, x: number, y: number, colour: string, size = 11): void {
    const ctx = this.ctx
    ctx.save()
    ctx.font = `${size}px system-ui, sans-serif`
    ctx.textBaseline = "top"
    const width = ctx.measureText(text).width
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.fillRect(x - 3, y - 2, width + 6, size + 4)
    ctx.fillStyle = colour
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  /** The shared 8 resize-corner handles + rotate stem/circle + outline for a multi-shape
   * selection's bounding box — see ShapeGroup.resize/rotate for what dragging each does. */
  paintGroupHandles(bounds: ShapeBounds): void {
    this.paintHandleFrame(ShapeHandles.handlePointsFor({ bounds, angle: 0 }), { includeRotate: true })
  }

  private paintOutline(points: Record<HandleId, { x: number; y: number }>): void {
    this.ctx.strokeStyle = "lightgray"
    this.ctx.beginPath()
    this.ctx.moveTo(points.nw.x, points.nw.y)
    this.ctx.lineTo(points.ne.x, points.ne.y)
    this.ctx.lineTo(points.se.x, points.se.y)
    this.ctx.lineTo(points.sw.x, points.sw.y)
    this.ctx.closePath()
    this.ctx.stroke()
  }

  private paintHandleFrame(points: Record<HandleId, { x: number; y: number }>, { includeRotate }: { includeRotate: boolean }): void {
    this.paintOutline(points)
    this.ctx.fillStyle = "lightgray"
    for (const id of RESIZE_HANDLE_IDS) {
      const p = points[id]
      this.ctx.fillRect(p.x - HALF_CORNER_SIZE, p.y - HALF_CORNER_SIZE, CORNER_SIZE, CORNER_SIZE)
    }
    if (!includeRotate) return
    this.ctx.beginPath()
    this.ctx.moveTo(points.n.x, points.n.y)
    this.ctx.lineTo(points.rotate.x, points.rotate.y)
    this.ctx.stroke()
    this.ctx.beginPath()
    this.ctx.ellipse(points.rotate.x, points.rotate.y, HALF_CORNER_SIZE + 1, HALF_CORNER_SIZE + 1, 0, 0, 2 * Math.PI)
    this.ctx.fill()
  }
}
