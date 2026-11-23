import type { Material } from "three"
import { cloudTransmissionShader } from "./VolumetricClouds.js"
import type { VolumetricCloudLayer } from "./VolumetricClouds.js"

/**
 * Has a material of the scene dimmed, fragment by fragment, by the clouds between the eye and it: the same density field the decks are drawn
 * with, read along the ray up to the fragment and no further (see cloudTransmissionShader), so that a beam of light behind a cloud is hidden
 * by it as the cloud is drawn, and seen through the gaps between. What PhenomenonSystem does for the phenomena, for any material whose
 * fragment's alpha weighs its light (an additive one included).
 *
 * The decks' uniforms are shared, not copied: a deck that moves or thins dims the material at once. Only adding or taking away a deck
 * compiles it again.
 */
export class CloudDimming {
  private static readonly KEY = "cloudDimming"

  /** Dims `material` by `layers`; called again with the same decks, it does nothing. */
  static apply(material: Material, layers: readonly VolumetricCloudLayer[]): void {
    const signature = layers.map(layer => layer.mesh.uuid).join(",")
    if (material.userData[CloudDimming.KEY] === signature) return
    material.userData[CloudDimming.KEY] = signature
    material.customProgramCacheKey = () => `cloud-dimming|${signature}`
    material.onBeforeCompile = shader => {
      if (layers.length === 0) return
      shader.vertexShader = "varying vec3 dimmedPoint;\n" + shader.vertexShader.replace("#include <project_vertex>",
        "#include <project_vertex>\ndimmedPoint = (modelMatrix * vec4(transformed, 1.0)).xyz - cameraPosition;")
      let definitions = "varying vec3 dimmedPoint;\n"
      let attenuation = ""
      layers.forEach((layer, index) => {
        const prefix = `dim${index}_`
        for (const [name, uniform] of Object.entries(layer.uniforms)) shader.uniforms[prefix + name] = uniform
        definitions += cloudTransmissionShader(prefix)
        attenuation += `diffuseColor.a *= ${prefix}transmissionAt(normalize(dimmedPoint), length(dimmedPoint));\n`
      })
      shader.fragmentShader = definitions + shader.fragmentShader.replace("#include <opaque_fragment>", attenuation + "#include <opaque_fragment>")
    }
    material.needsUpdate = true
  }
}
