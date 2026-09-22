import {
  CubeCamera, HalfFloatType, LinearFilter, Object3D, PMREMGenerator, Scene, Texture, Vector3, WebGLCubeRenderTarget,
  WebGLRenderTarget, WebGLRenderer
} from "three"

/**
 * What a shiny thing at one place in the scene has around it to mirror: the whole scene, photographed
 * in the six directions from that place.
 *
 * Everything reflects (see SkyReflection), and what a reflection shows is what is around the
 * reflecting surface — the sky, its clouds, the Sun, the Moon, the stars and planets, a street lamp,
 * an aircraft's strobes, a car's headlights, the ground, the decor, another body — which is exactly
 * the stuff of a misidentification: a lamp in a windscreen, the Moon in a cockpit's glass. So the
 * probe photographs the scene itself rather than working out any one thing in it, and anything the
 * scene draws is in it, whatever draws it.
 *
 * FROM WHERE the reflection is seen matters when the source is near: a lamp beside a craft ninety
 * metres off is on the other side of it seen from the craft than seen from the observer. So a body of
 * an interpretation gets a probe at its own centre, itself hidden while it is photographed — a
 * convex mirror does not show itself — and the decor shares one taken at the observer's eye.
 *
 * NOT IN IT: what is not in the world. The phenomena the observer drew are what they SAW, not a
 * thing standing there to be mirrored, and the pictures of the place are laid over the view: both
 * live on layers of their own (PHENOMENON_LAYER, REFERENCE_LAYER), and the probe's six cameras see
 * only the scene's. The compass and the lens's own flare are the screen's too but are drawn with
 * the scene, so they are handed in to be hidden like the thing whose surroundings these are.
 *
 * Two textures come out: the photograph itself, sharp, which glass mirrors (GlassMaterial), and the
 * same filtered for every roughness (PMREM), which three's physical materials mirror more or less
 * blurred. The shadows are not worked out again for the six views: they are the scene's as it was
 * last drawn, which is the same instant.
 */
export class ReflectionProbe {
  /** Pixels on a side of each of the six views: under a degree each, enough for a lamp to land on one. */
  static readonly SIZE = 128

  private readonly target = new WebGLCubeRenderTarget(ReflectionProbe.SIZE, {
    type: HalfFloatType, generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter
  })
  private readonly camera = new CubeCamera(0.1, 200000, this.target)
  private filteredTarget?: WebGLRenderTarget
  /** When it was last photographed, ms of performance.now(). */
  capturedAtMs = -Infinity
  /** Which state of the scene it was photographed in (see SceneRenderer.render) — nothing new to
   * photograph while the scene is still at that one. */
  capturedVersion?: number

  constructor(private readonly generator: PMREMGenerator) {
  }

  /** The photograph, for glass. */
  get sharp(): Texture {
    return this.target.texture
  }

  /** The photograph blurred for every roughness, once it has been taken — for everything else. */
  get filtered(): Texture | undefined {
    return this.filteredTarget?.texture
  }

  /**
   * Photographs the scene from `position`, with `hidden` taken out of it for the time it takes —
   * the thing whose surroundings these are.
   */
  capture(renderer: WebGLRenderer, scene: Scene, position: Vector3, hidden: readonly Object3D[] = []): void {
    const shadows = renderer.shadowMap.autoUpdate
    renderer.shadowMap.autoUpdate = false
    const shown = hidden.map(object => object.visible)
    for (const object of hidden) object.visible = false
    this.camera.position.copy(position)
    this.camera.update(renderer, scene)
    hidden.forEach((object, index) => { object.visible = shown[index] })
    renderer.shadowMap.autoUpdate = shadows
    this.filteredTarget = this.generator.fromCubemap(this.target.texture, this.filteredTarget)
    this.capturedAtMs = performance.now()
  }

  dispose(): void {
    this.target.dispose()
    this.filteredTarget?.dispose()
  }
}
