import {
  AdditiveBlending, BackSide, ClampToEdgeWrapping, DataTexture, DataUtils, HalfFloatType, LinearFilter, Mesh,
  RGBAFormat, ShaderMaterial, SphereGeometry, Vector3
} from "three"
import { ForwardDiffraction } from "../engine/atmosphere/ForwardDiffraction.js"
import { IceHaloEffect } from "./IceHaloEffect.js"

/**
 * The glow the air and a thin cloud make round a bright source by diffraction — the aureole of the
 * haze and the corona of a water veil (see ForwardDiffraction) — drawn on the sky round it.
 *
 * A cap of the sky sphere, centred on the source and no wider than the profile reaches, so that only
 * the pixels round the source pay for it. Each of them works out its own angle from the source and
 * reads the profile at that angle: the rings of a corona are as sharp as the screen allows, which
 * the sky's own tables, a couple of degrees to a texel, could never be.
 *
 * The profile itself — what the scene's photometry makes of the physics at each angle — is handed
 * in from outside, because it depends on the light the eye is adapted to, which the sky holds.
 */
export class SourceDiffraction {
  /** On the same sphere as the ice halos, and for the same reason: inside the sky, behind the ground. */
  static readonly RADIUS = IceHaloEffect.RADIUS

  readonly object: Mesh<SphereGeometry, ShaderMaterial>
  private readonly texels: Uint16Array
  private readonly texture: DataTexture
  private readonly up = new Vector3(0, 1, 0)
  private readonly towards = new Vector3()

  constructor() {
    const steps = ForwardDiffraction.STEPS
    this.texels = new Uint16Array(steps * 4)
    this.texture = new DataTexture(this.texels, steps, 1, RGBAFormat, HalfFloatType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = ClampToEdgeWrapping
    this.texture.wrapT = ClampToEdgeWrapping
    this.texture.needsUpdate = true
    const material = new ShaderMaterial({
      uniforms: {
        uSource: { value: new Vector3(0, 1, 0) },
        uMaxAngle: { value: ForwardDiffraction.MAX_ANGLE_RAD },
        uMap: { value: this.texture },
        uSteps: { value: steps }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSource;
        uniform float uMaxAngle;
        uniform float uSteps;
        uniform sampler2D uMap;
        varying vec3 vDirection;
        void main() {
          float angle = acos(clamp(dot(normalize(vDirection), uSource), -1.0, 1.0));
          float along = angle / uMaxAngle;
          if (along > 1.0) discard;
          // Texel centres: the first holds the source's own direction, the last the cap's edge.
          vec3 light = texture2D(uMap, vec2((along * (uSteps - 1.0) + 0.5) / uSteps, 0.5)).rgb;
          gl_FragColor = vec4(light, 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    // A cap round +Y, turned onto the source below.
    this.object = new Mesh(new SphereGeometry(SourceDiffraction.RADIUS, 128, 32, 0, Math.PI * 2, 0, ForwardDiffraction.MAX_ANGLE_RAD), material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /**
   * Shows the glow round a source in this direction, from a profile of display colours at every step
   * of ForwardDiffraction's angles — or hides it, when there is none.
   *
   * @param profile Linear display RGB, interleaved, ForwardDiffraction.STEPS of them.
   */
  show(source: { x: number, y: number, z: number } | undefined, profile?: Float32Array): void {
    if (!source || !profile) {
      this.object.visible = false
      return
    }
    this.towards.set(source.x, source.y, source.z).normalize()
    this.object.quaternion.setFromUnitVectors(this.up, this.towards)
    ;(this.object.material.uniforms.uSource.value as Vector3).copy(this.towards)
    for (let step = 0; step < ForwardDiffraction.STEPS; step++) {
      for (let channel = 0; channel < 3; channel++) {
        this.texels[step * 4 + channel] = DataUtils.toHalfFloat(Math.min(profile[step * 3 + channel], 60000))
      }
      this.texels[step * 4 + 3] = DataUtils.toHalfFloat(1)
    }
    this.texture.needsUpdate = true
    this.object.visible = true
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
    this.texture.dispose()
  }
}
