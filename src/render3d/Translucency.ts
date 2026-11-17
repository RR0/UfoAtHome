import { Material, Mesh, MeshStandardMaterial } from "three"
import type { Object3D } from "three"

/**
 * The light a thin body lets through (see BodyJson.translucency): a gull's wing against the low Sun glows white and orange at its edges and
 * across its thinner feathers, where an opaque wing would be a black cut-out of the sky. What makes a flock lit from behind look lit.
 *
 * Each of the scene's directional lights (the Sun or the Moon, see SceneRenderer) falling on the far side of a surface, seen from the eye,
 * comes out of the near side: its irradiance on that far side, |N.L|, times the share let through, times the surface's colour, half of it
 * spread evenly (over π, as a matt surface's) and half forward, along the way the light goes (Henyey and Greenstein's lobe, g = 0.5, over the
 * hemisphere it comes out into): a wing seen against the Sun shines more than one seen across it. Added to what the material gives out, as
 * LightFromBelow's light is. Not shadowed: what it is for flies in the
 * open, and the shadow a decor would cast on it is taken from its near side.
 */
export class Translucency {
  private static readonly KEY = "translucency"

  /** Readies every standard material of `scene` to let `share` of the light through; idempotent, and sets the share again. */
  static apply(scene: Object3D, share: number): void {
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) Translucency.patch(material, share)
    })
  }

  private static patch(material: Material, share: number): void {
    if (!(material instanceof MeshStandardMaterial)) return
    const existing = material.userData[Translucency.KEY] as { value: number } | undefined
    if (existing) {
      existing.value = share
      return
    }
    const uniform = { value: share }
    material.userData[Translucency.KEY] = uniform
    const previous = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.uniforms.translucency = uniform
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float translucency;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
#if NUM_DIR_LIGHTS > 0
vec3 towardEye = normalize(vViewPosition);
for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
  float through = max(0.0, -dot(normal, directionalLights[i].direction));
  // Half of it out evenly, half forward (Henyey and Greenstein's lobe, g = 0.5): looking at the light through a feather is looking along the
  // way most of what it lets through goes.
  float cosAngle = dot(-directionalLights[i].direction, towardEye);
  float forward = 0.75 / (1.0 + 0.25 - cosAngle) / sqrt(1.0 + 0.25 - cosAngle) * RECIPROCAL_PI * 0.25;
  float phase = 0.5 * RECIPROCAL_PI + 0.5 * 2.0 * forward;
  totalEmissiveRadiance += diffuseColor.rgb * directionalLights[i].color * through * translucency * phase;
}
#endif`)
    }
    material.customProgramCacheKey = () => `${previousKey}|translucency`
    material.needsUpdate = true
  }
}
