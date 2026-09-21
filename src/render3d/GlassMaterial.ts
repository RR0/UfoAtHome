import { CustomBlending, DoubleSide, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, Texture } from "three"
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
 * THROUGH THE EYE, not by a product. The scene is on the screen as the eye's response to it
 * (EyeAdaptation), which is steeply compressive, and a reflection is a luminance times R, not a
 * response times R: a street lamp that the night-adapted eye sees at the top of its range still sees
 * its eight-per-cent reflection in a windscreen at nearly the top of it, where 8 % of the lamp's
 * pixel would have been a dim grey smudge — and a reflected lamp is exactly what a windscreen
 * misidentification is made of. Taking a response r back to its luminance, multiplying by R and
 * responding again comes out, whatever the eye is adapted to, as Rⁿr / (Rⁿr + 1 − r), n the
 * response's exponent; that is what is applied, to the luminance of what is mirrored, its colour kept.
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
        uSurroundings: { value: null },
        uIndex: { value: indexOfRefraction },
        uAbsorption: { value: GlassMaterial.ABSORPTION },
        uResponse: { value: EyeAdaptation.RESPONSE_EXPONENT }
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
        uniform float uIndex;
        uniform float uAbsorption;
        uniform float uResponse;
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
          vec3 around = textureCube(uSurroundings, reflect(view, normal)).rgb;
          // Through the eye's response rather than times it: see the class comment. Above the top
          // of the range (a lamp is drawn brighter than white) it is as bright as a response gets.
          float shown = dot(around, vec3(0.2126, 0.7152, 0.0722));
          float response = clamp(shown, 1e-5, 0.999);
          float dimmed = pow(wall, uResponse) * response;
          float reflected = dimmed / (dimmed + 1.0 - response);
          vec3 colour = shown > 1e-5 ? around / shown : vec3(0.0);
          gl_FragColor = vec4(colour * reflected, wall + (1.0 - wall) * uAbsorption);
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

  /** What stands round this glass, as a probe photographed it — see ReflectionProbe. */
  setSurroundings(texture: Texture): void {
    this.uniforms.uSurroundings.value = texture
  }

  /** What an eye is shown of a reflection, from what it is shown of the thing reflected (a response,
   * 0 to 1) and the share reflected — the shader's own arithmetic, for checking it. */
  static reflectedResponse(response: number, share: number): number {
    const r = Math.min(Math.max(response, 1e-5), 0.999)
    const dimmed = share ** EyeAdaptation.RESPONSE_EXPONENT * r
    return dimmed / (dimmed + 1 - r)
  }
}
