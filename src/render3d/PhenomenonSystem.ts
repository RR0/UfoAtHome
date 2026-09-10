import { cloudTransmissionShader } from "./VolumetricClouds.js"
import type { VolumetricCloudLayer } from "./VolumetricClouds.js"
import { CanvasTexture, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from "three"
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
  /** Which way the witness was looking when it was there, when the recording says (BaseShape.aim).
   * Outranks the pixel: a direction is what the recording states, and it holds behind the witness's
   * back, where the pixel the overlay kept is clamped far off the canvas and means nothing. */
  aim?: { azimuthDeg: number; altitudeDeg: number }
  /** Back-to-front, the timeline's own paint order: what a later one covers of an earlier one. */
  renderOrder: number
  /** Not drawn because the phenomenon is outside the visible frame. */
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
 * The plane is placed along the direction the recording states for the shape (BaseShape.aim) — or,
 * for a recording that states none, along the ray through the shape's own centre pixel under
 * whichever projection the instrument declares (see SceneRenderer.directionAtScreenPoint), so the
 * picture lands where the overlay would have put it; and it is turned to face the camera every
 * frame, so it stays a picture and never becomes a claim about a shape in the round. A body of
 * revolution, a real model, anything with a back, is a different statement and a different
 * object (see the close-encounter form of a recording, when there is one).
 */
export class PhenomenonSystem {
  private cloudLayers: VolumetricCloudLayer[] = []
  private cloudSignature = ""

  /** Share the live layer uniforms. Only adding/removing a layer recompiles the material. */
  setCloudLayers(layers: VolumetricCloudLayer[]): void {
    const signature = layers.map(layer => layer.mesh.uuid).join(",")
    if (signature === this.cloudSignature) return
    this.cloudSignature = signature
    this.cloudLayers = layers
    for (const mesh of this.meshes.values()) this.configureCloudMaterial(mesh.material)
  }

  private configureCloudMaterial(material: MeshBasicMaterial): void {
    const layers = this.cloudLayers
    const signature = this.cloudSignature
    material.customProgramCacheKey = () => signature
    material.onBeforeCompile = shader => {
      if (!layers.length) return
      shader.vertexShader = "varying vec3 cloudPoint;\n" + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>",
        "#include <project_vertex>\ncloudPoint = (modelMatrix * vec4(transformed, 1.0)).xyz - cameraPosition;")
      let definitions = "varying vec3 cloudPoint;\n"
      let attenuation = ""
      layers.forEach((layer, index) => {
        const prefix = `cloud${index}_`
        for (const [name, uniform] of Object.entries(layer.uniforms)) shader.uniforms[prefix + name] = uniform
        definitions += cloudTransmissionShader(prefix)
        attenuation += `diffuseColor.a *= ${prefix}transmissionAt(normalize(cloudPoint), length(cloudPoint));\n`
      })
      shader.fragmentShader = definitions + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", attenuation + "#include <opaque_fragment>")
    }
    material.needsUpdate = true
  }

  private readonly meshes = new Map<string, Mesh<PlaneGeometry, MeshBasicMaterial>>()
  /** What each mesh's texture was last painted from — repainted only when the picture changes. */
  private readonly signatures = new Map<string, string>()
  private readonly extents = new Map<string, ShapeBounds>()
  private placed: PlacedPhenomenon[] = []
  private frame?: PhenomenonFrame
  private readonly direction = new Vector3()
  private readonly up = new Vector3()
  private readonly lookAt = new Matrix4()
  private readonly vertex = new Vector3()
  private readonly centre = new Vector3()
  private readonly right = new Vector3()
  private readonly above = new Vector3()

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
          new PlaneGeometry(1, 1, PhenomenonSystem.SEGMENTS, PhenomenonSystem.SEGMENTS),
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
        this.configureCloudMaterial(mesh.material)
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
   * Stands every phenomenon where its picture looks, at its distance.
   *
   * Not a flat plane, for a reason a wide shape makes visible: a flat plane spreads its texture
   * evenly in METRES, and the picture spreads its pixels evenly in ANGLE (an eye) or in the tangent
   * of one (a lens). The two agree at the edges, which is how the plane was sized, and disagree
   * everywhere between — thirteen pixels either side on a shape ninety degrees wide, an oval fatter
   * than its own handles. So the mesh is a curved patch instead: each of its vertices is put on the
   * exact ray the renderer gives the pixel that vertex carries (see
   * SceneRenderer.directionAtScreenPoint, which is the same answer for every projection), at the
   * chosen distance. The picture then lands on its own pixels, whatever its size, whatever the
   * instrument, wherever in the field it stands — including the resampling's own stretch off-axis,
   * which needs no separate correction since it is inside that answer.
   *
   * Called right before the scene is drawn, by whoever owns the camera and knows the instrument's
   * projection (see SceneRenderer.renderOnce): only the renderer has both in hand. A shape that
   * states a direction is centred where that direction falls on the picture (screenPointOf), and a
   * direction that falls nowhere on it — behind the witness — gets a flat plane facing them there,
   * which nothing will see.
   */
  place(
    camera: Camera,
    directionAtScreenPoint: (ndcX: number, ndcY: number, into: Vector3) => Vector3,
    screenPointOf: (direction: Vector3) => { ndcX: number; ndcY: number } | undefined
  ): void {
    const frame = this.frame
    if (!frame) return
    for (const phenomenon of this.placed) {
      const mesh = this.meshes.get(phenomenon.sourceId)
      if (!mesh || !mesh.visible) continue
      const extent = this.extents.get(phenomenon.sourceId)
      if (!extent) continue
      const { bounds } = phenomenon.shape
      // Where the picture has the shape's centre: the stated direction's own place on it, or the
      // box the overlay kept, in the overlay's pixels.
      let centreX = bounds.x + bounds.width / 2
      let centreY = bounds.y + bounds.height / 2
      let inFront = true
      if (phenomenon.aim) {
        const ndc = screenPointOf(PhenomenonSystem.directionOf(phenomenon.aim, this.direction))
        if (ndc && Math.abs(ndc.ndcX) < PhenomenonSystem.FURTHEST_NDC && Math.abs(ndc.ndcY) < PhenomenonSystem.FURTHEST_NDC) {
          centreX = ((ndc.ndcX + 1) / 2) * frame.canvasWidthPx
          centreY = ((1 - ndc.ndcY) / 2) * frame.canvasHeightPx
        } else {
          inFront = false
        }
      }
      if (inFront) {
        this.curve(mesh, camera, directionAtScreenPoint, frame, extent, centreX, centreY, phenomenon.distanceM)
      } else {
        this.flat(mesh, camera, frame, extent, phenomenon.distanceM)
      }
    }
  }

  /** How far off the picture a centre may fall and still be built from its pixels — a shape half
   * out of the frame is still built from the frame's own rays; one behind the witness is not. */
  private static readonly FURTHEST_NDC = 4

  /** The patch: its vertices on the rays of the pixels they carry — see place. */
  private curve(
    mesh: Mesh<PlaneGeometry, MeshBasicMaterial>,
    camera: Camera,
    directionAtScreenPoint: (ndcX: number, ndcY: number, into: Vector3) => Vector3,
    frame: PhenomenonFrame,
    extent: ShapeBounds,
    centreX: number,
    centreY: number,
    distanceM: number
  ): void {
    // The extent is centred on the shape's box (see CanvasRenderer.paintExtent), so its corner
    // relative to the centre is the same wherever the centre is put.
    const left = centreX - extent.width / 2
    const top = centreY - extent.height / 2
    const positions = mesh.geometry.attributes.position
    const segments = PhenomenonSystem.SEGMENTS
    let index = 0
    for (let row = 0; row <= segments; row++) {
      const py = top + (row / segments) * extent.height
      for (let column = 0; column <= segments; column++) {
        const px = left + (column / segments) * extent.width
        directionAtScreenPoint((px / frame.canvasWidthPx) * 2 - 1, -((py / frame.canvasHeightPx) * 2 - 1), this.direction)
        this.vertex.copy(camera.position).addScaledVector(this.direction, distanceM)
        positions.setXYZ(index++, this.vertex.x, this.vertex.y, this.vertex.z)
      }
    }
    positions.needsUpdate = true
    // Vertices are in world space: the mesh itself stays at the origin, untransformed.
    mesh.matrixAutoUpdate = false
    mesh.matrix.identity()
    mesh.matrixWorldNeedsUpdate = true
    // What place() is still asked about by the tests and the far-plane check: the extent the patch
    // spans, in metres, as a flat plane at that distance would.
    mesh.scale.set(
      ApparentSize.sizeMAt(distanceM, frame.projection.pxToDeg(extent.width)),
      ApparentSize.sizeMAt(distanceM, frame.projection.pxToDeg(extent.height)),
      1
    )
  }

  /** The fallback for a direction behind the witness: a flat plane facing them along it, sized on
   * axis. Nothing will see it, but it is where the thing IS. */
  private flat(mesh: Mesh<PlaneGeometry, MeshBasicMaterial>, camera: Camera, frame: PhenomenonFrame, extent: ShapeBounds, distanceM: number): void {
    const positions = mesh.geometry.attributes.position
    const segments = PhenomenonSystem.SEGMENTS
    const widthM = ApparentSize.sizeMAt(distanceM, frame.projection.pxToDeg(extent.width))
    const heightM = ApparentSize.sizeMAt(distanceM, frame.projection.pxToDeg(extent.height))
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    this.centre.copy(camera.position).addScaledVector(this.direction, distanceM)
    this.lookAt.lookAt(camera.position, this.centre, this.up)
    this.right.setFromMatrixColumn(this.lookAt, 0)
    this.above.setFromMatrixColumn(this.lookAt, 1)
    let index = 0
    for (let row = 0; row <= segments; row++) {
      const v = 0.5 - row / segments
      for (let column = 0; column <= segments; column++) {
        const u = column / segments - 0.5
        this.vertex.copy(this.centre).addScaledVector(this.right, u * widthM).addScaledVector(this.above, v * heightM)
        positions.setXYZ(index++, this.vertex.x, this.vertex.y, this.vertex.z)
      }
    }
    positions.needsUpdate = true
    mesh.matrixAutoUpdate = false
    mesh.matrix.identity()
    mesh.matrixWorldNeedsUpdate = true
    mesh.scale.set(widthM, heightM, 1)
  }

  /** Vertices a side of the patch has. Sixteen keeps a ninety-degree shape within a pixel of its
   * picture; a small shape wastes nothing worth counting. */
  private static readonly SEGMENTS = 16

  /** A stated direction as a world vector: east is +x, up is +y, north is -z — the decor's own
   * convention (DecorObject.eastM/northM). */
  static directionOf(aim: { azimuthDeg: number; altitudeDeg: number }, into: Vector3): Vector3 {
    const azimuth = (aim.azimuthDeg * Math.PI) / 180
    const altitude = (aim.altitudeDeg * Math.PI) / 180
    return into.set(Math.sin(azimuth) * Math.cos(altitude), Math.sin(altitude), -Math.cos(azimuth) * Math.cos(altitude))
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
