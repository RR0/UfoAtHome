import { BackSide, LinearFilter, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Texture } from "three"
import type { Camera, Quaternion, Scene, Vector3 } from "three"
import type { SceneReference } from "../engine/model/Reference.js"

/**
 * The layer the pictures of the place are on, and the only one: the main pass never draws them.
 * They are drawn by SceneRenderer.renderReferencesPass after the scene and before the phenomena,
 * over everything and hidden by nothing — see SceneReference for why nothing in the scene may
 * hide a picture.
 */
export const REFERENCE_LAYER = 3

/**
 * How far the panel stands from the eye, metres. Not a fact about anything: a picture is a field
 * of directions, and a direction has no distance. Inside the sky dome's radius (see SceneRenderer's
 * SKY_RADIUS, 900 m), which is what the camera's far plane is set for; the depth test it is not
 * subjected to is what keeps the decor from mattering.
 */
const PANEL_DISTANCE_M = 800

const DEG_TO_RAD = Math.PI / 180

/** What the renderer is asked for, per picture, beyond the picture itself. */
export interface ReferenceView {
  /** The reader's own opacity, when they have moved the slider — else the recording's. */
  opacity?: number
}

/**
 * The pictures of the place, standing in the scene at the direction each was registered in.
 *
 * A photo is a flat panel perpendicular to its own optical axis, sized so that it subtends
 * exactly its registered vertical field at its distance, and its horizontal field follows from
 * its pixels' own aspect: that IS a rectilinear picture, which is what a lens makes. Rendered under
 * whatever projection the instrument declares, the panel is resampled the same way everything else
 * in the scene is, so an eye-witness recording (equidistant) and a photographer's (rectilinear)
 * both lay the picture over their own picture correctly — that is the reason to stand it in the
 * scene rather than lay an <img> over the canvas, which would only ever be right for the one
 * projection and the one heading the picture happened to share with the current view.
 *
 * A panorama is the inside of a sphere, its equirectangular columns mapped to azimuth and rows to
 * altitude, with its centre column at the registered heading.
 *
 * Both are anchored to the eye: a picture is a field of directions from where it was taken, and
 * the reconstruction stands it at the witness's own eye, which is where a picture of "what the
 * witness saw" is worth comparing. A witness who walks away from the spot takes the picture with
 * them, which is right for the far landscape and wrong for the near — a limitation stated rather
 * than hidden, since a picture from one spot cannot say what another spot saw.
 */
export class ReferenceSystem {
  private readonly meshes = new Map<string, Mesh<PlaneGeometry | SphereGeometry, MeshBasicMaterial>>()
  /** What each mesh was built from — rebuilt only when the picture or its registration changes. */
  private readonly signatures = new Map<string, string>()
  /** Each picture's own pixels, once they have arrived — the aspect a photo panel is sized from. */
  private readonly images = new Map<string, { texture: Texture; width: number; height: number }>()
  private readonly loading = new Map<string, Promise<void>>()
  /** Addresses whose bytes could not be had — not asked for again every tick. */
  private readonly failed = new Set<string>()
  private references: SceneReference[] = []
  private views = new Map<string, ReferenceView>()
  private shown = true

  constructor(
    private readonly scene: Scene,
    /** Called once a picture's bytes have arrived, so the frame that was drawn without it is
     * drawn again. */
    private readonly onImageLoaded: () => void,
    /** How a picture's bytes are fetched — injectable for the tests, which have no network. */
    private readonly loadImage: (src: string) => Promise<{ texture: Texture; width: number; height: number }> = ReferenceSystem.fetchImage
  ) {}

  /** Replaces the set whole, so a picture that left the recording leaves the scene. */
  set(references: SceneReference[], views: Map<string, ReferenceView> = this.views): void {
    this.references = references
    this.views = views
    const wanted = new Set(references.map(reference => reference.id))
    for (const [id, mesh] of this.meshes) {
      if (wanted.has(id)) continue
      this.dispose(mesh)
      this.meshes.delete(id)
      this.signatures.delete(id)
    }
    for (const [id, image] of this.images) {
      const reference = references.find(candidate => candidate.id === id)
      if (reference && reference.src === (image.texture.userData.src as string)) continue
      image.texture.dispose()
      this.images.delete(id)
    }
    for (const reference of references) {
      const image = this.images.get(reference.id)
      if (!image) {
        this.load(reference)
        continue
      }
      this.build(reference, image)
    }
  }

  /** Whether the reader has the pictures on at all — the player's own toggle. */
  setShown(shown: boolean): void {
    this.shown = shown
    for (const mesh of this.meshes.values()) mesh.visible = shown && this.opacityOf(mesh.userData.id as string) > 0
  }

  /** The reader's own opacity for one picture, over the recording's — see ReferenceView. */
  setView(id: string, view: ReferenceView): void {
    this.views.set(id, view)
    const mesh = this.meshes.get(id)
    if (mesh) this.applyOpacity(mesh, id)
  }

  /** Whether anything is standing, so a frame with no picture skips their pass. */
  get any(): boolean {
    for (const mesh of this.meshes.values()) if (mesh.visible) return true
    return false
  }

  /**
   * Stands every picture at the eye — called right before the scene is drawn, by whoever owns the
   * camera (see SceneRenderer.renderOnce), since the eye moves with the witness.
   */
  place(camera: Camera): void {
    for (const mesh of this.meshes.values()) {
      if (!mesh.visible) continue
      mesh.position.copy(camera.position)
      mesh.updateMatrixWorld()
    }
  }

  /** How far the furthest picture stands, metres — for the camera's far plane. */
  get furthestM(): number {
    return this.meshes.size > 0 ? PANEL_DISTANCE_M : 0
  }

  /**
   * Where a pixel of a photo looks, as a world direction — the test's own question, and the one
   * that decides whether the panel is right: a pixel at (u, v) of the picture (0..1 from its
   * top-left) must land on the direction a pinhole camera with that registration gives it.
   */
  directionOfPixel(reference: SceneReference, u: number, v: number, into: Vector3): Vector3 {
    const image = this.images.get(reference.id)
    const aspect = image ? image.width / image.height : 1
    const halfHeight = Math.tan((reference.registration.fovDeg / 2) * DEG_TO_RAD)
    const halfWidth = halfHeight * aspect
    // In the panel's own frame: +x right, +y up, looking down -z.
    into.set((u * 2 - 1) * halfWidth, (1 - v * 2) * halfHeight, -1).normalize()
    return into.applyQuaternion(ReferenceSystem.orientation(reference))
  }

  /** Whether a picture's bytes could not be had — what the editor tells its author. */
  failedToLoad(src: string): boolean {
    return this.failed.has(src)
  }

  private load(reference: SceneReference): void {
    const src = reference.src
    if (this.loading.has(reference.id) || this.failed.has(src)) return
    const promise = this.loadImage(src).then(image => {
      this.loading.delete(reference.id)
      // The recording may have moved on while the bytes were on their way.
      const current = this.references.find(candidate => candidate.id === reference.id)
      if (!current || current.src !== src) {
        image.texture.dispose()
        return
      }
      image.texture.userData.src = src
      this.images.set(reference.id, image)
      this.build(current, image)
      this.onImageLoaded()
    }, () => {
      this.loading.delete(reference.id)
      this.failed.add(src)
    })
    this.loading.set(reference.id, promise)
  }

  /** Fetches the picture's bytes — across origins, which WebGL insists on being allowed — the same
   * way the terrain's imagery is fetched (see xyzImageryRaster). */
  private static async fetchImage(src: string): Promise<{ texture: Texture; width: number; height: number }> {
    const response = await fetch(src)
    if (!response.ok) throw new Error(`${src}: ${response.status}`)
    // Flipped as it is decoded, and told so: a bitmap cannot be turned over on its way to the GPU
    // the way a plain image is (UNPACK_FLIP_Y is ignored for one), and a texture that still asks
    // for it lands upside down — what three's own ImageBitmapLoader does, for the same reason.
    const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: "flipY" })
    const texture = new Texture(bitmap)
    texture.flipY = false
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return { texture, width: bitmap.width, height: bitmap.height }
  }

  private build(reference: SceneReference, image: { texture: Texture; width: number; height: number }): void {
    const signature = ReferenceSystem.signatureOf(reference, image)
    let mesh = this.meshes.get(reference.id)
    if (mesh && this.signatures.get(reference.id) === signature) {
      this.applyOpacity(mesh, reference.id)
      return
    }
    if (mesh) {
      this.dispose(mesh)
      this.meshes.delete(reference.id)
    }
    mesh = new Mesh(
      ReferenceSystem.geometryOf(reference, image),
      new MeshBasicMaterial({
        map: image.texture,
        transparent: true,
        // Over everything and hidden by nothing — see SceneReference.
        depthTest: false,
        depthWrite: false,
        // A picture states its own light; neither the fog nor the tone curve may act on it.
        fog: false,
        toneMapped: false
      })
    )
    // A panorama is looked at from inside its sphere.
    if (reference.kind === "panorama") mesh.material.side = BackSide
    mesh.frustumCulled = false
    mesh.layers.set(REFERENCE_LAYER)
    mesh.userData.id = reference.id
    mesh.quaternion.copy(ReferenceSystem.orientation(reference))
    this.scene.add(mesh)
    this.meshes.set(reference.id, mesh)
    this.signatures.set(reference.id, signature)
    this.applyOpacity(mesh, reference.id)
  }

  /**
   * The panel: a plane whose height subtends the registered field at the panel's distance, and
   * whose width follows the picture's own pixels — built looking down -z, so that the mesh's
   * orientation is the registration's alone. The panorama: a sphere seen from inside, whose
   * texture's u runs with azimuth. Three's sphere puts u = 0 at +x and runs it the wrong way round
   * for a picture looked at from inside; its phiStart is turned so that the picture's centre column
   * looks down -z, where the panel's centre does, and the texture is mirrored (a negative repeat)
   * so that what was to the right of the camera is to the right of the reader.
   */
  private static geometryOf(reference: SceneReference, image: { width: number; height: number }): PlaneGeometry | SphereGeometry {
    if (reference.kind === "panorama") {
      const sphere = new SphereGeometry(PANEL_DISTANCE_M, 64, 32, Math.PI / 2, Math.PI * 2)
      const uv = sphere.attributes.uv
      for (let index = 0; index < uv.count; index++) uv.setX(index, 1 - uv.getX(index))
      uv.needsUpdate = true
      return sphere
    }
    const height = 2 * PANEL_DISTANCE_M * Math.tan((reference.registration.fovDeg / 2) * DEG_TO_RAD)
    const width = height * (image.width / Math.max(image.height, 1))
    const plane = new PlaneGeometry(width, height)
    plane.translate(0, 0, -PANEL_DISTANCE_M)
    return plane
  }

  /**
   * The registration as a rotation of the panel's own frame (looking down -z, +y up) into the
   * world: heading about the vertical (clockwise from north, so negative about +y since north is
   * -z — the decor's own convention, see DecorSystem.build), then pitch about the panel's own
   * horizontal, then roll about its own axis. Applied in that order on the object, which three
   * composes as intrinsic YXZ — the same order SceneRenderer.setObserverPose gives the camera.
   */
  private static orientation(reference: SceneReference): Quaternion {
    const { headingDeg, pitchDeg, rollDeg } = reference.registration
    const carrier = new Object3D()
    carrier.rotation.set(pitchDeg * DEG_TO_RAD, -headingDeg * DEG_TO_RAD, -(rollDeg ?? 0) * DEG_TO_RAD, "YXZ")
    return carrier.quaternion
  }

  private opacityOf(id: string): number {
    const reference = this.references.find(candidate => candidate.id === id)
    const view = this.views.get(id)
    return view?.opacity ?? reference?.opacity ?? 0
  }

  private applyOpacity(mesh: Mesh<PlaneGeometry | SphereGeometry, MeshBasicMaterial>, id: string): void {
    const opacity = this.opacityOf(id)
    mesh.material.opacity = opacity
    mesh.visible = this.shown && opacity > 0
  }

  private static signatureOf(reference: SceneReference, image: { width: number; height: number }): string {
    const { headingDeg, pitchDeg, rollDeg, fovDeg } = reference.registration
    return [reference.kind, reference.src, image.width, image.height, headingDeg, pitchDeg, rollDeg ?? 0, fovDeg].join("|")
  }

  private dispose(mesh: Mesh<PlaneGeometry | SphereGeometry, MeshBasicMaterial>): void {
    this.scene.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
  }

  disposeAll(): void {
    for (const mesh of this.meshes.values()) this.dispose(mesh)
    this.meshes.clear()
    this.signatures.clear()
    for (const image of this.images.values()) image.texture.dispose()
    this.images.clear()
  }
}
