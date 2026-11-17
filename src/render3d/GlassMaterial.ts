import { CustomBlending, DoubleSide, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, Texture, Vector3 } from "three"
import { EyeAdaptation } from "../engine/atmosphere/EyeAdaptation.js"

/**
 * Clear glass: a thin wall that mirrors the sky by Fresnel's law and lets through what it does not
 * mirror — what a model's surface becomes when its glTF says it transmits light
 * (KHR_materials_transmission), a cupola like the one Maurice Masse saw two beings through.
 *
 * WHAT IT DOES. A wall of glass is two faces, air to glass and glass back to air, and each reflects
 * a share R of the light that meets it — 4 % head-on for an index of 1.5, all of it at grazing
 * incidence. Light bouncing between the two faces adds up to 2R/(1+R) for the wall. That is the whole
 * of what makes glass read as glass: nearly clear where it faces the eye, a mirror of the sky towards
 * its rim, and whatever lies behind veiled by that mirror and not by a tint. What is mirrored is what
 * stands round the glass at this very instant (ReflectionProbe: the sky, its clouds, the Sun and the
 * Moon, the stars, a lamp, a car's lights, the decor), in the reflected direction.
 *
 * AS LIGHT, and the eye after. The scene is drawn as light and the eye's response applied once to
 * the whole frame (see FINISH_GLSL), so a reflection is simply the light mirrored times R — and the
 * response, steeply compressive, does the rest: a street lamp that the night-adapted eye sees at the
 * top of its range still sees its eight-per-cent reflection in a windscreen at nearly the top of it,
 * where 8 % of the lamp's pixel would have been a dim grey smudge. A reflected lamp is exactly what a
 * windscreen misidentification is made of. (Before the scene was drawn as light, the shader had to
 * take each response back to its luminance and respond again; reflectedResponse keeps that
 * arithmetic, which is what the frame's last pass now does.)
 *
 * WHAT IT DOES NOT, and why that is right or said. A thin wall shifts what is behind it by a
 * fraction of its own thickness: seen through a cupola a few millimetres thick, a cloud does not
 * bend, and drawing it bent would be drawing thick glass or a solid lens. The glass absorbs
 * ABSORPTION of what crosses a wall, as ordinary window glass does, grey rather than tinted.
 *
 * Blended premultiplied: what is behind is kept in the share the wall lets through, and the
 * reflection is added on top — which three's ordinary transparency, a mix by one opacity, cannot say.
 * Its own screen-space transmission cannot either: it refracts only what is opaque, and the clouds
 * this glass has to show are not.
 */
export class GlassMaterial extends ShaderMaterial {
  /** What a wall of window glass absorbs of the light that crosses it. */
  static readonly ABSORPTION = 0.03

  constructor(indexOfRefraction = 1.5) {
    super({
      uniforms: {
        ...GlassMaterial.DISCS,
        uSurroundings: { value: null },
        uIndex: { value: indexOfRefraction },
        uAbsorption: { value: GlassMaterial.ABSORPTION }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          // The normal matrix undoes a stretch the body was given; the view's own rotation, turned
          // back, takes the normal from the eye's axes to the world's.
          vWorldNormal = transpose(mat3(viewMatrix)) * (normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform samplerCube uSurroundings;
        uniform vec3 uDiscDirection[2];
        uniform float uDiscCosRadius[2];
        uniform vec3 uDiscRadiance[2];
        uniform float uIndex;
        uniform float uAbsorption;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;

        // One face, air to glass: unpolarised Fresnel reflectance.
        float face(float cosIn, float index) {
          float sinOut2 = (1.0 - cosIn * cosIn) / (index * index);
          float cosOut = sqrt(max(0.0, 1.0 - sinOut2));
          float perpendicular = (cosIn - index * cosOut) / (cosIn + index * cosOut);
          float parallel = (cosOut - index * cosIn) / (cosOut + index * cosIn);
          return 0.5 * (perpendicular * perpendicular + parallel * parallel);
        }

        void main() {
          vec3 view = normalize(vWorldPosition - cameraPosition);
          vec3 normal = normalize(vWorldNormal);
          if (dot(normal, view) > 0.0) normal = -normal;
          float cosIn = clamp(-dot(view, normal), 0.0, 1.0);
          float once = face(cosIn, uIndex);
          float wall = 2.0 * once / (1.0 + once);
          vec3 mirrored = reflect(view, normal);
          vec3 around = textureCube(uSurroundings, mirrored).rgb;
          // The Sun's and the Moon's discs, which the probe leaves out (see GlassMaterial.setDisc).
          for (int i = 0; i < 2; i++) if (dot(normalize(mirrored), uDiscDirection[i]) >= uDiscCosRadius[i]) around += uDiscRadiance[i];
          gl_FragColor = vec4(around * wall, wall + (1.0 - wall) * uAbsorption);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      fog: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor
    })
  }

  /** What a wall reflects, both its faces together, for light meeting it at this cosine — the
   * shader's own sum, for checking it. */
  static wallReflectance(cosIncident: number, index: number, faceReflectance: (cos: number, from: number, to: number) => number): number {
    const once = faceReflectance(cosIncident, 1, index)
    return (2 * once) / (1 + once)
  }

  /**
   * The discs of the Sun and the Moon, shared by every glass: where each is (a unit direction in the scene's frame), how wide, and its
   * radiance as the sky draws it (the Moon's averaged over its whole disc, its phase taken as the share lit: half a degree in a windscreen
   * does not show a crescent). The probe leaves the discs out, since every other glossy surface has them from their lights (see
   * SceneRenderer.refreshReflections), and glass, which mirrors the photograph sharp, would have lost the windscreen's glint of the Sun.
   */
  private static readonly DISCS = {
    uDiscDirection: { value: [new Vector3(0, 1, 0), new Vector3(0, 1, 0)] },
    uDiscCosRadius: { value: [2, 2] },
    uDiscRadiance: { value: [new Vector3(), new Vector3()] }
  }

  private static readonly DISC_INDEX = { sun: 0, moon: 1 } as const

  /** Where the Sun's or the Moon's disc is and how bright, or undefined when none is drawn (see DISCS). */
  static setDisc(key: "sun" | "moon", disc: { direction: [number, number, number], radiusRad: number, radiance: [number, number, number] } | undefined): void {
    const i = GlassMaterial.DISC_INDEX[key]
    const discs = GlassMaterial.DISCS
    if (!disc) {
      discs.uDiscCosRadius.value[i] = 2
      discs.uDiscRadiance.value[i].set(0, 0, 0)
      return
    }
    discs.uDiscDirection.value[i].set(...disc.direction).normalize()
    discs.uDiscCosRadius.value[i] = Math.cos(disc.radiusRad)
    discs.uDiscRadiance.value[i].set(...disc.radiance)
  }

  /** What stands round this glass, as a probe photographed it — see ReflectionProbe. */
  setSurroundings(texture: Texture): void {
    this.uniforms.uSurroundings.value = texture
  }

  /** What an eye is shown of a reflection, from what it is shown of the thing reflected (a response,
   * 0 to 1) and the share reflected: the light behind that response, times the share, responded to
   * — what the frame's last pass makes of the shader's product. */
  static reflectedResponse(response: number, share: number): number {
    return EyeAdaptation.respond(share * EyeAdaptation.relativeOfResponse(Math.max(response, 1e-5)))
  }
}
