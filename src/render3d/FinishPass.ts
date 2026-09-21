import {
  HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget,
  type Camera, type WebGLRenderer
} from "three"
import { FINISH_BY_MODE_GLSL, EYE_UNIFORMS, FINISH_GLSL, FinishMode, type UnfinishedFrame } from "./colorSpace.js"
import { EquidistantProjectionPass } from "./EquidistantProjectionPass.js"

/**
 * The plainest way a frame is drawn: the scene through the camera as it is, then finished.
 *
 * Every picture is drawn as light first (a luminance relative to what the eye is adapted to, see
 * EYE_RESPONSE_GLSL) and only then turned into what the eye makes of it, once, for the whole frame.
 * The canvas cannot hold light (it is eight bits of response), so even the frame no lens reshapes
 * or blurs goes through a half-float target of its own, with what is laid over the scene rather
 * than seen in it on a second one, and one fullscreen pass finishes them onto the canvas — or copies
 * them as they are into a longer exposure (see ExposureAccumulation), which has to add up light.
 */
export class FinishPass {
  /** Samples an edge is drawn from, as the canvas's own antialiasing would have given it. */
  static readonly SAMPLES = 4

  private readonly scene: WebGLRenderTarget
  private readonly overlay: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial

  constructor(width: number, height: number) {
    const options = { type: HalfFloatType, samples: FinishPass.SAMPLES }
    this.scene = new WebGLRenderTarget(Math.max(1, width), Math.max(1, height), options)
    this.overlay = new WebGLRenderTarget(Math.max(1, width), Math.max(1, height), options)
    this.material = new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS, uSource: { value: this.scene.texture }, uOverlay: { value: this.overlay.texture }, uMode: { value: FinishMode.Finished } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        ${FINISH_GLSL}
        uniform sampler2D uSource;
        uniform sampler2D uOverlay;
        uniform float uMode;
        varying vec2 vUv;
        void main() {
          vec3 scene = texture2D(uSource, vUv).rgb;
          vec4 overlay = texture2D(uOverlay, vUv);
          ${FINISH_BY_MODE_GLSL}
        }
      `,
      depthTest: false,
      depthWrite: false
    })
    this.quadScene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  /**
   * Draws `scene` through `camera`, then `overlays` onto a cleared layer of their own, and finishes
   * both onto whatever is being drawn to — or, given `into`, draws them straight into its two layers.
   *
   * @param afterScene Drawn onto the scene's layer once the scene is, as light: the Sun's dazzle.
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, overlays?: () => void, afterScene?: () => void, into?: UnfinishedFrame): void {
    const destination = renderer.getRenderTarget()
    const frame = into ?? { scene: this.scene, overlay: this.overlay }
    renderer.setRenderTarget(frame.scene)
    renderer.render(scene, camera)
    afterScene?.()
    // A longer exposure adds its overlay layer up whatever the finish does with it: cleared always.
    if (overlays || into) {
      EquidistantProjectionPass.clearTransparent(renderer, frame.overlay)
      overlays?.()
    }
    renderer.setRenderTarget(destination)
    if (into) return
    this.material.uniforms.uMode.value = FinishMode.Finished
    renderer.render(this.quadScene, this.quadCamera)
  }

  resize(width: number, height: number): void {
    this.scene.setSize(Math.max(1, width), Math.max(1, height))
    this.overlay.setSize(Math.max(1, width), Math.max(1, height))
  }

  dispose(): void {
    this.scene.dispose()
    this.overlay.dispose()
    this.material.dispose()
    ;(this.quadScene.children[0] as Mesh).geometry.dispose()
  }
}
