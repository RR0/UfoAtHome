import {
  AdditiveBlending,
  HalfFloatType,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer
} from "three"
import { SRGB_ENCODE_GLSL } from "./colorSpace.js"

/**
 * The film, for a pose long enough that the sky moved across it.
 *
 * A shutter left open does one thing: it ADDS whatever light arrived, instant after instant, onto
 * the same grain. So that is what this does — the scene is drawn once per instant into a target,
 * each drawing is added to a running one, and only the sum is finally bent through the sRGB curve
 * and handed to the canvas. A star that stood still leaves a point; a star the Earth turned under
 * leaves the arc it really traced.
 *
 * Everything here is in HALF-FLOAT and in LINEAR light, and both halves of that matter: light adds
 * linearly and screen values do not (see colorSpace.ts), and the Sun's own dazzle is written in
 * units where white is one and brighter things are simply more, which a byte target would flatten
 * before anything could be added to it.
 *
 * Each instant contributes its SHARE (one over the number of instants) rather than its whole, so a
 * long pose does not simply come out white: this is the same convention the 2D shape accumulation
 * uses — the picture stays exposed as the photographer intended it and the movement shows as a
 * trail, which is what a reader is being shown. A camera that also collected more total light would
 * be answering a different question (how bright was the scene), and this project has no film speed
 * to answer it with.
 */
export class ExposureAccumulation {
  /** Where one instant of the scene lands, straight out of the pass chain, still linear. */
  private readonly frameTarget: WebGLRenderTarget
  /** The running sum of every instant so far — the film itself. */
  private readonly filmTarget: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly addMaterial: ShaderMaterial
  private readonly developMaterial: ShaderMaterial
  private readonly quad: Mesh
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.frameTarget = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType })
    this.filmTarget = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType })
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `
    this.addMaterial = new ShaderMaterial({
      uniforms: { uSource: { value: this.frameTarget.texture }, uShare: { value: 1 } },
      vertexShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uSource;
        uniform float uShare;
        void main() {
          gl_FragColor = vec4(texture2D(uSource, vUv).rgb * uShare, 1.0);
        }
      `,
      // The whole mechanism, in one line: the GPU's own adder is the shutter staying open.
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false
    })
    this.developMaterial = new ShaderMaterial({
      uniforms: {
        uFilm: { value: this.filmTarget.texture },
        /** What a film holding only SOME of the pose has to be multiplied by to be exposed as
         * though it held all of it — see develop. One, once every instant is in. */
        uGain: { value: 1 }
      },
      vertexShader,
      fragmentShader: `
        precision highp float;
        ${SRGB_ENCODE_GLSL}
        varying vec2 vUv;
        uniform sampler2D uFilm;
        uniform float uGain;
        void main() {
          gl_FragColor = vec4(encodeSrgb(texture2D(uFilm, vUv).rgb * uGain), 1.0);
        }
      `,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.addMaterial)
    this.quadScene.add(this.quad)
  }

  /** Where the caller should draw one instant of the scene. */
  get instantTarget(): WebGLRenderTarget {
    return this.frameTarget
  }

  /** Opens the shutter: an empty film, and no autoClear to wipe it between instants. */
  open(renderer: WebGLRenderer): void {
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this.filmTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, true)
    renderer.setRenderTarget(previous)
  }

  /** Adds the instant now standing in `instantTarget`, at its share of the whole pose. */
  add(renderer: WebGLRenderer, share: number): void {
    this.addMaterial.uniforms.uShare.value = share
    this.quad.material = this.addMaterial
    const previous = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.setRenderTarget(this.filmTarget)
    renderer.render(this.quadScene, this.quadCamera as Camera)
    renderer.setRenderTarget(previous)
    renderer.autoClear = previousAutoClear
  }

  /**
   * Closes the shutter: the sum, bent through the sRGB curve, onto the canvas.
   *
   * `gain` is how much of the pose is actually in the film — a quarter of the instants developed at
   * a gain of four is the same picture, sampled more coarsely, rather than a picture four times too
   * dark. That is what lets a long pose be built a few instants at a time and shown on the way (see
   * SceneRenderer.renderExposure): it goes from beady to smooth instead of from black to bright.
   */
  develop(renderer: WebGLRenderer, gain = 1): void {
    this.developMaterial.uniforms.uGain.value = gain
    this.quad.material = this.developMaterial
    renderer.setRenderTarget(null)
    renderer.render(this.quadScene, this.quadCamera as Camera)
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.frameTarget.setSize(this.width, this.height)
    this.filmTarget.setSize(this.width, this.height)
  }

  dispose(): void {
    this.frameTarget.dispose()
    this.filmTarget.dispose()
    this.addMaterial.dispose()
    this.developMaterial.dispose()
    this.quad.geometry.dispose()
    this.quadScene.clear()
  }
}
