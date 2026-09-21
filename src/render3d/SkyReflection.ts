import {
  ClampToEdgeWrapping, DataTexture, DataUtils, EquirectangularReflectionMapping, HalfFloatType, LinearFilter, Material,
  MeshStandardMaterial, Object3D, PMREMGenerator, RGBAFormat, RepeatWrapping, ShaderChunk, Texture, WebGLRenderTarget,
  WebGLRenderer
} from "three"
import { ScatteredSky } from "./ScatteredSky.js"

/**
 * The sky every surface of the scene mirrors, more or less.
 *
 * Every surface reflects: a share of the light that meets it leaves at the mirror angle, by Fresnel's
 * law — a few per cent head-on for paint or stone, most of it at grazing incidence, nearly all of it
 * from a metal, in the metal's colour — and the rougher the surface, the more that mirror image is
 * blurred. three.js works all of that out for its physical materials (roughness, metalness, Fresnel)
 * but has to be given something to mirror, and this scene never gave it anything: the only light a
 * surface could send back was the Sun's and the Moon's point highlights, which is why a metal with
 * nothing to reflect came out black, and why a craft "white like aluminium" had to be made nearly
 * non-metallic to be white at all.
 *
 * What it is given here is the sky of this instant (ScatteredSky.panorama), filtered for every
 * roughness (three's PMREM), as the environment of each PHYSICAL material only. Not as the scene's
 * environment: three hands that to its Lambert materials too — the ground, the relief, the roads,
 * the decor's own shapes — which would multiply their colour by the sky's. And the SPECULAR part
 * only: an environment also lights a surface diffusely, which the scene's hemisphere light, built
 * from the same sky, already does, and doing it twice would brighten everything.
 *
 * Not in it: the clouds and the Sun's disc, which the panorama does not hold, and the ground, which
 * it holds only as the air's light darkening downwards.
 */
export class SkyReflection {
  /** The filtered sky, once there is one — what every physical material's envMap points at. */
  static texture?: Texture

  private readonly equirect: DataTexture
  private readonly generator: PMREMGenerator
  private target?: WebGLRenderTarget

  constructor(renderer: WebGLRenderer) {
    SkyReflection.install()
    const { WIDTH: width, HEIGHT: height } = ScatteredSky.PANORAMA
    this.equirect = new DataTexture(new Uint16Array(width * height * 4), width, height, RGBAFormat, HalfFloatType)
    this.equirect.mapping = EquirectangularReflectionMapping
    this.equirect.minFilter = LinearFilter
    this.equirect.magFilter = LinearFilter
    this.equirect.wrapS = RepeatWrapping
    this.equirect.wrapT = ClampToEdgeWrapping
    this.generator = new PMREMGenerator(renderer)
  }

  /**
   * Filters the sky again. The panorama's columns start at north and turn through east; three's
   * equirectangular ones start a quarter turn round, at west, so they are laid a quarter over.
   */
  update(panorama: Float32Array): void {
    const { WIDTH: width, HEIGHT: height } = ScatteredSky.PANORAMA
    const texels = this.equirect.image.data as Uint16Array
    const shift = width / 4
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const from = (row * width + column) * 4
        const to = (row * width + ((column + shift) % width)) * 4
        for (let channel = 0; channel < 4; channel++) texels[to + channel] = DataUtils.toHalfFloat(panorama[from + channel])
      }
    }
    this.equirect.needsUpdate = true
    this.target = this.generator.fromEquirectangular(this.equirect, this.target)
    SkyReflection.texture = this.target.texture
  }

  /** Hands the filtered sky to every physical material under `object` — see the class comment. */
  static reflectOn(object: Object3D): void {
    object.traverse(child => {
      const material = (child as { material?: Material | Material[] }).material
      for (const each of Array.isArray(material) ? material : material ? [material] : []) SkyReflection.reflect(each)
    })
  }

  static reflect(material: Material): void {
    const texture = SkyReflection.texture
    if (!texture || !(material instanceof MeshStandardMaterial) || material.envMap === texture) return
    material.envMap = texture
    material.needsUpdate = true
  }

  dispose(): void {
    this.target?.dispose()
    this.generator.dispose()
    this.equirect.dispose()
  }

  private static installed = false

  /** Takes the diffuse part out of what a physical material's environment gives it — see the class
   * comment. Once for the page: three's chunks are global. */
  private static install(): void {
    if (SkyReflection.installed) return
    SkyReflection.installed = true
    const diffuse = "iblIrradiance += getIBLIrradiance( geometryNormal );"
    if (!ShaderChunk.lights_fragment_maps.includes(diffuse)) {
      console.warn("SkyReflection: three's lights_fragment_maps changed; the environment will light diffusely too")
      return
    }
    ShaderChunk.lights_fragment_maps = ShaderChunk.lights_fragment_maps.replace(diffuse,
      "// The sky's diffuse light is the hemisphere light's (see SkyReflection).")
  }
}
