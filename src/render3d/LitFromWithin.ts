import type { Material, Mesh, Object3D } from "three"

/**
 * What a model's material says, among its extras, when it glows by a light inside it rather than of itself: the paper of a sky lantern lit
 * by its flame. `at` is where that light is, in the model's own frame (its file's metres); `mean` is the mean, over the material's own
 * surface, of what that light gives it (cos θ / d², see LitFromWithin), which the material's stated luminance is the mean of.
 */
export interface LitFromWithinExtras {
  at: [number, number, number]
  mean: number
}

/**
 * Makes the materials of a model that a light inside it lights glow as that light lights them, point by point: each by the cosine of the
 * light's incidence over the square of its distance, the illuminance a point source gives a surface, which a thin translucent sheet passes
 * on to both its faces. So a lantern's paper is brightest by its flame and dims towards its top and its corners, from wherever it is seen;
 * the luminance the body states for the material is the mean over the whole of it (see LitFromWithinExtras.mean), so its glare and its
 * point far off are as before.
 */
export class LitFromWithin {
  /** The extras' key (see LitFromWithinExtras). */
  static readonly EXTRAS = "litFromWithin"
  /** Nothing is brighter than this many times the mean: a point of the paper next to the flame would otherwise be infinitely bright. */
  private static readonly MOST = 40

  /** Gives every material of `scene` its extras say a light inside lights the shading that light gives it. */
  static apply(scene: Object3D): void {
    scene.traverse(child => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const lit = material.userData?.[LitFromWithin.EXTRAS] as LitFromWithinExtras | undefined
        if (lit && !material.userData.litFromWithinApplied) LitFromWithin.shade(material, lit)
      }
    })
  }

  private static shade(material: Material, lit: LitFromWithinExtras): void {
    material.userData.litFromWithinApplied = true
    const [x, y, z] = lit.at
    const literal = (value: number) => value.toFixed(6)
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vLitPosition;\nvarying vec3 vLitNormal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLitPosition = position;\nvLitNormal = normal;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
varying vec3 vLitPosition;
varying vec3 vLitNormal;
float litFromWithin() {
  vec3 toLight = vec3(${literal(x)}, ${literal(y)}, ${literal(z)}) - vLitPosition;
  float d2 = max(dot(toLight, toLight), 1e-6);
  float incidence = abs(dot(normalize(vLitNormal), toLight)) * inversesqrt(d2);
  return min(incidence / d2 / ${literal(lit.mean)}, ${literal(LitFromWithin.MOST)});
}`)
        .replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive * litFromWithin();")
    }
    material.customProgramCacheKey = () => `litFromWithin:${x},${y},${z},${lit.mean}`
    material.needsUpdate = true
  }
}
