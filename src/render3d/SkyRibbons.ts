import { AdditiveBlending, DoubleSide, MeshBasicMaterial, type Mesh } from "three"
import { PointSources } from "./PointSources.js"

/**
 * The ribbons the sky's moving lights leave — a meteor's streak, a comet's tail, a re-entering piece's
 * train — as one kind of thing, so that they can be drawn into the eye's picture at its own pixels
 * with the points (see PointLayerPass).
 *
 * They were drawn into the render the picture is resampled from, which carries about two fifths of
 * the picture's pixels per radian at the centre of a 70 degree field: a streak a fraction of a degree
 * wide came out a staircase of blocks two and a half pixels across. Drawn at the picture's pixels,
 * with four samples to an edge, it is as fine as the picture.
 */
export class SkyRibbons {

  /**
   * The material every one of them is drawn with: additive and unlit, like every emitting thing in
   * this sky; fog off, since they are at the distance of the stars and not inside the weather; both
   * sides, since a band built from a cross product faces whichever way the geometry took it.
   */
  static material(): MeshBasicMaterial {
    return new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, side: DoubleSide })
  }

  /** Marks a ribbon so that a renderer can find it without being told of each (as PointSources.track). */
  static track(ribbon: Mesh): void {
    ribbon.userData.skyRibbon = true
  }

  private static readonly twins = new WeakMap<MeshBasicMaterial, MeshBasicMaterial>()

  /** The same ribbon material, to be drawn into the picture itself: see PointSources.outputMaterial. */
  static outputMaterial(material: MeshBasicMaterial): MeshBasicMaterial {
    let twin = SkyRibbons.twins.get(material)
    if (twin) return twin
    twin = SkyRibbons.material()
    twin.depthTest = false
    twin.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, PointSources.output)
      shader.vertexShader = SkyRibbons.patchOutput(shader.vertexShader)
    }
    twin.customProgramCacheKey = () => "sky-ribbon-output"
    SkyRibbons.twins.set(material, twin)
    return twin
  }

  static patchOutput(vertexShader: string): string {
    return vertexShader
      .replace("void main() {", `${PointSources.OUTPUT_UNIFORMS_GLSL}\nvoid main() {`)
      .replace(PointSources.PROJECT_ANCHOR, `${PointSources.PROJECT_ANCHOR}\n${PointSources.OUTPUT_PROJECTION_GLSL}`)
  }
}
