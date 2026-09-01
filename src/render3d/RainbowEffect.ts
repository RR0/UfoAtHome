import {
  AdditiveBlending,
  BackSide,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  Mesh,
  RGBAFormat,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from "three"
import { RainbowSky } from "../engine/atmosphere/RainbowSky.js"

/**
 * Draws what falling water does to the light of the Sun or the Moon.
 *
 * Not drawn bow by bow. RainbowSky traces light through drops and hands back how bright the sky is
 * at every angle from the source; this reads that curve and paints it. So the bright bow, the
 * fainter reversed one outside it, the dark band between them and the glow filling the sky inside
 * the first are not four pieces of code here. They are four parts of one curve, and no line below
 * knows the name of any of them.
 *
 * ONE CURVE IS THE WHOLE THING, which is what makes this so much smaller than the ice display's
 * machinery. A drop is a sphere: nothing about the weather can turn it, so there is only ever one
 * answer, it does not depend on how high the source stands, and it is computed once for the life of
 * the scene. Where the bow STANDS moves with the source, and that is the shader's whole job — every
 * point of a bow is at a fixed angle from the light, so a fragment that knows its own direction
 * knows everything.
 *
 * Drawn on a sphere for the same reason the ice display is: a bow is an angle, not a place, so a
 * shader working from directions is right under every projection this scene has, the witness's own
 * eye included. The part of the circle below the horizon is drawn and then hidden by the ground that
 * stands in front of it — which is why a witness raised above the rain, in an aircraft or on a cliff
 * over a shower, sees more of it, exactly as they do in life.
 */
export class RainbowEffect {
  /** Just inside the sky dome, alongside the ice display: both are the source's own light bent by
   * water or by ice, and a sky can honestly show both at once — a shower under a cirrus veil. */
  private static readonly RADIUS = 880

  /**
   * What the traced radiance is multiplied by to become screen light.
   *
   * The one number here that is a choice, and it is the same choice the ice display has to make: the
   * curve says how a drop spreads the light that falls on it, and turning that into a brightness
   * needs to know how MUCH water stood in the line of sight, which "it was raining" does not say.
   * So this sets the scale of an ordinary shower's bow, and everything within the display keeps the
   * ratio the physics gave it — the secondary stays as much fainter than the primary as it really
   * is, and the band between them stays as dark.
   *
   * SET AGAINST CLIPPING rather than by eye, which is the only way a number like this can be argued
   * about. A bow stands against a bright sky, and additive light that runs past what the screen can
   * show does not make it brighter — it flattens the display into one white band and takes the
   * colours out, the very thing this exists to draw. So the rule is the highest gain at which none
   * of the bow's own pixels clip, measured in a live scene against a daylit sky: 0.25 clips, 0.5
   * clips a sixth of them, and this value clips nothing while the primary still adds about a third
   * again to the brightness of the sky it stands on.
   *
   * RE-MEASURED after the fullscreen passes were found to be skipping the sRGB encoding
   * (see colorSpace.ts), which had been showing every scene far darker than it is: the same
   * criterion in the corrected picture gives 0.22 where it had given 0.15. Nothing about the bow
   * changed — the sky it is added to did.
   */
  private static readonly GAIN = 0.22

  /**
   * How much of a moonbow's colour survives to be seen.
   *
   * A moonbow is the same spectrum as a rainbow — the drops do not know what is lighting them — and
   * yet people who have watched one describe a WHITE arc. That is not the sky, it is the eye: at a
   * few thousandths of the light of a daylit bow, colour vision has nothing to work with and the
   * rods answer alone. Since this project draws what reached the witness rather than what was in the
   * air, the colour is taken out here rather than left in for a viewer to enjoy.
   */
  private static readonly MOON_SATURATION = 0.15

  readonly object: Mesh
  private readonly material: ShaderMaterial
  private readonly sky = new RainbowSky()
  private readonly texture: DataTexture
  private readonly texels: Uint16Array
  private computed = false

  constructor() {
    this.texels = new Uint16Array(RainbowSky.BINS * 4)
    this.texture = new DataTexture(this.texels, RainbowSky.BINS, 1, RGBAFormat, HalfFloatType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = ClampToEdgeWrapping
    this.texture.wrapT = ClampToEdgeWrapping
    this.texture.needsUpdate = true
    this.material = new ShaderMaterial({
      uniforms: {
        uSource: { value: new Vector3(0, 1, 0) },
        uStrength: { value: 0 },
        uTint: { value: new Vector3(1, 1, 1) },
        uSaturation: { value: 1 },
        uProfile: { value: this.texture },
        uGain: { value: RainbowEffect.GAIN }
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
        varying vec3 vDirection;
        uniform vec3 uSource;
        uniform float uStrength;
        uniform vec3 uTint;
        uniform float uSaturation;
        uniform sampler2D uProfile;
        uniform float uGain;

        void main() {
          vec3 dir = normalize(vDirection);
          // How far round from the source this line of sight is, which is the only thing a drop
          // cares about. Zero is straight at the source and half a turn is straight away from it —
          // the antisolar point, the centre every bow is drawn around.
          float scattering = acos(clamp(dot(dir, normalize(uSource)), -1.0, 1.0));
          vec3 light = texture2D(uProfile, vec2(scattering / 3.14159265, 0.5)).rgb * uGain * uTint;
          // Colour that the eye could not have resolved is taken back out — see MOON_SATURATION.
          float grey = dot(light, vec3(0.2126, 0.7152, 0.0722));
          light = mix(vec3(grey), light, uSaturation);
          gl_FragColor = vec4(light * uStrength, 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(RainbowEffect.RADIUS, 64, 32), this.material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /**
   * Points the display at a light source and sets how strongly the sky could have shown it.
   *
   * `strength` of zero takes the whole thing down, which is the usual state of the sky: no rain, or
   * no sunlight reaching it, and no bow. `saturated` says whether the light was strong enough for an
   * eye to see the colours at all — false for a moonbow, which is white.
   */
  update(
    source: { x: number; y: number; z: number },
    strength: number,
    tint: [number, number, number],
    saturated: boolean
  ): void {
    const uniforms = this.material.uniforms
    if (strength <= 0) {
      // Zeroed as well as hidden, so the effect never REPORTS a strength it is not showing — that is
      // how a probe of the live scene ends up believing a display is up when it is not.
      uniforms.uStrength.value = 0
      this.object.visible = false
      return
    }
    // Traced on the first sky that could actually show one, rather than in the constructor: most
    // scenes never rain, and they should not pay for a display they will not draw.
    if (!this.computed) this.publish()
    uniforms.uSource.value.set(source.x, source.y, source.z).normalize()
    uniforms.uStrength.value = strength
    uniforms.uTint.value.set(tint[0], tint[1], tint[2])
    uniforms.uSaturation.value = saturated ? 1 : RainbowEffect.MOON_SATURATION
    this.object.visible = true
  }

  /** Copies the traced curve onto the texture the shader reads. Half-float rather than byte, because
   * the display spans two orders of magnitude between the primary's edge and the band beyond it, and
   * a byte would band the dark end into steps. */
  private publish(): void {
    const profile = this.sky.compute()
    const data = profile.data
    for (let texel = 0, at = 0; at < data.length; texel += 4, at += 3) {
      this.texels[texel] = DataUtils.toHalfFloat(data[at])
      this.texels[texel + 1] = DataUtils.toHalfFloat(data[at + 1])
      this.texels[texel + 2] = DataUtils.toHalfFloat(data[at + 2])
      this.texels[texel + 3] = 1
    }
    this.texture.needsUpdate = true
    this.computed = true
  }

  dispose(): void {
    this.texture.dispose()
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
