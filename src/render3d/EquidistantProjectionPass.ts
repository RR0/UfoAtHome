import {
  Color,
  CubeCamera,
  Matrix3,
  Mesh,
  Quaternion,
  Vector3,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  HalfFloatType,
  LinearFilter,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
  type Camera,
  type PerspectiveCamera,
  type WebGLRenderer
} from "three"
import { FINISH_BY_MODE_GLSL, EYE_UNIFORMS, FINISH_GLSL, FinishMode } from "./colorSpace.js"
import type { UnfinishedFrame } from "./colorSpace.js"

/**
 * Renders the scene the way an eye sees it rather than the way a lens photographs it.
 *
 * three.js's PerspectiveCamera can only do one projection, `r = f·tan θ`: the pinhole a camera
 * really is. It spreads everything away from the axis by `sec²θ` — 42% at 33 degrees off-centre,
 * 105% at the corner of a 16:9 frame with a 60 degree vertical field. That is right for a
 * photograph and wrong for a observer, who perceives an angle as an angle wherever it falls. See
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
  /**
   * Beyond this half-angle a single rectilinear source stops being usable — its corner would need
   * `tan θ` of a direction approaching the horizon, i.e. an unbounded image — and the scene is
   * rendered into a CUBEMAP instead, six faces of a quarter turn each, which holds every direction
   * there is.
   *
   * Before the cube existed a field this wide fell back to the pinhole camera drawn straight to the
   * canvas: the halos test sky, stated at 110° tall, came out through a rectilinear lens nearly two
   * hundred degrees wide, with the compass letters at its edge blown up to three times their size and
   * every angle near the frame's side stretched several times over — exactly the lens this pass
   * exists to take away from an eye.
   */
  static readonly MAX_HALF_ANGLE_DEG = 80
  /** The cube's faces never finer than this, whatever the frame — six of them are drawn per frame. */
  static readonly MAX_CUBE_FACE = 2048

  /**
   * How many samples an edge is drawn from in the offscreen render this resamples.
   *
   * The canvas is asked for `antialias: true`, and for a photograph — drawn straight onto it —
   * that is the whole answer. A OBSERVER is not: an eye perceives an angle as an angle, so the
   * scene goes into the target below and is resampled out of it, and a plain render target has one
   * sample per pixel however the canvas was asked for. The horizon a reader sees is then a
   * staircase, and the resampling can only smear it, never undo it — the steps are already in the
   * bytes being read. Four samples is the usual place to stop: the edge is shaded once whatever
   * the count, so this buys coverage, not shading, and the resolve is one blit per frame.
   */
  static readonly SAMPLES = 4

  private cubeTarget?: WebGLCubeRenderTarget
  private cubeCamera?: CubeCamera
  private cubeMaterial?: ShaderMaterial
  private readonly cubeRotation = new Matrix3()

  private readonly target: WebGLRenderTarget
  /** What is laid over the scene rather than seen in it, drawn through the same camera — see FINISH_GLSL. */
  private readonly overlayTarget: WebGLRenderTarget
  private overlayCubeTarget?: WebGLCubeRenderTarget
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
    this.target = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType, samples: EquidistantProjectionPass.SAMPLES })
    this.overlayTarget = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType, samples: EquidistantProjectionPass.SAMPLES })
    this.material = new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS,
        uSource: { value: this.target.texture },
        /** Half of the OUTPUT's vertical field, in radians: the whole mapping's scale, since the
         * image's half-height is exactly this many radians of arc. */
        uHalfFovRad: { value: 0.5236 },
        uAspect: { value: this.width / this.height },
        /** `tan` of half the SOURCE's vertical field — how to project a direction back into the
         * pinhole render this samples from. */
        uSrcTanHalfFovY: { value: 1 },
        uResolution: { value: new Vector2(this.width, this.height) },
        uOverlay: { value: this.overlayTarget.texture },
        /** See FinishMode. */
        uMode: { value: FinishMode.Finished }
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
        ${FINISH_GLSL}
        uniform sampler2D uSource;
        uniform sampler2D uOverlay;
        uniform float uHalfFovRad;
        uniform float uAspect;
        uniform float uSrcTanHalfFovY;
        uniform float uMode;
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
          vec3 scene = vec3(0.0);
          vec4 overlay = vec4(0.0);
          if (dir.z < -1e-6) {
            vec2 src = vec2(dir.x / -dir.z / (uSrcTanHalfFovY * uAspect), dir.y / -dir.z / uSrcTanHalfFovY);
            if (all(lessThanEqual(abs(src), vec2(1.0)))) {
              scene = texture2D(uSource, src * 0.5 + 0.5).rgb;
              overlay = texture2D(uOverlay, src * 0.5 + 0.5);
            }
          }
          // Finished here because this pass draws to the CANVAS, which three.js would have encoded
          // for itself had the scene gone there directly — see colorSpace.ts. Left as its two layers
          // when the frame is on its way into a longer exposure, which has to add up light.
          ${FINISH_BY_MODE_GLSL}
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
   * The point of the output image a camera-local direction lands on — directionFor read backwards,
   * for what has to be FOUND on the picture rather than put there (see SceneRenderer.screenPointOf).
   * Undefined for a direction behind the camera, which lands nowhere.
   */
  static ndcFor(direction: { x: number; y: number; z: number }, fovDeg: number, aspect: number): { ndcX: number; ndcY: number } | undefined {
    const length = Math.hypot(direction.x, direction.y, direction.z)
    if (length === 0 || direction.z >= length) return undefined
    const halfFovRad = ((fovDeg / 2) * Math.PI) / 180
    const theta = Math.acos(Math.min(1, -direction.z / length))
    const sin = Math.sin(theta)
    const stretch = sin < 1e-9 ? 1 : theta / sin
    const ax = (direction.x / length) * stretch
    const ay = (direction.y / length) * stretch
    return { ndcX: ax / (aspect * halfFovRad), ndcY: ay / halfFovRad }
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

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.target.setSize(this.width, this.height)
    this.overlayTarget.setSize(this.width, this.height)
    this.material.uniforms.uResolution.value.set(this.width, this.height)
    this.material.uniforms.uAspect.value = this.width / this.height
  }

  /**
   * Renders `scene` through `camera` and resamples the result — finished onto whatever is being
   * drawn to, or, given `into`, left as its two layers there (see UnfinishedFrame).
   *
   * Widens the camera for the offscreen pass and puts it back afterwards, so nothing else in the
   * renderer has to know this happened — but see SceneRenderer.toSourceNdc, which does have to
   * know: a raycast aimed at a point on the VISIBLE image is aimed at a different direction of the
   * widened camera, and would otherwise test the wrong part of the scene.
   *
   * @param overlays Draws what is laid over the scene rather than seen in it (the pictures of the
   *   place, the observer's own phenomena), through the camera given, onto a cleared target of its own.
   */
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    fovDeg: number,
    onCameraWidened?: () => void,
    overlays?: (camera: PerspectiveCamera) => void,
    beforeCube?: (cube: boolean) => void,
    afterResample?: () => void,
    into?: UnfinishedFrame
  ): void {
    const aspect = this.width / this.height
    if (!EquidistantProjectionPass.supports(fovDeg, aspect)) {
      beforeCube?.(true)
      this.renderThroughCube(renderer, scene, camera, fovDeg, overlays, afterResample, into)
      beforeCube?.(false)
      return
    }
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
    // What is laid over the picture — the observer's own phenomena, depth-tested against the decor
    // alone (see SceneRenderer.renderPhenomenaPass) — onto a target of its own, through the same
    // widened camera, so that it is resampled the same way and finished over the eye's response.
    if (overlays) {
      EquidistantProjectionPass.clearTransparent(renderer, this.overlayTarget)
      overlays(camera)
    }
    renderer.setRenderTarget(originalTarget)
    camera.fov = originalFov
    camera.updateProjectionMatrix()

    this.resample(renderer, this.quadScene.children[0] as Mesh, this.material, originalTarget, into)
  }

  /** Draws `material` onto the destination: finished, or into the two layers of `into`. */
  private resample(renderer: WebGLRenderer, quad: Mesh, material: ShaderMaterial, destination: WebGLRenderTarget | null, into?: UnfinishedFrame): void {
    const previous = quad.material
    quad.material = material
    if (into) {
      material.uniforms.uMode.value = FinishMode.Scene
      renderer.setRenderTarget(into.scene)
      renderer.render(this.quadScene, this.quadCamera as Camera)
      material.uniforms.uMode.value = FinishMode.Overlay
      renderer.setRenderTarget(into.overlay)
      renderer.render(this.quadScene, this.quadCamera as Camera)
      renderer.setRenderTarget(destination)
    } else {
      material.uniforms.uMode.value = FinishMode.Finished
      renderer.setRenderTarget(destination)
      renderer.render(this.quadScene, this.quadCamera as Camera)
    }
    quad.material = previous
  }

  /**
   * Clears a target to nothing at all — no colour, no coverage, no depth — for an overlay to be
   * drawn onto.
   *
   * And resolves it at once. A multisampled target is cleared in its samples, and three.js copies
   * those into the texture only at the end of a render() into it: an overlay with nothing to draw
   * (no photographs, no phenomena) made no render(), and the texture kept whatever the last demo
   * had put there — Cussac's photograph laid over every demo opened after it. Rendering an empty
   * scene into it is that copy and nothing else.
   */
  static clearTransparent(renderer: WebGLRenderer, target: WebGLRenderTarget, face?: number): void {
    const colour = renderer.getClearColor(EquidistantProjectionPass.clearScratch)
    const alpha = renderer.getClearAlpha()
    const autoClear = renderer.autoClear
    renderer.setRenderTarget(target, face)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.setClearColor(colour, alpha)
    if (target.samples > 0) {
      renderer.autoClear = false
      renderer.render(EquidistantProjectionPass.nothing, EquidistantProjectionPass.nothingCamera)
      renderer.autoClear = autoClear
    }
  }

  private static readonly nothing = new Scene()
  private static readonly nothingCamera = new OrthographicCamera()

  private static readonly clearScratch = new Color()

  /**
   * The same picture for a field too wide for one pinhole: the scene drawn onto the six faces of a
   * cube around the eye, then read back along the direction each output pixel stands for — and the
   * overlays onto six faces of their own, read back the same way.
   *
   * Faces sized so a face pixel covers about the angle an output pixel does. The shadow maps are
   * drawn once, for the first face: the lights did not move between faces.
   */
  private renderThroughCube(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    fovDeg: number,
    overlays?: (camera: PerspectiveCamera) => void,
    afterResample?: () => void,
    into?: UnfinishedFrame
  ): void {
    const fovRad = (fovDeg * Math.PI) / 180
    const face = Math.min(
      EquidistantProjectionPass.MAX_CUBE_FACE,
      renderer.capabilities.maxCubemapSize,
      Math.max(256, Math.ceil(((this.height / fovRad) * Math.PI) / 2))
    )
    const options = { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false }
    if (!this.cubeTarget || !this.cubeCamera || !this.cubeMaterial || !this.overlayCubeTarget) {
      this.cubeTarget = new WebGLCubeRenderTarget(face, options)
      this.overlayCubeTarget = new WebGLCubeRenderTarget(face, options)
      this.cubeCamera = new CubeCamera(camera.near, camera.far, this.cubeTarget)
      this.cubeMaterial = this.buildCubeMaterial(this.cubeTarget, this.overlayCubeTarget)
    } else if (this.cubeTarget.width !== face) {
      this.cubeTarget.setSize(face, face)
      this.overlayCubeTarget.setSize(face, face)
    }
    const cube = this.cubeCamera
    camera.updateMatrixWorld()
    cube.position.setFromMatrixPosition(camera.matrixWorld)
    // Turned with the eye rather than squared on the world's axes. Squared, a picture looking up and
    // to one side fell across five or six faces, each drawn nearly whole — the rainbow test sky at an
    // 85° field paid five times the GPU of its 60° one. Turned, the front face holds the whole
    // picture up to a 90° field and its sides need only the two lateral faces, in bands (see
    // faceRegions); the rest are not drawn at all.
    const rotation = camera.getWorldQuaternion(this.quaternionScratch)
    cube.quaternion.copy(rotation)
    cube.updateMatrixWorld()
    if (cube.coordinateSystem !== renderer.coordinateSystem) {
      cube.coordinateSystem = renderer.coordinateSystem
      cube.updateCoordinateSystem()
    }
    const originalTarget = renderer.getRenderTarget()
    const shadows = renderer.shadowMap.autoUpdate
    const faceCameras = cube.children as PerspectiveCamera[]
    const regions = EquidistantProjectionPass.faceRegions(faceCameras, rotation, fovDeg, this.width / this.height, face)
    faceCameras.forEach((faceCamera, index) => {
      // A face no pixel of the picture looks into — behind the eye, for any field under 135° from
      // the axis to the corner — is left as it was: nothing samples it.
      const region = regions[index]
      if (!region) return
      if (faceCamera.near !== camera.near || faceCamera.far !== camera.far) {
        faceCamera.near = camera.near
        faceCamera.far = camera.far
        faceCamera.updateProjectionMatrix()
      }
      // And of a face it does look into, only the part it samples is drawn. The side faces of an
      // 85° field are each needed over a band, the top and bottom ones only near the picture's
      // corners — drawing all five whole cost three times the pixels of the picture itself, every one
      // of them paying for the clouds, and the rainbow test sky dropped from 120 frames a second to
      // 50 for as long as its field was that wide.
      for (const target of [this.cubeTarget!, this.overlayCubeTarget!]) {
        target.scissor.set(region.x, region.y, region.width, region.height)
        target.scissorTest = true
      }
      renderer.setRenderTarget(this.cubeTarget!, index)
      renderer.render(scene, faceCamera)
      if (overlays) {
        EquidistantProjectionPass.clearTransparent(renderer, this.overlayCubeTarget!, index)
        overlays(faceCamera)
      }
      renderer.shadowMap.autoUpdate = false
    })
    this.cubeTarget.scissorTest = false
    this.overlayCubeTarget!.scissorTest = false
    renderer.shadowMap.autoUpdate = shadows

    const uniforms = this.cubeMaterial.uniforms
    uniforms.uHalfFovRad.value = fovRad / 2
    uniforms.uAspect.value = this.width / this.height
    // The cube already looks where the camera does: its own directions are the picture's.
    uniforms.uCameraRotation.value.identity()
    const quad = this.quadScene.children[0] as Mesh
    // Resampled into the targets first, not onto the canvas: what belongs on the FINISHED picture
    // rather than in the scene — the Sun's own dazzle, a screen-wide quad that cannot be drawn on six
    // faces — is added to the scene's there, as light, and the picture then finished once.
    this.resample(renderer, quad, this.cubeMaterial, originalTarget, { scene: this.target, overlay: this.overlayTarget })
    renderer.setRenderTarget(this.target)
    afterResample?.()
    this.resample(renderer, quad, this.copyMaterial(), originalTarget, into)
  }

  private copy?: ShaderMaterial

  /** Copies the two targets to wherever is being drawn: finished for the canvas, or as they are. */
  private copyMaterial(): ShaderMaterial {
    this.copy ??= new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS, uSource: { value: this.target.texture }, uOverlay: { value: this.overlayTarget.texture }, uMode: { value: FinishMode.Finished } },
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
    return this.copy
  }

  private readonly quaternionScratch = new Quaternion()

  /** Samples across the picture, per side, from which the part of each face it looks into is found. */
  static readonly REGION_SAMPLES = 32

  /**
   * The part of each cube face the picture samples, in the face's own pixels (origin bottom left,
   * as a scissor wants it) — undefined for a face it does not look into at all.
   *
   * Found by sending a grid of the picture's own directions (directionFor's mapping, turned by the
   * camera) through each face camera: whichever face a direction lands on grows by that point. Two
   * neighbouring samples can leave a sliver of the footprint between them, or between the last of
   * them and the face's edge, so each region is widened by the largest step seen between neighbours
   * on that face, plus a texel for the bilinear filter.
   */
  static faceRegions(
    faceCameras: PerspectiveCamera[],
    rotation: Quaternion,
    fovDeg: number,
    aspect: number,
    faceSize: number
  ): ({ x: number; y: number; width: number; height: number } | undefined)[] {
    const inverses = faceCameras.map(faceCamera => {
      faceCamera.updateMatrixWorld()
      return faceCamera.matrixWorldInverse
    })
    const n = EquidistantProjectionPass.REGION_SAMPLES
    const halfFovRad = ((fovDeg / 2) * Math.PI) / 180
    const direction = EquidistantProjectionPass.faceScratch
    const hits: ({ face: number; x: number; y: number } | undefined)[] = []
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const ax = (-1 + (2 * i) / n) * aspect * halfFovRad
        const ay = (-1 + (2 * j) / n) * halfFovRad
        const theta = Math.hypot(ax, ay)
        const sin = Math.sin(theta)
        if (theta < 1e-6) direction.set(0, 0, -1)
        else direction.set((ax / theta) * sin, (ay / theta) * sin, -Math.cos(theta))
        direction.applyQuaternion(rotation)
        let hit: { face: number; x: number; y: number } | undefined
        for (let face = 0; face < inverses.length && !hit; face++) {
          const local = EquidistantProjectionPass.localScratch.copy(direction).transformDirection(inverses[face])
          if (local.z >= 0) continue
          // Through the face camera's own projection rather than an assumed one: three gives its cube
          // cameras a NEGATIVE field (-90°), which turns every face's picture upside down and left to
          // right — assuming +90° put each band on the wrong side of its face.
          const ndc = local.applyMatrix4(faceCameras[face].projectionMatrix)
          if (Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1) hit = { face, x: ((ndc.x + 1) / 2) * faceSize, y: ((ndc.y + 1) / 2) * faceSize }
        }
        hits.push(hit)
      }
    }
    const bounds = faceCameras.map(() => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, step: 0 }))
    const neighbour = (a: typeof hits[number], b: typeof hits[number]) => {
      if (a && b && a.face === b.face) bounds[a.face].step = Math.max(bounds[a.face].step, Math.abs(a.x - b.x), Math.abs(a.y - b.y))
    }
    hits.forEach((hit, index) => {
      if (!hit) return
      const bound = bounds[hit.face]
      bound.minX = Math.min(bound.minX, hit.x)
      bound.minY = Math.min(bound.minY, hit.y)
      bound.maxX = Math.max(bound.maxX, hit.x)
      bound.maxY = Math.max(bound.maxY, hit.y)
      if (index % (n + 1) < n) neighbour(hit, hits[index + 1])
      if (index + n + 1 < hits.length) neighbour(hit, hits[index + n + 1])
    })
    const forward = EquidistantProjectionPass.forwardScratch.set(0, 0, -1).applyQuaternion(rotation)
    const reach = EquidistantProjectionPass.cornerHalfAngleDeg(fovDeg, aspect)
    return bounds.map((bound, face) => {
      // A face the grid missed entirely may still hold a sliver of the picture between two samples:
      // drawn whole when any of it is within reach of the axis, as before regions existed.
      if (bound.minX > bound.maxX) {
        return EquidistantProjectionPass.faceSeen(faceCameras[face], forward, reach) ? { x: 0, y: 0, width: faceSize, height: faceSize } : undefined
      }
      // A face reached by a single sample has no neighbour to measure a step against: the whole
      // face then, rather than a guess.
      const margin = bound.step > 0 ? bound.step + 2 : faceSize
      const x = Math.max(0, Math.floor(bound.minX - margin))
      const y = Math.max(0, Math.floor(bound.minY - margin))
      const right = Math.min(faceSize, Math.ceil(bound.maxX + margin))
      const top = Math.min(faceSize, Math.ceil(bound.maxY + margin))
      return { x, y, width: right - x, height: top - y }
    })
  }

  /**
   * Whether any direction of a cube face lies within `reachDeg` of `forward`. The face camera looks
   * down its own -Z through a square of half-angle 45°; the directions nearest the axis are among its
   * centre, edges and corners, sampled on a 5 × 5 grid, with a few degrees' margin for what falls
   * between the samples.
   */
  static faceSeen(faceCamera: PerspectiveCamera, forward: Vector3, reachDeg: number): boolean {
    faceCamera.updateMatrixWorld()
    const cosReach = Math.cos((Math.min(reachDeg + 5, 180) * Math.PI) / 180)
    const direction = EquidistantProjectionPass.faceScratch
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        direction.set(-1 + i / 2, -1 + j / 2, -1).normalize().transformDirection(faceCamera.matrixWorld)
        if (direction.dot(forward) >= cosReach) return true
      }
    }
    return false
  }

  private static readonly faceScratch = new Vector3()
  private static readonly localScratch = new Vector3()
  private static readonly forwardScratch = new Vector3()

  private buildCubeMaterial(target: WebGLCubeRenderTarget, overlay: WebGLCubeRenderTarget): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS,
        uCube: { value: target.texture },
        uOverlayCube: { value: overlay.texture },
        uHalfFovRad: { value: 0.5236 },
        uAspect: { value: 1 },
        uCameraRotation: { value: this.cubeRotation },
        uMode: { value: FinishMode.Finished }
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
        ${FINISH_GLSL}
        uniform samplerCube uCube;
        uniform samplerCube uOverlayCube;
        uniform float uHalfFovRad;
        uniform float uAspect;
        uniform mat3 uCameraRotation;
        uniform float uMode;
        varying vec2 vNdc;

        void main() {
          // The same mapping as the rectilinear source's, and here it may run past a quarter turn:
          // a cube holds what is beside and behind the eye too.
          vec2 angle = vec2(vNdc.x * uAspect, vNdc.y) * uHalfFovRad;
          float theta = length(angle);
          vec3 scene = vec3(0.0);
          vec4 overlay = vec4(0.0);
          if (theta <= 3.14159265) {
            vec3 dir = vec3(0.0, 0.0, -1.0);
            if (theta > 1e-6) {
              vec2 axis = angle / theta;
              dir = vec3(axis * sin(theta), -cos(theta));
            }
            scene = textureCube(uCube, uCameraRotation * dir).rgb;
            overlay = textureCube(uOverlayCube, uCameraRotation * dir);
          }
          ${FINISH_BY_MODE_GLSL}
        }
      `,
      depthTest: false,
      depthWrite: false
    })
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
    this.overlayTarget.dispose()
    this.material.dispose()
    this.cubeTarget?.dispose()
    this.overlayCubeTarget?.dispose()
    this.cubeMaterial?.dispose()
    this.copy?.dispose()
    this.quadScene.clear()
  }
}
