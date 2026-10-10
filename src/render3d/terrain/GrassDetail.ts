import { Vector2 } from "three"
import type { MeshLambertMaterial } from "three"

/**
 * The grain of grass on the ground the aerial photograph shows as green.
 *
 * The patch's photograph is a metre or two a pixel at best, so a lawn stood on is a smooth green smear a
 * few metres from the eye. What the eye expects of grass at that range is not a picture but a texture: tufts,
 * bare and thick patches, from a hand's width to a few metres. This adds it in the material, to the ground's
 * own colour, where that colour says grass — and nowhere else, so a road, a roof or bare earth keeps what the
 * photograph shows.
 *
 * Drawn from nothing: a sum of value-noise octaves in the patch's own metres, so it stays on the ground as
 * the observer walks (the patch moves with the world, not with the camera) and needs no picture, no
 * download and no credit. Each octave is let go of with distance before its pattern is finer than a pixel,
 * which is what keeps the far field from shimmering and costs the far field nothing.
 *
 * Which ground is grass is read off the photograph's own pixels: green outweighing red and blue together
 * (the "excess green" of remote sensing, 2G − R − B, over the brightness). That is a reading of a photograph taken some other
 * day, so a field mown, burnt or dry since reads as what it was then; a dark roof or a shadow can pass for
 * leaves. It is a detail on the picture, never a claim about the ground.
 */
export class GrassDetail {
  /**
   * Excess green over the whole brightness, in linear light, from which the ground starts to count as grass,
   * and where it counts fully. A share of the light rather than an amount of it, so a lit field and one in
   * shadow read alike, and a tan stubble (a little more green than red and blue, at 0.1 or so) does not.
   */
  static readonly GREEN_FROM = 0.22
  static readonly GREEN_FULL = 0.5

  /**
   * How far the grain swings the ground's brightness at most, either way, with every octave in play. Grass
   * seen from a metre or two is that contrasty and no more.
   */
  static readonly CONTRAST = 0.7

  /**
   * Puts the grain into the material's own shader. Safe to call once per material.
   *
   * By default it is laid where the material's own colour is green (the aerial photograph). With
   * `everywhere`, on a surface that is grass by construction (the top of a terrace of cultivated land), it
   * is laid wherever the surface is, whatever its flat colour.
   *
   * The pattern is read in the surface's OWN metres, never in the world's: the world is the camera's frame
   * (it slides under a walking observer, see SceneRenderer.updateDecorAnchoring), so a pattern read from it
   * would stay where it is on the screen while the ground went by under it. The surface's own metres move
   * with the surface. For a patch of terrain, which is rebuilt as the observer drives on, `material.userData
   * .grassOrigin` says where the patch's own origin stands from one fixed point of the recording, so that
   * the grain is the same grain from one patch to the next.
   */
  static install(material: MeshLambertMaterial, everywhere = false): void {
    const origin = new Vector2()
    material.userData.grassOrigin = origin
    material.onBeforeCompile = shader => {
      shader.uniforms.uGrassContrast = { value: GrassDetail.CONTRAST }
      shader.uniforms.uGrassOrigin = { value: origin }
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vGrassPatchXZ;\nuniform vec2 uGrassOrigin;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGrassPatchXZ = position.xz + uGrassOrigin;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying vec2 vGrassPatchXZ;
uniform float uGrassContrast;
float grassHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float grassNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(grassHash(i), grassHash(i + vec2(1.0, 0.0)), f.x), mix(grassHash(i + vec2(0.0, 1.0)), grassHash(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
        .replace("#include <map_fragment>", `#include <map_fragment>
{
  float lightness = diffuseColor.r + diffuseColor.g + diffuseColor.b;
  float green = (2.0 * diffuseColor.g - diffuseColor.r - diffuseColor.b) / max(lightness, 0.001);
  float grass = ${everywhere ? "1.0" : `smoothstep(${GrassDetail.GREEN_FROM.toFixed(4)}, ${GrassDetail.GREEN_FULL.toFixed(4)}, green) * smoothstep(0.02, 0.06, lightness)`};
  float eye = length(vViewPosition);
  // Patches of thick and thin grass, then tufts, then blades: each let go of before it is finer than a pixel.
  float grain = (grassNoise(vGrassPatchXZ * 0.35) - 0.5) * 0.9 * (1.0 - smoothstep(60.0, 220.0, eye))
    + (grassNoise(vGrassPatchXZ * 1.7) - 0.5) * 0.8 * (1.0 - smoothstep(25.0, 90.0, eye))
    + (grassNoise(vGrassPatchXZ * 6.3) - 0.5) * 0.7 * (1.0 - smoothstep(8.0, 35.0, eye))
    + (grassNoise(vGrassPatchXZ * 21.0) - 0.5) * 0.6 * (1.0 - smoothstep(2.5, 12.0, eye));
  float d = grain * uGrassContrast * grass;
  diffuseColor.rgb *= vec3(1.0 + d * 1.1, 1.0 + d, 1.0 + d * 1.25);
}`)
    }
    // A different program from every other Lambert material, which three tells apart by this key.
    material.customProgramCacheKey = () => everywhere ? "rr0-grass-detail-everywhere" : "rr0-grass-detail"
  }
}
