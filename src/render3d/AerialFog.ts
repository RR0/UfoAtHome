import { Color, Fog, ShaderChunk } from "three"
import type { Material } from "three"
import { AerialPerspective } from "../engine/atmosphere/AerialPerspective.js"
import type { Rgb } from "../engine/atmosphere/AerialPerspective.js"
import { AtmosphereProfile } from "../engine/atmosphere/AtmosphereProfile.js"

/**
 * The air between the eye and everything real in the scene — see AerialPerspective — drawn by
 * three.js's own fog, whose chunks it replaces.
 *
 * Replaces, rather than adds a pass, because every material that stands for something real
 * already takes the fog (the ground, the relief, the decor, the roads, the bodies of an
 * interpretation, whatever glTF they arrive as), and everything that must not (the sky, which is
 * that same air seen whole; the stars; the account's own phenomena, which are what the observer
 * SAW and already hold whatever haze was in the way) already says `fog: false`. So one change
 * reaches all of them, and a model loaded tomorrow is hazed without anyone remembering to.
 *
 * What the stock fog could not do, and why it was only ever a disguise for the ground disc's rim:
 * a single grey factor on the distance from the camera plane. Air is not that. It dims blue more
 * than red, so a thing is reddened while the air laid over it is blue; it thins with height, so a
 * crew at 1 500 m sees through a fraction of the haze a man on the ground does; and it depends on
 * the weather. Here, per channel, `T = exp(−(σ_air·ρ_air + σ_haze·ρ_haze)·d)`, the densities
 * averaged along the actual line from the eye to the fragment, and the fragment becomes
 * `colour·T + airlight·(1 − T)` — the airlight being the horizon's light by day and, by night,
 * no more than a white surface would send back under the same stars (see SceneRenderer.applyAir).
 *
 * Three's fog hands a shader four values and this needs three, so they travel in its slots: the
 * FOG'S `near` IS THE AIR'S EXTINCTION AT 550 nm AT THE SCENE'S GROUND, PER METRE, `far` THE HAZE'S
 * (anything falling included), and `color` the airlight. The ratios between the channels are the
 * physics' own and are fixed, so they are written into the shader once. The heights it measures
 * densities from are the scene's own y, zero at the ground under the recording's first position —
 * which is why the extinctions it is handed are those at THAT ground's altitude, not the sea's.
 *
 * Applied where three applies fog, after tone mapping, on the colour as it will be shown: not the
 * radiance a physicist would blend, but the same space the airlight is given in, as the scene
 * shows it.
 */
export class AerialFog extends Fog {
  constructor() {
    super(new Color(0, 0, 0), 0, 0)
    AerialFog.install()
  }

  /** The air of this instant, for a scene whose ground is at `groundAltitudeM` above sea level. */
  setAir(air: AerialPerspective, groundAltitudeM: number, airlight: readonly [number, number, number]): void {
    const { rayleigh, aerosol } = air.extinctionAt(groundAltitudeM)
    this.near = rayleigh
    this.far = aerosol
    this.color.setRGB(airlight[0], airlight[1], airlight[2])
  }

  /**
   * Fades a flat disc laid out to `endM` out over its last stretch, from `startM`, so the sky drawn
   * behind it shows through: its edge would otherwise stand out against the sky below the horizon as
   * a line. It used to fade into one horizon colour, the sky's average all around; the sky under the
   * horizon is not one colour (at dawn the Sun's side is far brighter than the other), so the rim
   * stood out as a light or dark line wherever the relief let it through, and blinked with each of
   * a walking observer's steps as the relief's own edge rose and fell over it (Valensole). What is
   * behind the rim is the sky itself, so fading to transparent meets it exactly, whatever the
   * direction and the hour. The only surface that needs it: the relief fades out on its own (see
   * TerrainMeshBuilder), and nothing else ends at the edge of the world.
   */
  static fadeRim(material: Material, startM: number, endM: number): void {
    material.transparent = true
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <fog_fragment>", `#include <fog_fragment>
          #ifdef USE_FOG
            gl_FragColor.a *= 1.0 - smoothstep(${startM.toFixed(1)}, ${endM.toFixed(1)}, length(vAerialWorld.xz - cameraPosition.xz));
          #endif`)
    }
    material.customProgramCacheKey = () => `aerial-rim-${startM.toFixed(1)}-${endM.toFixed(1)}`
    material.needsUpdate = true
  }

  private static installed = false

  /** Replaces three's fog chunks, once for the page — they are global, which is the point. */
  static install(): void {
    if (AerialFog.installed) return
    AerialFog.installed = true
    const reference = new AerialPerspective(1)
    const rayleigh = reference.rayleighRatios
    const haze: Rgb = [reference.aerosol[0] / reference.aerosol[1], 1, reference.aerosol[2] / reference.aerosol[1]]
    const vec3 = (rgb: Rgb) => `vec3(${rgb.map(x => x.toFixed(4)).join(", ")})`
    const air = AtmosphereProfile.RAYLEIGH_SCALE_HEIGHT_M.toFixed(1)
    const hazeHeight = AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M.toFixed(1)
    ShaderChunk.fog_pars_vertex = `
      #ifdef USE_FOG
        varying vec3 vAerialWorld;
      #endif`
    // From the view-space position every shader that takes fog already has, sprites included: the
    // view matrix is a rotation and a translation, so its transpose undoes the one about the eye.
    ShaderChunk.fog_vertex = `
      #ifdef USE_FOG
        vAerialWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
      #endif`
    ShaderChunk.fog_pars_fragment = `
      #ifdef USE_FOG
        uniform vec3 fogColor;
        varying vec3 vAerialWorld;
        #ifdef FOG_EXP2
          uniform float fogDensity;
        #else
          uniform float fogNear;
          uniform float fogFar;
        #endif
        // The mean of exp(-h/H) along the straight line from the eye's height to this one's.
        float aerialMeanDensity(float from, float to, float scaleHeight) {
          float rise = to - from;
          if (abs(rise) < 0.01) return exp(-from / scaleHeight);
          return scaleHeight * (exp(-from / scaleHeight) - exp(-to / scaleHeight)) / rise;
        }
      #endif`
    ShaderChunk.fog_fragment = `
      #ifdef USE_FOG
        #ifdef FOG_EXP2
          float fogFactor = 1.0 - exp(-fogDensity * fogDensity * dot(vAerialWorld - cameraPosition, vAerialWorld - cameraPosition));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
        #else
          float aerialDistance = length(vAerialWorld - cameraPosition);
          vec3 aerialExtinction =
            fogNear * ${vec3(rayleigh)} * aerialMeanDensity(cameraPosition.y, vAerialWorld.y, ${air}) +
            fogFar * ${vec3(haze)} * aerialMeanDensity(cameraPosition.y, vAerialWorld.y, ${hazeHeight});
          vec3 aerialTransmittance = exp(-aerialExtinction * aerialDistance);
          gl_FragColor.rgb = gl_FragColor.rgb * aerialTransmittance + fogColor * (1.0 - aerialTransmittance);
        #endif
      #endif`
  }
}
