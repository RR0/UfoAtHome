import {
  BufferGeometry,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  Points,
  Scene,
  WebGLRenderTarget,
  AdditiveBlending,
  type Object3D,
  type PerspectiveCamera,
  type PointsMaterial,
  type WebGLRenderer
} from "three"
import { PointSources } from "./PointSources.js"
import { SkyRibbons } from "./SkyRibbons.js"
import { EquidistantProjectionPass } from "./EquidistantProjectionPass.js"

/** What the layer needs to know about the scene it draws for. */
export interface PointLayerHost {
  /** Every point source (see PointSources.track) and ribbon (see SkyRibbons.track) of the scene. */
  points(): (Points | Mesh)[]
  /** The meshes of the sky that hide what is behind them by covering it: the cloud decks. */
  clouds(): Object3D[]
  /** The sky and everything in it, which is never a foreground. */
  sky: Object3D
}

/**
 * Draws the scene's point sources — stars, planets, satellites — and the ribbons of its meteors, comet
 * tails and re-entries into the eye's picture at the picture's own pixels, and tells the resampling what they add.
 *
 * WHY. The eye's picture is resampled from a render that carries about two fifths of its pixels per
 * radian at the centre (a 70 degree field; see EquidistantProjectionPass), so a star drawn into that
 * render is a point magnified two and a half times, and a bright one, flattened by the eye's response,
 * is a block with a stair at its rim. A point source has no shape of its own to lose: drawn at the
 * picture's pixels (see PointSources.outputMaterial) it is exactly as fine as the picture.
 *
 * THE COST OF DOING IT APART is that the stars are no longer drawn among the rest, where the ground
 * hid them by being in front and the clouds hid them by being drawn over them. Both are given back
 * from a small picture of the source's view: the opaque foreground drawn in black (alpha one), then
 * the cloud decks over it with their own alpha, which accumulates to the cover of the sky. A star
 * reads the cover along its own direction and shows through what is left. The picture is half the
 * source's size each way: the clouds are soft, and a star within a few pixels of the horizon's edge
 * is dimmed over that margin rather than cut, which no eye could tell from the haze there.
 *
 * Not used for a field too wide for one source (the cube path), nor for a pinhole picture, which
 * already draws its stars at its own pixels.
 */
export class PointLayerPass {
  /** The layers the foreground and the clouds are put on for the small picture of them. */
  static readonly OCCLUDER_LAYER = 6
  static readonly CLOUD_LAYER = 7
  /** Pixels of that picture, as a share of the source's, on each side. */
  private static readonly OCCLUSION_SCALE = 0.5

  readonly target: WebGLRenderTarget
  private readonly occlusion: WebGLRenderTarget
  private readonly scene = new Scene()
  /** What stands in for each point source in this layer's own scene: the same geometry, drawn with
   * the output material, at the source's own place. */
  private readonly proxies = new Map<Points | Mesh, Points | Mesh>()
  private readonly foreground = new MeshBasicMaterial({ color: 0x000000, fog: false })
  private hidden: (Points | Mesh)[] = []

  constructor(private width: number, private height: number) {
    // Four samples to an edge: a ribbon is a fraction of a pixel wide, and a point's disc is drawn
    // from its own Gaussian, which needs none.
    this.target = new WebGLRenderTarget(width, height, { type: HalfFloatType, samples: 4 })
    this.occlusion = new WebGLRenderTarget(...PointLayerPass.occlusionSize(width, height))
  }

  private static occlusionSize(width: number, height: number): [number, number] {
    return [Math.max(1, Math.round(width * PointLayerPass.OCCLUSION_SCALE)), Math.max(1, Math.round(height * PointLayerPass.OCCLUSION_SCALE))]
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.target.setSize(width, height)
    this.occlusion.setSize(...PointLayerPass.occlusionSize(width, height))
  }

  /**
   * Takes the point sources that are showing out of the render the picture is resampled from, and
   * says whether there are any. Call `restore` once that render is done.
   */
  take(host: PointLayerHost): boolean {
    this.hidden = host.points().filter(points => PointLayerPass.shown(points) && PointLayerPass.holdsPoints(points.geometry))
    for (const points of this.hidden) points.visible = false
    return this.hidden.length > 0
  }

  restore(): void {
    for (const points of this.hidden) points.visible = true
  }

  /** Whether it is drawn at all: itself and everything it hangs from. */
  private static shown(object: Object3D): boolean {
    for (let at: Object3D | null = object; at; at = at.parent) if (!at.visible) return false
    return true
  }

  private static holdsPoints(geometry: BufferGeometry): boolean {
    return (geometry.getAttribute("position")?.count ?? 0) > 0 && geometry.drawRange.count > 0
  }

  /**
   * Draws what `take` took, into `target`, through the widened camera the source was rendered with.
   * Leaves the render target as it found it.
   */
  draw(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, host: PointLayerHost, halfFovRad: number, srcTanHalfFovY: number): void {
    const originalTarget = renderer.getRenderTarget()
    const autoClear = renderer.autoClear
    const shadows = renderer.shadowMap.autoUpdate
    renderer.autoClear = false
    renderer.shadowMap.autoUpdate = false
    this.drawOcclusion(renderer, scene, camera, host)

    const aspect = this.width / this.height
    const uniforms = PointSources.output
    uniforms.uOutputHalfFovRad.value = halfFovRad
    uniforms.uOutputAspect.value = aspect
    uniforms.uOutputPixelAngle.value = (2 * halfFovRad) / this.height
    uniforms.uSrcTanHalfFovY.value = srcTanHalfFovY
    uniforms.uOcclusion.value = this.occlusion.texture
    this.placeProxies()
    EquidistantProjectionPass.clearTransparent(renderer, this.target)
    renderer.setRenderTarget(this.target)
    renderer.render(this.scene, camera)
    renderer.autoClear = autoClear
    renderer.shadowMap.autoUpdate = shadows
    renderer.setRenderTarget(originalTarget)
  }

  /** The small picture of what stands in front of the sky: its alpha is the cover. */
  private drawOcclusion(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, host: PointLayerHost): void {
    PointLayerPass.markForeground(scene, host.sky)
    for (const cloud of host.clouds()) cloud.layers.enable(PointLayerPass.CLOUD_LAYER)
    EquidistantProjectionPass.clearTransparent(renderer, this.occlusion)
    renderer.setRenderTarget(this.occlusion)
    const background = scene.background
    scene.background = null
    // The ground and everything solid, black, opaque, and writing the depth the clouds are tested
    // against: a cloud deck behind a hill is behind it.
    camera.layers.set(PointLayerPass.OCCLUDER_LAYER)
    scene.overrideMaterial = this.foreground
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    // The decks over it, as themselves: only their alpha is read.
    camera.layers.set(PointLayerPass.CLOUD_LAYER)
    renderer.render(scene, camera)
    camera.layers.set(0)
    scene.background = background
  }

  /** Puts the solid meshes of the scene, outside the sky, on the foreground layer. Walked every
   * frame: models arrive under groups that were built before them. */
  private static markForeground(object: Object3D, sky: Object3D): void {
    for (const child of object.children) {
      if (child === sky) continue
      // Only what is part of the world: the observer's phenomena and the pictures of the place are on
      // layers of their own, and do not hide a star.
      if (child instanceof Mesh && child.layers.isEnabled(0)) {
        const material = Array.isArray(child.material) ? child.material[0] : child.material
        const solid = material.depthWrite !== false && !material.transparent && material.blending !== AdditiveBlending
        if (solid) child.layers.enable(PointLayerPass.OCCLUDER_LAYER)
        else child.layers.disable(PointLayerPass.OCCLUDER_LAYER)
      }
      PointLayerPass.markForeground(child, sky)
    }
  }

  /** One stand-in per point source, following it: its geometry as it stands, its place in the world. */
  private placeProxies(): void {
    for (const points of this.hidden) {
      let proxy = this.proxies.get(points)
      if (!proxy) {
        proxy = points instanceof Points
          ? new Points(points.geometry, PointSources.outputMaterial(points.material as PointsMaterial))
          : new Mesh(points.geometry, SkyRibbons.outputMaterial(points.material as MeshBasicMaterial))
        proxy.matrixAutoUpdate = false
        proxy.frustumCulled = false
        this.proxies.set(points, proxy)
        this.scene.add(proxy)
      }
      proxy.geometry = points.geometry
      // Into `matrix`, not `matrixWorld`: three works the world matrix out again from `matrix` when it
      // renders this scene, and would put every star back at the origin — which is exactly right for
      // an observer on the ground under an unscaled sky, and wrong for one at fifteen hundred metres
      // under a sky scaled to thirty thousand.
      points.updateWorldMatrix(true, false)
      proxy.matrix.copy(points.matrixWorld)
      proxy.matrixWorldNeedsUpdate = true
      proxy.visible = true
    }
    for (const [points, proxy] of this.proxies) {
      if (this.hidden.includes(points)) continue
      proxy.visible = false
      // A point source that left the scene leaves this one too.
      if (!points.parent) {
        this.scene.remove(proxy)
        this.proxies.delete(points)
      }
    }
  }

  dispose(): void {
    this.target.dispose()
    this.occlusion.dispose()
    this.foreground.dispose()
  }
}
