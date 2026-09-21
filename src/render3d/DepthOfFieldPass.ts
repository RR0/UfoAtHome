import {
  DepthTexture,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  UnsignedIntType,
  Vector2,
  HalfFloatType,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type WebGLRenderer
} from "three"
import { FINISH_BY_MODE_GLSL, FINISH_GLSL, FinishMode } from "./colorSpace.js"
import { EquidistantProjectionPass } from "./EquidistantProjectionPass.js"
import type { UnfinishedFrame } from "./colorSpace.js"

/**
 * Blurs the scene the way a lens does — by how far away each thing is.
 *
 * The point is not the look. A photograph that shows an object sharp says the object stood inside
 * the lens's depth of field, which is a real bound on its distance (see DepthOfField.ts), and a
 * reconstruction that draws everything sharp quietly throws that evidence away. Drawn, the same
 * statement becomes something a reader can SEE: the witness's own fence blurred while the light
 * above it is not, or the light itself a soft disc against a sharp horizon — which is the picture
 * of something much closer than it was said to be.
 *
 * The scene is rendered once into a target that keeps its depth, and one fullscreen pass then
 * gathers, for every pixel, a disc whose radius is the blur that pixel's own distance earns. The
 * radius comes from the thin-lens geometry and nothing else: the aperture, the focal length and
 * where the lens was focused, turned into millimetres on the frame and then into pixels by the
 * frame's own height. So a phone blurs almost nothing (its focal length is a thirtieth of a film
 * camera's, and the numerator of that geometry is squared), and a 200 mm at f/8 blurs everything
 * nearer than a hundred metres — exactly as they do in life.
 *
 * A gather rather than a scatter, which is the honest simplification here: light from a blurred
 * background really does spill ONTO a sharp foreground edge, and gathering cannot do that. What it
 * does do correctly is the case this project is for — a sharp thing and a blurred thing at
 * different distances, both plainly one or the other.
 */
export class DepthOfFieldPass {
  /** How far a single pixel may be smeared, in pixels of radius. A real 200 mm wide open on
   * something a metre away would run to hundreds; the cost of gathering is the square of it, and
   * nothing in a reconstruction turns on the difference between "very blurred" and "more blurred
   * still". */
  static readonly MAX_RADIUS_PX = 24

  /** Taps around the disc. Golden-angle spiral rather than a grid: the same count covers a round
   * aperture evenly, and its samples do not line up into the crosses a grid leaves on a highlight. */
  private static readonly TAPS = 32

  private readonly target: WebGLRenderTarget
  /** The overlays, with a depth of their own — the phenomena's, drawn at their stated distance —
   * blurred as the scene is and finished over it (see FINISH_GLSL). */
  private readonly overlayTarget: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial
  private width: number
  private height: number

  constructor(width: number, height: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    const depthTexture = new DepthTexture(this.width, this.height, UnsignedIntType)
    depthTexture.minFilter = NearestFilter
    depthTexture.magFilter = NearestFilter
    // Half-float for the colour, for the same reason the equidistant pass takes it: the Sun's own
    // dazzle is written in real units where white is one and brighter things are more, and a byte
    // target would flatten that before anything downstream could use it.
    this.target = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType, depthTexture })
    const overlayDepth = new DepthTexture(this.width, this.height, UnsignedIntType)
    overlayDepth.minFilter = NearestFilter
    overlayDepth.magFilter = NearestFilter
    this.overlayTarget = new WebGLRenderTarget(this.width, this.height, { type: HalfFloatType, depthTexture: overlayDepth })
    this.material = new ShaderMaterial({
      uniforms: {
        uColour: { value: this.target.texture },
        uDepth: { value: depthTexture },
        uResolution: { value: new Vector2(this.width, this.height) },
        uNear: { value: 0.1 },
        uFar: { value: 1000 },
        /** Millimetres of blur per metre of the geometry below — see setLens. */
        uApertureMm2: { value: 0 },
        /** Where the lens is focused, in the scene's own units. Zero means at infinity. */
        uFocusDistance: { value: 0 },
        uFocalLengthMm: { value: 50 },
        /** Pixels per millimetre of frame, which is what turns a circle of confusion into a blur. */
        uPixelsPerMm: { value: 0 },
        uMaxRadius: { value: DepthOfFieldPass.MAX_RADIUS_PX },
        uOverlay: { value: this.overlayTarget.texture },
        uOverlayDepth: { value: overlayDepth },
        /** See FinishMode. */
        uMode: { value: FinishMode.Finished }
      },
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
        varying vec2 vUv;
        uniform sampler2D uColour;
        uniform sampler2D uDepth;
        uniform sampler2D uOverlay;
        uniform sampler2D uOverlayDepth;
        uniform vec2 uResolution;
        uniform float uNear;
        uniform float uFar;
        uniform float uApertureMm2;
        uniform float uFocusDistance;
        uniform float uFocalLengthMm;
        uniform float uPixelsPerMm;
        uniform float uMaxRadius;
        uniform float uMode;

        /** How far away, in the scene's own units, whatever was drawn at this pixel stands. */
        float distanceAt(sampler2D depthMap, vec2 uv) {
          float depth = texture2D(depthMap, uv).x;
          float ndc = depth * 2.0 - 1.0;
          return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
        }

        /** The thin-lens geometry, in pixels: c = (f²/N)·|d−s| / (d·(s−f)), and at infinity simply
         * (f²/N)/d. One expression, no cases beyond the one the focus setting genuinely makes. */
        float blurRadius(float distanceUnits) {
          float subjectMm = distanceUnits * 1000.0;
          float circleMm;
          if (uFocusDistance <= 0.0) {
            circleMm = uApertureMm2 / subjectMm;
          } else {
            float focusMm = uFocusDistance * 1000.0;
            circleMm = uApertureMm2 * abs(subjectMm - focusMm) / (subjectMm * (focusMm - uFocalLengthMm));
          }
          return min(uMaxRadius, circleMm * uPixelsPerMm * 0.5);
        }

        /** One layer through the lens: every channel, coverage included, averaged over the disc of
         * confusion of the distance its own depth gives. Averaged in LINEAR light, which is what a
         * lens does — it adds photons, not screen values. */
        vec4 throughLens(sampler2D colourMap, sampler2D depthMap) {
          vec4 colour = texture2D(colourMap, vUv);
          float radius = blurRadius(distanceAt(depthMap, vUv));
          if (radius < 0.75) return colour;
          vec2 texel = 1.0 / uResolution;
          vec4 total = colour;
          float weight = 1.0;
          for (int tap = 0; tap < ${DepthOfFieldPass.TAPS}; tap++) {
            // Golden angle, with the radius growing as the square root of the index so the samples
            // cover the disc evenly rather than crowding its middle.
            float index = float(tap) + 0.5;
            float angle = index * 2.39996323;
            float spread = sqrt(index / float(${DepthOfFieldPass.TAPS})) * radius;
            vec2 at = vUv + vec2(cos(angle), sin(angle)) * spread * texel;
            // A sample only lends its light to this pixel if it is at least as blurred as the
            // distance it would have to cross — otherwise a sharp foreground would bleed into the
            // background behind it, which a lens never does.
            float share = step(spread, blurRadius(distanceAt(depthMap, at)) + 0.5);
            total += texture2D(colourMap, at) * share;
            weight += share;
          }
          return total / weight;
        }

        void main() {
          vec3 scene = throughLens(uColour, uDepth).rgb;
          // The phenomena are blurred by the distance they are DRAWN at — a parameter of the
          // picture, not a fact (see PhenomenonDepth), and the one place it shows as something
          // other than what hides the shape.
          vec4 overlay = throughLens(uOverlay, uOverlayDepth);
          ${FINISH_BY_MODE_GLSL}
        }
      `,
      depthTest: false,
      depthWrite: false
    })
    this.quadScene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.target.setSize(this.width, this.height)
    this.overlayTarget.setSize(this.width, this.height)
    this.material.uniforms.uResolution.value.set(this.width, this.height)
  }

  /**
   * States the lens this pass is imitating.
   *
   * `focusDistance` is in the scene's own units, and zero means focused at infinity — which is
   * where a camera pointed at the sky sits, and the only setting under which everything celestial
   * comes out sharp.
   */
  setLens(focalLengthMm: number, fNumber: number, focusDistance: number, frameHeightMm: number): void {
    const uniforms = this.material.uniforms
    uniforms.uApertureMm2.value = (focalLengthMm * focalLengthMm) / Math.max(0.1, fNumber)
    uniforms.uFocusDistance.value = Math.max(0, focusDistance)
    uniforms.uFocalLengthMm.value = focalLengthMm
    uniforms.uPixelsPerMm.value = this.height / Math.max(0.1, frameHeightMm)
  }

  /** Renders the scene through the camera and blurs what the lens would not have held sharp. */
  /** Whether the frame this pass produces is finished, or is one instant of a longer exposure —
   * see EquidistantProjectionPass.setEncodesOutput, which draws the same distinction for the same
   * reason. */
  /**
   * Renders the scene and its overlays, then puts both through the lens — finished onto whatever is
   * being drawn to, or, given `into`, left as its two layers there (see UnfinishedFrame).
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, overlays?: () => void, into?: UnfinishedFrame): void {
    const uniforms = this.material.uniforms
    uniforms.uNear.value = camera.near
    uniforms.uFar.value = camera.far
    const originalTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.clear()
    renderer.render(scene, camera)
    EquidistantProjectionPass.clearTransparent(renderer, this.overlayTarget)
    overlays?.()
    if (into) {
      uniforms.uMode.value = FinishMode.Scene
      renderer.setRenderTarget(into.scene)
      renderer.render(this.quadScene, this.quadCamera)
      uniforms.uMode.value = FinishMode.Overlay
      renderer.setRenderTarget(into.overlay)
      renderer.render(this.quadScene, this.quadCamera)
    } else {
      uniforms.uMode.value = FinishMode.Finished
      renderer.setRenderTarget(originalTarget)
      renderer.render(this.quadScene, this.quadCamera)
    }
    renderer.setRenderTarget(originalTarget)
  }

  dispose(): void {
    this.target.depthTexture?.dispose()
    this.target.dispose()
    this.overlayTarget.depthTexture?.dispose()
    this.overlayTarget.dispose()
    this.material.dispose()
  }
}
