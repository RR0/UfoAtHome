import {
  CustomBlending, DataTexture, DataUtils, DoubleSide, HalfFloatType, LinearFilter, OneFactor, OneMinusSrcAlphaFactor,
  ClampToEdgeWrapping, RGBAFormat, RepeatWrapping, ShaderMaterial
} from "three"
import { ScatteredSky } from "./ScatteredSky.js"

/**
 * Clear glass: a thin wall that mirrors the sky by Fresnel's law and lets through what it does not
 * mirror — what a model's surface becomes when its glTF says it transmits light
 * (KHR_materials_transmission), a cupola like the one Maurice Masse saw two beings through.
 *
 * WHAT IT DOES. A wall of glass is two faces, air to glass and glass back to air, and each reflects
 * a share R of the light that meets it — 4 % head-on for an index of 1.5, all of it at grazing
 * incidence. Light bouncing between the two faces adds up to 2R/(1+R) for the wall. That is the whole
 * of what makes glass read as glass: nearly clear where it faces the eye, a mirror of the sky towards
 * its rim, and whatever lies behind veiled by that mirror and not by a tint. What is mirrored is the
 * sky of this very instant (ScatteredSky.panorama), in the reflected direction, so a dome at dawn
 * holds the dawn on the side it faces.
 *
 * WHAT IT DOES NOT, and why that is right or said. A thin wall shifts what is behind it by a
 * fraction of its own thickness: seen through a cupola a few millimetres thick, a cloud does not
 * bend, and drawing it bent would be drawing thick glass or a solid lens. The clouds and the Sun are
 * not in the panorama, which holds the scattered sky alone, so neither is mirrored. The glass absorbs
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

  /** The sky every glass mirrors, shared by all of them and restated with the sky. */
  static readonly sky = GlassMaterial.buildSky()

  constructor(indexOfRefraction = 1.5) {
    super({
      uniforms: {
        uSky: { value: GlassMaterial.sky },
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
        uniform sampler2D uSky;
        uniform float uIndex;
        uniform float uAbsorption;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        const float PI = 3.141592653589793;

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
          // North is -z and east +x, as everywhere in this scene.
          float azimuth = atan(mirrored.x, -mirrored.z);
          vec2 at = vec2(fract(azimuth / (2.0 * PI) + 1.0), asin(clamp(mirrored.y, -1.0, 1.0)) / PI + 0.5);
          vec3 sky = texture2D(uSky, at).rgb;
          gl_FragColor = vec4(sky * wall, wall + (1.0 - wall) * uAbsorption);
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

  /** Restates the sky every glass mirrors, from the scattered sky's panorama. */
  static setSky(panorama: Float32Array): void {
    const texels = GlassMaterial.sky.image.data as Uint16Array
    for (let i = 0; i < panorama.length; i++) texels[i] = DataUtils.toHalfFloat(panorama[i])
    GlassMaterial.sky.needsUpdate = true
  }

  private static buildSky(): DataTexture {
    const { WIDTH: width, HEIGHT: height } = ScatteredSky.PANORAMA
    const texture = new DataTexture(new Uint16Array(width * height * 4), width, height, RGBAFormat, HalfFloatType)
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.wrapS = RepeatWrapping
    texture.wrapT = ClampToEdgeWrapping
    texture.needsUpdate = true
    return texture
  }
}
