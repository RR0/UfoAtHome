import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  HalfFloatType,
  WebGLRenderTarget,
  type Camera,
  type PerspectiveCamera,
  type WebGLRenderer
} from "three"
import { SRGB_ENCODE_GLSL } from "./colorSpace.js"

/**
 * Renders the scene the way an eye sees it rather than the way a lens photographs it.
 *
 * three.js's PerspectiveCamera can only do one projection, `r = f·tan θ`: the pinhole a camera
 * really is. It spreads everything away from the axis by `sec²θ` — 42% at 33 degrees off-centre,
 * 105% at the corner of a 16:9 frame with a 60 degree vertical field. That is right for a
 * photograph and wrong for a witness, who perceives an angle as an angle wherever it falls. See
 * Instrument.ts.
 *
 * So the scene is rendered as usual into an offscreen target with a DELIBERATELY WIDER field, and
 * a single fullscreen pass resamples it: for each output pixel it works out which direction that
 * pixel stands for under `r = f·θ`, and fetches the colour the pinhole render put in that
 * direction. One extra target and one extra draw per frame.
 *
 * The wider source is not a quality compromise: a pinhole projection over-samples exactly where
 * this needs it least (the edges) and the target's own centre still carries more pixels per radian
 * than the output asks for, at equal resolution.
 */
export class EquidistantProjectionPass {
  /** Beyond this half-angle a single rectilinear source stops being usable — its corner would need
   * `tan θ` of a direction approaching the horizon, i.e. an unbounded image. A field that wide
   * needs a cubemap, which is a different piece of work; until one exists, SceneRenderer falls back
   * to rendering straight to the canvas rather than producing a broken frame. */
  static readonly MAX_HALF_ANGLE_DEG = 80

  private readonly target: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    // HALF-FLOAT, not the default byte. Every additive light in this scene — the Sun's dazzle above
    // all — is written in real units where "one" means white and brighter things are simply more
    // than one. A byte target throws that away before the frame is resampled, so a dazzle calibrated
    // to blaze out to two and a half degrees came out blazing to one: it had been flattened to white
    // at the buffer and then blurred back down by the resampling. The clip belongs at the end of the
    // chain, where the canvas is written, and nowhere before it.
    this.target = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType })
    this.material = new ShaderMaterial({
      uniforms: {
        uSource: { value: this.target.texture },
        /** Half of the OUTPUT's vertical field, in radians: the whole mapping's scale, since the
         * image's half-height is exactly this many radians of arc. */
        uHalfFovRad: { value: 0.5236 },
        uAspect: { value: this.width / this.height },
        /** `tan` of half the SOURCE's vertical field — how to project a direction back into the
         * pinhole render this samples from. */
        uSrcTanHalfFovY: { value: 1 },
        uResolution: { value: new Vector2(this.width, this.height) },
        /** 1 when this pass writes the canvas, 0 when it writes a target somebody else will still
         * add to — see setEncodesOutput. */
        uEncodeOutput: { value: 1 }
      },
      vertexShader: `
        varying vec2 vNdc;
        void main() {
          vNdc = position.xy;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        ${SRGB_ENCODE_GLSL}
        uniform sampler2D uSource;
        uniform float uHalfFovRad;
        uniform float uAspect;
        uniform float uSrcTanHalfFovY;
        uniform float uEncodeOutput;
        varying vec2 vNdc;

        void main() {
          // Where this pixel sits in ANGLE, not in tangent: the whole point. Distance from the
          // centre of the image is proportional to the angle off-axis, so a degree covers the same
          // pixels in the middle of the frame and at its edge.
          vec2 angle = vec2(vNdc.x * uAspect, vNdc.y) * uHalfFovRad;
          float theta = length(angle);
          // Straight ahead: no direction to rotate towards, and atan(0,0) is undefined.
          vec3 dir;
          if (theta < 1e-6) {
            dir = vec3(0.0, 0.0, -1.0);
          } else {
            vec2 axis = angle / theta;
            dir = vec3(axis * sin(theta), -cos(theta));
          }
          // Behind the observer: nothing the source could possibly hold.
          if (dir.z >= -1e-6) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
          vec2 src = vec2(dir.x / -dir.z / (uSrcTanHalfFovY * uAspect), dir.y / -dir.z / uSrcTanHalfFovY);
          if (any(greaterThan(abs(src), vec2(1.0)))) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
          // Encoded here because this pass draws to the CANVAS, which three.js would have encoded
          // for itself had the scene gone there directly — see colorSpace.ts. Not encoded when the
          // frame is on its way into a longer exposure's accumulation, which has to add up light.
          vec3 colour = texture2D(uSource, src * 0.5 + 0.5).rgb;
          gl_FragColor = vec4(uEncodeOutput > 0.5 ? encodeSrgb(colour) : colour, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    })
    this.quadScene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  /**
   * Which direction, in camera space, a point of the VISIBLE image stands for — the same mapping
   * the shader does, in JS.
   *
   * Everything that AIMS at the scene rather than drawing it needs this: a raycast against decor
   * (see SceneRenderer.isScreenPointOccluded/decorDistancesAt) is given a point on the image the
   * viewer sees, and three.js's own setFromCamera would interpret it through the pinhole camera —
   * a different direction entirely, quietly testing the wrong part of the scene.
   */
  directionFor(ndcX: number, ndcY: number, fovDeg: number): { x: number; y: number; z: number } {
    const aspect = this.width / this.height
    const halfFovRad = ((fovDeg / 2) * Math.PI) / 180
    const ax = ndcX * aspect * halfFovRad
    const ay = ndcY * halfFovRad
    const theta = Math.hypot(ax, ay)
    if (theta < 1e-6) return { x: 0, y: 0, z: -1 }
    const sin = Math.sin(theta)
    return { x: (ax / theta) * sin, y: (ay / theta) * sin, z: -Math.cos(theta) }
  }

  /**
   * The widest angle from the axis the output frame reaches: its corner. Under `r = f·θ` the image
   * is linear in angle, so the corner is simply the half-field scaled by the frame's own diagonal —
   * 61 degrees for a 60 degree vertical field on 16:9, i.e. a good deal more than the 30 degrees
   * the field's name suggests.
   */
  static cornerHalfAngleDeg(fovDeg: number, aspect: number): number {
    return (fovDeg / 2) * Math.hypot(aspect, 1)
  }

  /** Whether a field this wide can be served from one rectilinear source at all. */
  static supports(fovDeg: number, aspect: number): boolean {
    return this.cornerHalfAngleDeg(fovDeg, aspect) <= this.MAX_HALF_ANGLE_DEG
  }

  /**
   * Whether the frame this pass produces is finished, or is one instant of a longer exposure.
   *
   * A pass that draws to the canvas must bend the light through the sRGB curve itself, since it has
   * stepped around the moment three.js would have done it (see colorSpace.ts). A pass that draws
   * into a target somebody is still going to ADD to must not: light adds in linear units, and
   * averaging curve-bent numbers is the very mistake that comment warns about.
   */
  setEncodesOutput(encodes: boolean): void {
    this.material.uniforms.uEncodeOutput.value = encodes ? 1 : 0
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.target.setSize(this.width, this.height)
    this.material.uniforms.uResolution.value.set(this.width, this.height)
    this.material.uniforms.uAspect.value = this.width / this.height
  }

  /**
   * Renders `scene` through `camera` and resamples the result.
   *
   * Widens the camera for the offscreen pass and puts it back afterwards, so nothing else in the
   * renderer has to know this happened — but see SceneRenderer.toSourceNdc, which does have to
   * know: a raycast aimed at a point on the VISIBLE image is aimed at a different direction of the
   * widened camera, and would otherwise test the wrong part of the scene.
   */
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    fovDeg: number,
    onCameraWidened?: () => void
  ): void {
    const aspect = this.width / this.height
    this.material.uniforms.uHalfFovRad.value = ((fovDeg / 2) * Math.PI) / 180
    this.material.uniforms.uSrcTanHalfFovY.value = this.sourceTanHalfFovY(fovDeg, aspect)

    const originalFov = camera.fov
    camera.fov = this.sourceFovDeg(fovDeg, aspect)
    camera.updateProjectionMatrix()
    // Anything positioned in screen space has to be positioned for the WIDENED camera, since that
    // is the render this samples from — the Sun's flare overlay above all (see
    // SceneRenderer.updateLensFlarePosition), which would otherwise sit where the narrow frame put
    // it and then be resampled from the wrong direction entirely.
    onCameraWidened?.()
    const originalTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(originalTarget)
    camera.fov = originalFov
    camera.updateProjectionMatrix()

    renderer.render(this.quadScene, this.quadCamera as Camera)
  }

  /** The vertical field the offscreen render needs so its own corner reaches the output's — the
   * source has to CONTAIN every direction the output asks for, or the frame's corners come back
   * black. */
  sourceFovDeg(fovDeg: number, aspect: number): number {
    return (Math.atan(this.sourceTanHalfFovY(fovDeg, aspect)) * 360) / Math.PI
  }

  private sourceTanHalfFovY(fovDeg: number, aspect: number): number {
    const cornerRad = (EquidistantProjectionPass.cornerHalfAngleDeg(fovDeg, aspect) * Math.PI) / 180
    return Math.tan(cornerRad) / Math.hypot(aspect, 1)
  }

  dispose(): void {
    this.target.dispose()
    this.material.dispose()
    this.quadScene.clear()
  }
}
