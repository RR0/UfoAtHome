import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from "three"
import type { Camera, Scene } from "three"
import type { Shape, ShapeBounds } from "../engine/shape/Shape.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { ApparentSize } from "../engine/shape/ApparentSize.js"
import type { ImageProjection } from "../engine/instrument/ImageProjection.js"

/**
 * One phenomenon as the scene is to stand it up at one instant — everything the recording and the
 * depth rule decided, in the picture's own pixels, and nothing about how to draw it.
 */
export interface PlacedPhenomenon {
  sourceId: string
  /** The shape as the overlay would have painted it: canvas pixels, the reader's own turn of the
   * view and the witness's gait already applied (see UfoElement.frameShiftPx). */
  shape: Shape
  /** How far along its line of sight it is drawn — see PhenomenonDepth for where that comes from. */
  distanceM: number
  /** Back-to-front, the timeline's own paint order: what a later one covers of an earlier one. */
  renderOrder: number
  /** Not drawn at all — the witness said it was behind cloud, and the cloud deck is up. */
  hidden: boolean
}

/** The picture the phenomena are drawn into — the same projection the overlay used, so a shape's
 * pixels mean the same direction on both. */
export interface PhenomenonFrame {
  projection: ImageProjection
  /** The overlay canvas's own size, in the pixels `PlacedPhenomenon.shape.bounds` are in. */
  canvasWidthPx: number
  canvasHeightPx: number
  /** Device pixels per canvas pixel on the picture being rendered — what the texture is painted at,
   * so a shape is as sharp in the scene as it was on the overlay. */
  scale: number
  /** The instrument's own spike count and roll, which the painter needs — see CanvasRenderer. */
  starPoints: number
  rollRad: number
}

/**
 * The layer the phenomena are on, and the ONLY layer they are on: the main pass does not draw
 * them at all. They are drawn by SceneRenderer.renderPhenomenaPass afterwards, tested against a
 * depth that holds the decor alone — see there for why the ground must not hide them.
 */
export const PHENOMENON_LAYER = 2
/** Back-to-front among themselves, the timeline's own order — nothing else is drawn in their pass. */
const PHENOMENON_RENDER_ORDER = 5
/** No texture side longer than this — a shape filling the frame on a large screen at three device
 * pixels a canvas pixel is more than any GPU needs of a soft-edged blob. */
const MAX_TEXTURE_PX = 2048

/**
 * The witness's own phenomena, standing IN the three.js scene rather than painted over it.
 *
 * Each is a plane facing the witness, at the distance PhenomenonDepth chose, scaled so that it
 * subtends exactly the angle the recording states — which makes it look the same from the witness's
 * eye at any distance, and is what lets the distance be a parameter. What the plane carries is the
 * very picture the 2D overlay used to paint: the same CanvasRenderer draws the same halo, blur,
 * veil and spikes into a texture, so nothing about the shape's appearance changed hands. What did
 * change is who decides what hides it: the depth buffer, per pixel, against the decor standing in
 * the same scene — a patrol car in front of it hides exactly the part of it a patrol car would.
 *
 * The plane is placed along the ray through the shape's own centre pixel, under whichever
 * projection the recording's instrument declares (see SceneRenderer.directionAtScreenPoint), so
 * the picture lands where the overlay would have put it; and it is turned to face the camera every
 * frame, so it stays a picture and never becomes a claim about a shape in the round. A body of
 * revolution, a real model, anything with a back, is a different statement and a different
 * object (see the close-encounter form of a recording, when there is one).
 */
export class PhenomenonSystem {
  private readonly meshes = new Map<string, Mesh<PlaneGeometry, MeshBasicMaterial>>()
  /** What each mesh's texture was last painted from — repainted only when the picture changes. */
  private readonly signatures = new Map<string, string>()
  private readonly extents = new Map<string, ShapeBounds>()
  private placed: PlacedPhenomenon[] = []
  private frame?: PhenomenonFrame
  private readonly direction = new Vector3()

  constructor(private readonly scene: Scene) {}

  /** What stands in the scene at this instant — see PlacedPhenomenon. Replaces the previous set
   * whole, so a phenomenon that left the recording leaves the scene. */
  set(placed: PlacedPhenomenon[], frame: PhenomenonFrame): void {
    this.placed = placed
    this.frame = frame
    const wanted = new Set(placed.map(phenomenon => phenomenon.sourceId))
    for (const [sourceId, mesh] of this.meshes) {
      if (wanted.has(sourceId)) continue
      this.dispose(mesh)
      this.meshes.delete(sourceId)
      this.signatures.delete(sourceId)
      this.extents.delete(sourceId)
    }
    for (const phenomenon of placed) {
      let mesh = this.meshes.get(phenomenon.sourceId)
      if (!mesh) {
        mesh = new Mesh(
          new PlaneGeometry(1, 1),
          new MeshBasicMaterial({
            transparent: true,
            // Tested against the decor's depth, never written: the plane is mostly empty around
            // its body, and a transparent corner must not hide the rain behind it.
            depthWrite: false,
            depthTest: true,
            // Neither the fog nor the tone curve: the phenomenon states its own colour, as the
            // overlay did, and the distance it is drawn at is a parameter of the picture, not a
            // fact the air between could act on.
            fog: false,
            toneMapped: false
          })
        )
        mesh.frustumCulled = false
        mesh.layers.set(PHENOMENON_LAYER)
        this.scene.add(mesh)
        this.meshes.set(phenomenon.sourceId, mesh)
      }
      mesh.renderOrder = PHENOMENON_RENDER_ORDER + phenomenon.renderOrder
      mesh.visible = !phenomenon.hidden && phenomenon.shape.transparency < 1
      if (mesh.visible) this.paint(mesh, phenomenon, frame)
    }
  }

  /**
   * Stands every plane where its shape's centre pixel looks, at its distance, facing the camera.
   *
   * Called right before the scene is drawn, by whoever owns the camera and knows the instrument's
   * projection (see SceneRenderer.renderOnce): the direction a pixel stands for depends on both,
   * and only the renderer has both in hand.
   */
  place(camera: Camera, directionAtScreenPoint: (ndcX: number, ndcY: number, into: Vector3) => Vector3): void {
    const frame = this.frame
    if (!frame) return
    for (const phenomenon of this.placed) {
      const mesh = this.meshes.get(phenomenon.sourceId)
      if (!mesh || !mesh.visible) continue
      const extent = this.extents.get(phenomenon.sourceId)
      if (!extent) continue
      const { bounds } = phenomenon.shape
      const ndcX = ((bounds.x + bounds.width / 2) / frame.canvasWidthPx) * 2 - 1
      const ndcY = -(((bounds.y + bounds.height / 2) / frame.canvasHeightPx) * 2 - 1)
      directionAtScreenPoint(ndcX, ndcY, this.direction)
      mesh.position.copy(camera.position).addScaledVector(this.direction, phenomenon.distanceM)
      // Facing the camera, and rolled with it: the texture is the picture in the picture's own
      // pixels, so the plane is the image plane, wherever that is looking and however it is held.
      mesh.quaternion.copy(camera.quaternion)
      // The plane subtends what its texture's box subtends — the on-axis conversion the overlay
      // itself used, read back into metres at this distance.
      mesh.scale.set(
        ApparentSize.sizeMAt(phenomenon.distanceM, frame.projection.pxToDeg(extent.width)),
        ApparentSize.sizeMAt(phenomenon.distanceM, frame.projection.pxToDeg(extent.height)),
        1
      )
    }
  }

  /** Whether anything at all is standing, so a frame with no phenomenon skips their pass. */
  get any(): boolean {
    for (const mesh of this.meshes.values()) if (mesh.visible) return true
    return false
  }

  /** How far the furthest plane stands, metres — for the camera's far plane. */
  get furthestM(): number {
    return this.placed.reduce((furthest, phenomenon) => Math.max(furthest, phenomenon.distanceM), 0)
  }

  /** Repaints the texture of `mesh` from `phenomenon`'s shape, unless the picture is the one it
   * already carries. The shape's own position is left out of the signature on purpose: a thing
   * moving across the sky is the same picture in a different place. */
  private paint(mesh: Mesh<PlaneGeometry, MeshBasicMaterial>, phenomenon: PlacedPhenomenon, frame: PhenomenonFrame): void {
    const { shape } = phenomenon
    const extent = CanvasRenderer.paintExtent(shape)
    this.extents.set(phenomenon.sourceId, extent)
    const signature = PhenomenonSystem.signatureOf(shape, frame)
    if (this.signatures.get(phenomenon.sourceId) === signature && mesh.material.map) return
    this.signatures.set(phenomenon.sourceId, signature)
    const scale = Math.min(frame.scale, MAX_TEXTURE_PX / Math.max(extent.width, extent.height, 1))
    const width = Math.max(1, Math.ceil(extent.width * scale))
    const height = Math.max(1, Math.ceil(extent.height * scale))
    const previous = mesh.material.map
    const canvas = (previous?.image as HTMLCanvasElement | undefined) ?? document.createElement("canvas")
    // A texture whose canvas changed SIZE is a new texture, not an update of the old one: the GPU
    // storage was allocated at the first size, and a re-upload into it of a bigger picture fails
    // silently — which is how an approaching craft, painted small at the start and large at the
    // end, went on showing the start (or nothing) at the end, and how a shape rotated in the
    // editor kept its old outline under new handles. Same canvas, fresh texture.
    const resized = canvas.width !== width || canvas.height !== height
    if (resized) {
      canvas.width = width
      canvas.height = height
    }
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, width, height)
    const painter = new CanvasRenderer(context)
    painter.setStarPoints(frame.starPoints)
    painter.setRoll(frame.rollRad)
    painter.paintInto(shape, extent, scale)
    if (previous && !resized) {
      previous.needsUpdate = true
      return
    }
    previous?.dispose()
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.generateMipmaps = false
    mesh.material.map = texture
    mesh.material.needsUpdate = true
  }

  /** Everything paintShape reads, except where the shape is. */
  private static signatureOf(shape: Shape, frame: PhenomenonFrame): string {
    const { bounds } = shape
    return JSON.stringify([
      shape.kind,
      Math.round(bounds.width * 10),
      Math.round(bounds.height * 10),
      shape.color,
      shape.angle,
      shape.transparency,
      shape.haloScale,
      shape.blur ?? 0,
      shape.brightness ?? 0,
      shape.kind === "polygon" ? shape.points : undefined,
      frame.scale,
      frame.starPoints,
      frame.rollRad
    ])
  }

  private dispose(mesh: Mesh<PlaneGeometry, MeshBasicMaterial>): void {
    mesh.removeFromParent()
    mesh.geometry.dispose()
    mesh.material.map?.dispose()
    mesh.material.dispose()
  }

  clear(): void {
    for (const mesh of this.meshes.values()) this.dispose(mesh)
    this.meshes.clear()
    this.signatures.clear()
    this.extents.clear()
    this.placed = []
  }
}
