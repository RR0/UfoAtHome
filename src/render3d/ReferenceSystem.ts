import { BackSide, LinearFilter, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Texture, VideoTexture } from "three"
import type { Camera, Quaternion, Scene, Vector3 } from "three"
import type { ReferenceRegistration, SceneReference } from "../engine/model/Reference.js"
import { ReferenceTimeline } from "../engine/reference/ReferenceTimeline.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import { PictureFetch, PictureFetchError } from "../engine/reference/PictureFetch.js"
import type { PictureFailure } from "../engine/reference/PictureFetch.js"

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

/** A picture's pixels, once they have arrived: for a video, the element they keep coming from. */
export interface ReferencePixels {
  texture: Texture
  width: number
  height: number
  video?: ReferenceVideoElement
}

/** What a video's element has to answer to here — all that the tests stand in for. */
export type ReferenceVideoElement = Pick<HTMLVideoElement, "currentTime" | "duration" | "paused" | "playbackRate" | "seeking" | "pause" | "play">

/** Where the timeline stands, for what follows it — see ReferenceSystem.setTime. */
export interface ReferenceClock {
  /** The instant, milliseconds of the timeline. */
  t: number
  playing: boolean
  /** How many of the timeline's milliseconds pass in one real one (see ReferenceTimeline). */
  timeScale: number
}

/**
 * The pictures of the place, standing in the scene at the direction each was registered in.
 *
 * A photo is a flat panel perpendicular to its own optical axis, sized so that it subtends
 * exactly its registered vertical field at its distance, and its horizontal field follows from
 * its pixels' own aspect: that IS a rectilinear picture, which is what a lens makes. Rendered under
 * whatever projection the instrument declares, the panel is resampled the same way everything else
 * in the scene is, so an eye-observer recording (equidistant) and a photographer's (rectilinear)
 * both lay the picture over their own picture correctly — that is the reason to stand it in the
 * scene rather than lay an <img> over the canvas, which would only ever be right for the one
 * projection and the one heading the picture happened to share with the current view.
 *
 * A panorama is the inside of a sphere, its equirectangular columns mapped to azimuth and rows to
 * altitude, with its centre column at the registered heading.
 *
 * Both are anchored to the eye: a picture is a field of directions from where it was taken, and
 * the reconstruction stands it at the observer's own eye, which is where a picture of "what the
 * observer saw" is worth comparing. A observer who walks away from the spot would take the picture
 * with them, which is right for the far landscape and wrong for the near — so a picture that states
 * where it was taken from (SceneReference.from) fades out as they leave that point: see presenceAt.
 *
 * A video is a photo panel that follows the timeline (see setTime): the frame of the instant, pointed as its camera was then. Only shown
 * during its own stretch, and silent: what is heard is the scene's.
 */
export class ReferenceSystem {
  private readonly meshes = new Map<string, Mesh<PlaneGeometry | SphereGeometry, MeshBasicMaterial>>()
  /** What each mesh was built from — rebuilt only when the picture or its registration changes. */
  private readonly signatures = new Map<string, string>()
  /** Each picture's own pixels, once they have arrived — the aspect a photo panel is sized from. */
  private readonly images = new Map<string, ReferencePixels>()
  private readonly loading = new Map<string, Promise<void>>()
  /** Addresses whose bytes could not be had, and why — not asked for again every tick. */
  private readonly failed = new Map<string, PictureFailure>()
  private references: SceneReference[] = []
  private views = new Map<string, ReferenceView>()
  private shown = true
  /** Where the observer is, for the fade of a picture left behind — see presenceAt. */
  private observerAt?: { lat: number; lng: number }
  private clock: ReferenceClock = { t: 0, playing: false, timeScale: 1 }

  /**
   * Within this many metres of where a picture was taken, it is shown as is: the precision an
   * investigation can give a spot on the ground, and a step or two of the observer turning round.
   */
  static readonly PRESENT_WITHIN_M = 2
  /**
   * From this many metres away it is gone. A picture of a field and a wood a few hundred metres
   * off is still roughly right twenty metres from its spot (a few degrees on its near landmarks),
   * and plainly wrong beyond; anything in its foreground was wrong long before.
   */
  static readonly GONE_BEYOND_M = 20

  /**
   * How much of a picture's opacity still applies with the observer at `observer`: 1 on the spot it
   * was taken from, 0 far enough from it, a smooth fade between — and 1 when either point is
   * unknown, since fading a picture nobody placed would be guessing.
   */
  static presenceAt(reference: SceneReference, observer?: { lat: number; lng: number }): number {
    if (!reference.from || !observer) return 1
    const away = geoToLocalMeters(observer.lat, observer.lng, reference.from.lat, reference.from.lng)
    const distanceM = Math.hypot(away.x, away.z)
    const x = (distanceM - ReferenceSystem.PRESENT_WITHIN_M) / (ReferenceSystem.GONE_BEYOND_M - ReferenceSystem.PRESENT_WITHIN_M)
    const clamped = Math.min(Math.max(x, 0), 1)
    return 1 - clamped * clamped * (3 - 2 * clamped)
  }

  constructor(
    private readonly scene: Scene,
    /** Called once a picture's bytes have arrived, so the frame that was drawn without it is
     * drawn again. */
    private readonly onImageLoaded: () => void,
    /** How a picture's bytes are fetched — injectable for the tests, which have no network. */
    private readonly loadImage: (src: string) => Promise<ReferencePixels> = ReferenceSystem.fetchImage,
    /** How a video is opened — injectable as well. Told what to call when it has a new frame to show or has finished a jump. */
    private readonly loadVideo: (src: string, onFrame: () => void) => Promise<ReferencePixels> = ReferenceSystem.openVideo
  ) {}

  /** Replaces the set whole, so a picture that left the recording leaves the scene. */
  set(references: SceneReference[], views: Map<string, ReferenceView> = this.views, observerAt?: { lat: number; lng: number }): void {
    this.references = references
    this.observerAt = observerAt
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
      if (reference && reference.src === (image.texture.userData.src as string) && (reference.kind === "video") === (image.video !== undefined)) continue
      ReferenceSystem.release(image)
      this.images.delete(id)
      // Its panel goes with it: a picture whose new address cannot be read must not go on showing the one it replaced.
      const mesh = this.meshes.get(id)
      if (mesh) {
        this.dispose(mesh)
        this.meshes.delete(id)
        this.signatures.delete(id)
      }
    }
    for (const reference of references) {
      const image = this.images.get(reference.id)
      if (!image) {
        this.load(reference)
        continue
      }
      this.build(reference, image)
    }
    this.follow()
  }

  /**
   * Where the timeline stands: what a video shows and which way it points depend on it. Cheap to call at every tick, and it costs nothing
   * to a recording whose pictures do not move.
   */
  setTime(clock: ReferenceClock): void {
    this.clock = clock
    this.follow()
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

  /** The layer they are on — see REFERENCE_LAYER. */
  readonly layer = REFERENCE_LAYER

  /** Whether anything is standing, so a frame with no picture skips their pass. */
  get any(): boolean {
    for (const mesh of this.meshes.values()) if (mesh.visible) return true
    return false
  }

  /**
   * Stands every picture at the eye — called right before the scene is drawn, by whoever owns the
   * camera (see SceneRenderer.renderOnce), since the eye moves with the observer.
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
    const registration = ReferenceTimeline.registrationAt(reference, this.clock.t)
    const halfHeight = Math.tan((registration.fovDeg / 2) * DEG_TO_RAD)
    const halfWidth = halfHeight * aspect
    // In the panel's own frame: +x right, +y up, looking down -z.
    into.set((u * 2 - 1) * halfWidth, (1 - v * 2) * halfHeight, -1).normalize()
    return into.applyQuaternion(ReferenceSystem.orientation(registration))
  }

  /** A loaded picture's own width over its height — what lining it up needs, undefined until its
   * bytes have arrived. */
  aspectOf(id: string): number | undefined {
    const image = this.images.get(id)
    return image ? image.width / image.height : undefined
  }

  /** Why a picture's bytes could not be had, if they could not — what the editor tells its author. */
  failureOf(src: string): PictureFailure | undefined {
    return this.failed.get(src)
  }

  /** Each moving picture's frame as it stands: what is shown, and which way it points. */
  private follow(): void {
    for (const reference of this.references) {
      const mesh = this.meshes.get(reference.id)
      const video = this.images.get(reference.id)?.video
      if (video) this.sync(reference, video)
      if (!mesh) continue
      if (reference.registrationTrack?.length) ReferenceSystem.point(mesh, reference, ReferenceTimeline.registrationAt(reference, this.clock.t))
      if (reference.kind === "video") this.applyOpacity(mesh, reference.id)
    }
  }

  /** Tells a video what to do for the frame the timeline is at — see ReferenceTimeline.command. */
  private sync(reference: SceneReference, video: ReferenceVideoElement): void {
    const seconds = ReferenceTimeline.mediaSecondsAt(reference, this.clock.t, this.clock.timeScale, Number.isFinite(video.duration) ? video.duration : undefined)
    if (seconds === undefined) {
      if (!video.paused) video.pause()
      return
    }
    const command = ReferenceTimeline.command(video.currentTime, seconds, this.clock.playing, ReferenceTimeline.rateOf(reference))
    video.playbackRate = command.rate
    // A jump under way is not asked for again at every tick: its end asks again (see openVideo), from wherever the timeline has got to.
    if (command.seekS !== undefined && !video.seeking) video.currentTime = command.seekS
    if (command.play && video.paused) void video.play().catch(() => undefined)
    if (!command.play && !video.paused) video.pause()
  }

  private load(reference: SceneReference): void {
    const src = reference.src
    if (this.loading.has(reference.id) || this.failed.has(src)) return
    const isVideo = reference.kind === "video"
    const arriving = isVideo ? this.loadVideo(src, () => this.onVideoFrame()) : this.loadImage(src)
    const promise = arriving.then(image => {
      this.loading.delete(reference.id)
      // The recording may have moved on while the bytes were on their way.
      const current = this.references.find(candidate => candidate.id === reference.id)
      if (!current || current.src !== src || (current.kind === "video") !== isVideo) {
        ReferenceSystem.release(image)
        return
      }
      image.texture.userData.src = src
      this.images.set(reference.id, image)
      this.build(current, image)
      this.follow()
      this.onImageLoaded()
    }, error => {
      this.loading.delete(reference.id)
      this.failed.set(src, PictureFetch.failureOf(error))
      // Told as a picture's arrival is, so that whoever shows the pictures' state can say why this one is not there.
      this.onImageLoaded()
    })
    this.loading.set(reference.id, promise)
  }

  /** A video has a new frame, or has finished a jump: from where the timeline has got to meanwhile, and drawn. */
  private onVideoFrame(): void {
    this.follow()
    this.onFrame?.()
  }

  /** Called when a video has a new frame to draw, which no tick of a paused timeline is coming to draw. */
  onFrame?: () => void

  /** Opens a video across origins, as WebGL insists, and says why not if it cannot be read. */
  private static openVideo(src: string, onFrame: () => void): Promise<ReferencePixels> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.muted = true
      video.playsInline = true
      video.preload = "auto"
      video.addEventListener("loadeddata", () => {
        const texture = new VideoTexture(video)
        texture.colorSpace = SRGBColorSpace
        texture.minFilter = LinearFilter
        texture.magFilter = LinearFilter
        texture.generateMipmaps = false
        video.addEventListener("seeked", onFrame)
        // After three's own callback, which marks the texture: what was drawn then has the new frame.
        const presented = () => {
          if (video.paused) onFrame()
          if (video.src) video.requestVideoFrameCallback(presented)
        }
        if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(presented)
        resolve({ texture, width: video.videoWidth, height: video.videoHeight, video })
      }, { once: true })
      video.addEventListener("error", () => {
        void PictureFetch.whyVideoUnread(src).then(failure => reject(new PictureFetchError(src, failure)))
      }, { once: true })
      video.src = src
    })
  }

  /** Lets go of a picture's pixels: a video element keeps its file and its decoder until it is emptied. */
  private static release(image: ReferencePixels): void {
    image.texture.dispose()
    const video = image.video as HTMLVideoElement | undefined
    if (!video) return
    video.pause()
    video.removeAttribute?.("src")
    video.load?.()
  }

  /** Fetches the picture's bytes — across origins, which WebGL insists on being allowed — the same
   * way the terrain's imagery is fetched (see xyzImageryRaster). */
  private static async fetchImage(src: string): Promise<ReferencePixels> {
    const blob = await PictureFetch.blob(src)
    // Flipped as it is decoded, and told so: a bitmap cannot be turned over on its way to the GPU
    // the way a plain image is (UNPACK_FLIP_Y is ignored for one), and a texture that still asks
    // for it lands upside down — what three's own ImageBitmapLoader does, for the same reason.
    const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" }).catch(() => {
      throw new PictureFetchError(src, { kind: "notPicture" })
    })
    const texture = new Texture(bitmap)
    texture.flipY = false
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return { texture, width: bitmap.width, height: bitmap.height }
  }

  private build(reference: SceneReference, image: ReferencePixels): void {
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
    ReferenceSystem.point(mesh, reference, ReferenceTimeline.registrationAt(reference, this.clock.t))
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
  private static orientation({ headingDeg, pitchDeg, rollDeg }: ReferenceRegistration): Quaternion {
    const carrier = new Object3D()
    carrier.rotation.set(pitchDeg * DEG_TO_RAD, -headingDeg * DEG_TO_RAD, -(rollDeg ?? 0) * DEG_TO_RAD, "YXZ")
    return carrier.quaternion
  }

  /** Points a panel: its orientation, and its size for a field other than the one it was built at. */
  private static point(mesh: Mesh, reference: SceneReference, registration: ReferenceRegistration): void {
    mesh.quaternion.copy(ReferenceSystem.orientation(registration))
    if (reference.kind === "panorama") return
    const scale = Math.tan((registration.fovDeg / 2) * DEG_TO_RAD) / Math.tan((reference.registration.fovDeg / 2) * DEG_TO_RAD)
    mesh.scale.set(scale, scale, 1)
  }

  /** Whether a picture has something to show at this instant: a video, only during its own stretch. */
  private inTime(reference: SceneReference): boolean {
    if (reference.kind !== "video") return true
    const duration = this.images.get(reference.id)?.video?.duration
    return ReferenceTimeline.mediaSecondsAt(reference, this.clock.t, this.clock.timeScale, duration !== undefined && Number.isFinite(duration) ? duration : undefined) !== undefined
  }

  private opacityOf(id: string): number {
    const reference = this.references.find(candidate => candidate.id === id)
    if (reference && !this.inTime(reference)) return 0
    const view = this.views.get(id)
    const presence = reference ? ReferenceSystem.presenceAt(reference, this.observerAt) : 1
    return (view?.opacity ?? reference?.opacity ?? 0) * presence
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
    for (const image of this.images.values()) ReferenceSystem.release(image)
    this.images.clear()
  }
}
