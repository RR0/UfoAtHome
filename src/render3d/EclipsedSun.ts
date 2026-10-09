import {
  AdditiveBlending, BackSide, ClampToEdgeWrapping, DataTexture, DataUtils, HalfFloatType, LinearFilter, Mesh, MeshBasicMaterial, RedFormat,
  RepeatWrapping, ShaderMaterial, SphereGeometry, Vector3
} from "three"
import type { LimbProfile } from "../engine/astronomy/LunarLimb.js"
import { IceHaloEffect } from "./IceHaloEffect.js"

/**
 * The Moon in front of the Sun, as the scene draws it: the Sun's disc with the Moon's cut out of it,
 * and the corona round it that only a total eclipse lets anyone see.
 *
 * Both work in directions, not in the screen: each pixel asks where it looks, and how far that is
 * from the Sun's centre and from the Moon's. The cut is therefore the same circle at any field of
 * view and through any lens, and its edge is anti-aliased by the width of the pixel itself.
 */
export class EclipsedSun {
  /**
   * What every pixel asks of the Moon: where its centre is, how wide it is, and how ragged its edge. The
   * same uniforms serve the Sun's disc and the corona, so that the two are cut by the one edge.
   *
   * The edge is a radius at each position angle (see LunarLimb): a circle's sine plus the profile's
   * departure from it, which is seconds of arc, kept as such in a texture of its own and added to the
   * circle here. A pixel's distance from the Moon's centre is taken as the length of the part of its
   * direction that is not along it, which keeps a hundredth of an arcsecond where an arccosine would
   * have kept ten.
   */
  readonly cut = {
    uMoon: { value: new Vector3(0, 1, 0) },
    uSinRadius: { value: -1 },
    uUp: { value: new Vector3(0, 1, 0) },
    uRight: { value: new Vector3(1, 0, 0) },
    uLimbMap: { value: EclipsedSun.flatMap() as DataTexture },
    uLimbScale: { value: 0 },
    uLimbHalfTexel: { value: 0 }
  }

  /** The cut's GLSL: `moonCover(direction)` is 1 where the Moon is in front, 0 where it is not, anti-aliased by the pixel's own width. */
  static readonly GLSL = `
    uniform vec3 uMoon;
    uniform float uSinRadius;
    uniform vec3 uUp;
    uniform vec3 uRight;
    uniform sampler2D uLimbMap;
    uniform float uLimbScale;
    uniform float uLimbHalfTexel;
    float moonCover(vec3 direction) {
      if (uSinRadius < 0.0) return 0.0;
      vec3 away = direction - uMoon * dot(direction, uMoon);
      float distance = length(away);
      float angle = atan(dot(away, uRight), dot(away, uUp));
      float ragged = texture2D(uLimbMap, vec2(angle / 6.283185307 + uLimbHalfTexel, 0.5)).r * uLimbScale;
      float edge = max(fwidth(distance), 1e-9);
      return 1.0 - smoothstep(uSinRadius + ragged - edge, uSinRadius + ragged + edge, distance);
    }
  `

  /**
   * The Sun's material, a plain self-lit one that discards nothing and covers what the Moon does:
   * the sky behind shows through where the Moon is, because a Moon beyond the Sun's rim is simply
   * not seen against a sky that bright (and in a total eclipse, the sky there is the dark one).
   */
  material(): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ fog: false, transparent: true })
    const cut = this.cut
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, cut)
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec3 vEclipseDirection;\nvoid main() {")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vEclipseDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;")
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", EclipsedSun.GLSL + "\nvarying vec3 vEclipseDirection;\nvoid main() {")
        .replace("#include <opaque_fragment>", `
          diffuseColor.a *= 1.0 - moonCover(normalize(vEclipseDirection));
          #include <opaque_fragment>`)
    }
    return material
  }

  /**
   * Points the cut at the Moon, `radiusDeg` wide; undefined takes it away.
   *
   * `limb`, when there is one, is the Moon's ragged edge (see LunarLimb): its departures from the
   * mean radius, scaled by `scale` like every other angle of the drawn eclipse, over the position
   * angles of `up` (0°) and `right` (90°), two directions on the sky at the Moon, in the scene's frame.
   */
  setMoon(
    direction: { x: number, y: number, z: number } | undefined,
    radiusDeg = 0,
    limb?: { profile: LimbProfile, scale: number, up: { x: number, y: number, z: number }, right: { x: number, y: number, z: number } }
  ): void {
    if (!direction) {
      this.cut.uSinRadius.value = -1
      return
    }
    this.cut.uMoon.value.set(direction.x, direction.y, direction.z).normalize()
    this.cut.uSinRadius.value = Math.sin((radiusDeg * Math.PI) / 180)
    if (!limb) {
      this.cut.uLimbScale.value = 0
      return
    }
    this.cut.uUp.value.set(limb.up.x, limb.up.y, limb.up.z).normalize()
    this.cut.uRight.value.set(limb.right.x, limb.right.y, limb.right.z).normalize()
    this.uploadLimb(limb.profile)
    // Arcseconds in the texture, radians of sine here.
    this.cut.uLimbScale.value = (limb.scale * Math.PI) / 180 / 3600
  }

  private limbUploaded?: LimbProfile
  private limbTexture?: DataTexture

  private uploadLimb(profile: LimbProfile): void {
    if (this.limbUploaded === profile) return
    const n = profile.radiusDeg.length
    const texels = new Uint16Array(n)
    for (let i = 0; i < n; i++) texels[i] = DataUtils.toHalfFloat((profile.radiusDeg[i] - profile.meanRadiusDeg) * 3600)
    this.limbTexture?.dispose()
    const texture = new DataTexture(texels, n, 1, RedFormat, HalfFloatType)
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    // The position angle goes once round: the edge of the strip meets its other edge.
    texture.wrapS = RepeatWrapping
    texture.wrapT = ClampToEdgeWrapping
    texture.needsUpdate = true
    this.limbTexture = texture
    this.cut.uLimbMap.value = texture
    this.cut.uLimbHalfTexel.value = 0.5 / n
    this.limbUploaded = profile
  }

  /** A one-texel map of no departure at all, for a Moon with no relief to give. */
  private static flatMap(): DataTexture {
    const texture = new DataTexture(new Uint16Array([0]), 1, 1, RedFormat, HalfFloatType)
    texture.needsUpdate = true
    return texture
  }
}

/**
 * The solar corona, drawn where the Moon's disc is not: a cap of the sky round the Sun whose pixels
 * read their own distance from it, in Sun radii, and their own light from a law of that distance.
 *
 * The law is the mean of the observed white-light corona, in units of the mean brightness of the
 * Sun's disc: 3·10⁻⁶ · r⁻⁴·⁵ for r in solar radii (1.1 R☉: 2·10⁻⁶, 2 R☉: 1.3·10⁻⁷, 4 R☉: 6·10⁻⁹,
 * after Allen's tables), whose integral over the whole corona is the full Moon's light, 1.5
 * millionths of the Sun's — the same figure SolarEclipse.CORONA_LIGHT adds to the beam. Round:
 * the streamers of a real corona, long at the equator near solar maximum and plumed at the poles
 * near minimum, depend on the day's own Sun and are not drawn.
 */
export class SolarCorona {
  /** Wide enough that 3·10⁻⁶·r⁻⁴·⁵ at its edge is under a tenth of a thousandth of what the eye can tell from black. */
  static readonly MAX_RADII = 10
  /** The sun's radius as the scene draws it, the cap and the law's unit — see SceneRenderer.SUN_MOON_VISUAL_RADIUS. */
  static readonly COEFFICIENT = 3e-6
  static readonly EXPONENT = 4.5

  readonly object: Mesh<SphereGeometry, ShaderMaterial>
  private readonly up = new Vector3(0, 1, 0)
  private readonly towards = new Vector3()

  constructor(sunRadiusRad: number, cut: EclipsedSun["cut"]) {
    const maxAngle = sunRadiusRad * SolarCorona.MAX_RADII
    const material = new ShaderMaterial({
      uniforms: {
        ...cut,
        uSun: { value: new Vector3(0, 1, 0) },
        uSunRadius: { value: sunRadiusRad },
        uMaxRadii: { value: SolarCorona.MAX_RADII },
        uRadiance: { value: new Vector3(0, 0, 0) },
        uCoefficient: { value: SolarCorona.COEFFICIENT },
        uExponent: { value: SolarCorona.EXPONENT }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform vec3 uSun;
        uniform float uSunRadius;
        uniform float uMaxRadii;
        uniform vec3 uRadiance;
        uniform float uCoefficient;
        uniform float uExponent;
        varying vec3 vDirection;
        ${EclipsedSun.GLSL}
        void main() {
          vec3 direction = normalize(vDirection);
          float angle = acos(clamp(dot(direction, uSun), -1.0, 1.0));
          float radii = max(angle / uSunRadius, 1.0);
          if (radii > uMaxRadii) discard;
          // Fades to nothing over the last radius of the cap, so that its rim never shows.
          float fade = clamp(uMaxRadii - radii, 0.0, 1.0);
          float brightness = uCoefficient * pow(radii, -uExponent) * (1.0 - moonCover(direction)) * fade;
          gl_FragColor = vec4(uRadiance * brightness, 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(IceHaloEffect.RADIUS, 96, 32, 0, Math.PI * 2, 0, maxAngle), material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /**
   * Shows the corona round the Sun, with the Moon in front of it, in a Sun whose disc is
   * `radiance` bright (relative units, per channel); or hides it.
   */
  show(sun: { x: number, y: number, z: number } | undefined, radiance: readonly number[]): void {
    if (!sun) {
      this.object.visible = false
      return
    }
    const uniforms = this.object.material.uniforms
    this.towards.set(sun.x, sun.y, sun.z).normalize()
    this.object.quaternion.setFromUnitVectors(this.up, this.towards)
    ;(uniforms.uSun.value as Vector3).copy(this.towards)
    ;(uniforms.uRadiance.value as Vector3).set(radiance[0], radiance[1], radiance[2])
    this.object.visible = true
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
  }
}
