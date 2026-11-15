import { Color, Material, Mesh, MeshStandardMaterial } from "three"
import type { Object3D } from "three"

/**
 * The light that comes up at a body from below, from a town lit on the ground under it (see BodyJson.lightFromBelow): what shows a night
 * flock's white bellies when nothing else lights them.
 *
 * Not one of the scene's lights: the point lights of EmitterLights are few, given to whatever lights the observer most, and thirty birds a
 * hundred metres up would each have needed one. It is the light of a bright ground stretching under the body, taken as a uniform lower
 * hemisphere: a surface whose normal makes an angle θ with the downward vertical receives E (1 + cos θ) / 2 of it, E being what a surface
 * facing straight down receives, and sends back its albedo over π of that, as any matt surface does. Added to what the material gives out,
 * point by point, so that it lights the belly and the under side of the wings and leaves the back dark, whatever the body's attitude.
 *
 * A ground lit in patches (the streets of a town seen from 200 m) is not uniform, and its light comes more from straight below than from the
 * horizon: this is the even sky of a town's light turned upside down, the simplest statement, and the one an analyst can give a figure for.
 */
export class LightFromBelow {
  private static readonly KEY = "lightFromBelow"

  /** Readies every standard material of `scene` to be lit from below; idempotent. */
  static apply(scene: Object3D): void {
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) LightFromBelow.patch(material)
    })
  }

  /** Lights every material of `scene` readied by `apply` with an irradiance from below of `rgb`, in the scene's own light units. */
  static set(scene: Object3D, rgb: readonly [number, number, number]): void {
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        const uniform = (material as Material).userData[LightFromBelow.KEY] as { value: Color } | undefined
        uniform?.value.setRGB(rgb[0], rgb[1], rgb[2])
      }
    })
  }

  private static patch(material: Material): void {
    if (!(material instanceof MeshStandardMaterial) || material.userData[LightFromBelow.KEY]) return
    const uniform = { value: new Color(0, 0, 0) }
    material.userData[LightFromBelow.KEY] = uniform
    const previous = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.uniforms.lightFromBelow = uniform
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 lightFromBelow;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{
  vec3 belowView = normalize((viewMatrix * vec4(0.0, -1.0, 0.0, 0.0)).xyz);
  totalEmissiveRadiance += diffuseColor.rgb * RECIPROCAL_PI * lightFromBelow * 0.5 * (1.0 + dot(normal, belowView));
}`)
    }
    material.customProgramCacheKey = () => `${previousKey}|light-from-below`
    material.needsUpdate = true
  }
}
