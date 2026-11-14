import {
  Color,
  FloatType,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type Scene,
  type Side,
  type Texture,
  type WebGLRenderer
} from "three"
import { EquidistantProjectionPass } from "./EquidistantProjectionPass.js"

/** What a scene lends to the drawing of its control passes (see ControlPasses.draw). */
export interface ControlPassHost {
  readonly renderer: WebGLRenderer
  readonly scene: Scene
  /** The eye's camera, as the frame just drawn used it. */
  readonly camera: PerspectiveCamera
  /** The pass the picture was resampled through, when the instrument's projection is not the pinhole camera's. */
  readonly equidistant?: EquidistantProjectionPass
  /** What has no distance to give: the sky and what is in it (the stars, the Sun and the Moon, the clouds, a flare). */
  readonly sky: Object3D[]
  /** Whether a mesh hides what is behind it (a glow added on top does not). */
  isSolid(mesh: Mesh): boolean
  /** Draws the observer's own phenomena through `camera` into the target bound, hidden by the decor as the picture hides them. */
  drawPhenomena(camera: PerspectiveCamera): void
}

/** The control passes of one frame, both of the picture's own size, in rows from the TOP. */
export interface ControlPassFrame {
  readonly width: number
  readonly height: number
  /** Metres from the eye to the first solid surface of each pixel; 0 where there is none (the sky). */
  readonly distanceM: Float32Array
  /** 255 where the observer's phenomena put any light, 0 elsewhere. */
  readonly phenomenon: Uint8Array
}

/**
 * Draws again the frame the scene has just drawn, as what an image generator can be held to rather than as light: how far each pixel is
 * from the eye, and which pixels are the phenomenon. They are what keeps a generated film to the reconstruction (its geometry, its horizon,
 * where the phenomenon is) and what keeps the phenomenon itself out of the generator's reach — the part of the picture that is the
 * testimony is never redrawn by it.
 *
 * Not a pass of the ordinary frame: only the export of a reconstruction's material for a generator asks for it (see
 * scripts/generative-assets), so it is loaded on demand.
 */
export class ControlPasses {

  private target?: WebGLRenderTarget
  private readonly wideCamera = new PerspectiveCamera()
  private readonly materials = new Map<string, ShaderMaterial>()

  draw(host: ControlPassHost): ControlPassFrame {
    const { renderer, camera, equidistant } = host
    const size = renderer.getDrawingBufferSize(new Vector2())
    const width = size.x
    const height = size.y
    const aspect = width / height
    if (equidistant && !EquidistantProjectionPass.supports(camera.fov, aspect)) {
      throw new Error(`A field of ${camera.fov}° is drawn through a cube, which the control passes do not follow yet: export through a narrower field.`)
    }
    const source = this.sourceCamera(camera, equidistant ? equidistant.sourceFovDeg(camera.fov, aspect) : camera.fov)
    const target = this.usableTarget(width, height)
    const distance = this.drawDistance(host, source, target)
    const light = this.drawPhenomenon(host, source, target)
    const sourceTanHalfY = Math.tan((source.fov * Math.PI) / 360)
    const distanceM = new Float32Array(width * height)
    const phenomenon = new Uint8Array(width * height)
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const at = this.sourcePixel(column, row, width, height, camera.fov, aspect, sourceTanHalfY, equidistant)
        if (at < 0) continue
        const index = row * width + column
        distanceM[index] = distance[at * 4]
        const r = light[at * 4], g = light[at * 4 + 1], b = light[at * 4 + 2], a = light[at * 4 + 3]
        phenomenon[index] = Math.max(r, g, b, a) > ControlPasses.LIGHT_THRESHOLD ? 255 : 0
      }
    }
    return { width, height, distanceM, phenomenon }
  }

  dispose(): void {
    this.target?.dispose()
    for (const material of this.materials.values()) material.dispose()
    this.materials.clear()
  }

  /** Under which a phenomenon's light is taken as none: a float target holds the faintest edge of a halo. */
  private static readonly LIGHT_THRESHOLD = 1e-6

  /**
   * The pixel of the source render (as read back: rows from the bottom) that the picture's pixel at `column`, `row` (from the top) shows, or -1
   * if none. For the pinhole camera it is the same pixel; through the eye's projection, the one the pass itself samples (see
   * EquidistantProjectionPass.directionFor) — nearest, since a distance or a mask is not to be blended between neighbours.
   */
  private sourcePixel(column: number, row: number, width: number, height: number, fovDeg: number, aspect: number, sourceTanHalfY: number, equidistant?: EquidistantProjectionPass): number {
    if (!equidistant) return (height - 1 - row) * width + column
    const ndcX = ((column + 0.5) / width) * 2 - 1
    const ndcY = 1 - ((row + 0.5) / height) * 2
    const direction = equidistant.directionFor(ndcX, ndcY, fovDeg)
    if (direction.z >= 0) return -1
    const sourceX = direction.x / -direction.z / (sourceTanHalfY * aspect)
    const sourceY = direction.y / -direction.z / sourceTanHalfY
    const x = Math.floor(((sourceX + 1) / 2) * width)
    const y = Math.floor(((sourceY + 1) / 2) * height)
    if (x < 0 || x >= width || y < 0 || y >= height) return -1
    return y * width + x
  }

  private sourceCamera(camera: PerspectiveCamera, fovDeg: number): PerspectiveCamera {
    const source = this.wideCamera.copy(camera)
    source.fov = fovDeg
    source.clearViewOffset()
    source.updateProjectionMatrix()
    source.updateMatrixWorld()
    return source
  }

  private usableTarget(width: number, height: number): WebGLRenderTarget {
    if (!this.target) {
      this.target = new WebGLRenderTarget(width, height, { type: FloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true })
    } else if (this.target.width !== width || this.target.height !== height) {
      this.target.setSize(width, height)
    }
    return this.target
  }

  /** Every solid surface drawn as its distance from the eye, and nothing else: the sky, the glows, the points and the lines hidden meanwhile. */
  private drawDistance(host: ControlPassHost, camera: PerspectiveCamera, target: WebGLRenderTarget): Float32Array {
    const { renderer, scene } = host
    const hidden: Object3D[] = []
    const swapped: { mesh: Mesh, material: Material | Material[] }[] = []
    for (const sky of host.sky) {
      if (sky.visible) {
        sky.visible = false
        hidden.push(sky)
      }
    }
    scene.traverseVisible(object => {
      if (object instanceof Mesh) {
        if (host.isSolid(object)) {
          swapped.push({ mesh: object, material: object.material })
          object.material = Array.isArray(object.material) ? object.material.map(material => this.distanceMaterial(material)) : this.distanceMaterial(object.material)
          return
        }
      } else if (!(object as { isPoints?: boolean, isLine?: boolean, isSprite?: boolean }).isPoints && !(object as { isLine?: boolean }).isLine && !(object as { isSprite?: boolean }).isSprite) {
        return
      }
      // A glow, a point, a line or a sprite: hidden, but only once its own children have been walked (traverseVisible walks the parent first).
      hidden.push(object)
    })
    for (const object of hidden) object.visible = false
    try {
      return this.drawInto(host, target, () => renderer.render(scene, camera))
    } finally {
      for (const object of hidden) object.visible = true
      for (const { mesh, material } of swapped) mesh.material = material
    }
  }

  private drawPhenomenon(host: ControlPassHost, camera: PerspectiveCamera, target: WebGLRenderTarget): Float32Array {
    return this.drawInto(host, target, () => host.drawPhenomena(camera))
  }

  private drawInto(host: ControlPassHost, target: WebGLRenderTarget, draw: () => void): Float32Array {
    const { renderer, scene } = host
    const previous = renderer.getRenderTarget()
    const autoClear = renderer.autoClear
    const shadows = renderer.shadowMap.autoUpdate
    const fog = scene.fog
    const background = scene.background
    const clearAlpha = renderer.getClearAlpha()
    const clearColor = renderer.getClearColor(new Color())
    scene.fog = null
    scene.background = null
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(target)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.autoClear = false
    try {
      draw()
      const pixels = new Float32Array(target.width * target.height * 4)
      renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels)
      return pixels
    } finally {
      renderer.autoClear = autoClear
      renderer.shadowMap.autoUpdate = shadows
      renderer.setRenderTarget(previous)
      renderer.setClearColor(clearColor, clearAlpha)
      scene.fog = fog
      scene.background = background
    }
  }

  /** The distance material standing for `original`: its sides, and its cut-outs (a leaf's card is a leaf, not a square). */
  private distanceMaterial(original: Material): ShaderMaterial {
    const cutout = (original as { alphaTest?: number }).alphaTest ?? 0
    const map = (original as { map?: Texture | null }).map ?? (original as { alphaMap?: Texture | null }).alphaMap ?? null
    const cut = cutout > 0 && map !== null
    const key = `${original.side}:${cut ? `${map!.uuid}:${cutout}` : "-"}`
    let material = this.materials.get(key)
    if (!material) {
      material = new ShaderMaterial({
        defines: cut ? { CUTOUT: "", USE_UV: "" } : {},
        uniforms: { cutoutMap: { value: map }, cutoutAlpha: { value: cutout } },
        vertexShader: ControlPasses.VERTEX,
        fragmentShader: ControlPasses.FRAGMENT,
        side: original.side as Side
      })
      this.materials.set(key, material)
    }
    return material
  }

  private static readonly VERTEX = /* glsl */ `
    #include <common>
    #include <uv_pars_vertex>
    #include <batching_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    varying float vDistance;
    void main() {
      #include <uv_vertex>
      #include <batching_vertex>
      #include <skinbase_vertex>
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      #include <project_vertex>
      vDistance = length(mvPosition.xyz);
    }
  `

  private static readonly FRAGMENT = /* glsl */ `
    #include <uv_pars_fragment>
    uniform sampler2D cutoutMap;
    uniform float cutoutAlpha;
    varying float vDistance;
    void main() {
      #ifdef CUTOUT
        if (texture2D(cutoutMap, vUv).a < cutoutAlpha) discard;
      #endif
      gl_FragColor = vec4(vDistance, 0.0, 0.0, 1.0);
    }
  `
}
