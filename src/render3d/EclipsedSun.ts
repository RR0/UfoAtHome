import { AdditiveBlending, BackSide, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry, Vector3 } from "three"
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
  /** Where the Moon's disc is, and how wide: a direction and the cosine of its angular radius. cos = 2 means no Moon. */
  readonly moonDirection = new Vector3(0, 1, 0)
  readonly moonCosRadius = { value: 2 }

  /**
   * The Sun's material, a plain self-lit one that discards nothing and covers what the Moon does:
   * the sky behind shows through where the Moon is, because a Moon beyond the Sun's rim is simply
   * not seen against a sky that bright (and in a total eclipse, the sky there is the dark one).
   */
  material(): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ fog: false, transparent: true })
    const moonDirection = this.moonDirection
    const moonCosRadius = this.moonCosRadius
    material.onBeforeCompile = shader => {
      shader.uniforms.uMoon = { value: moonDirection }
      shader.uniforms.uMoonCos = moonCosRadius
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec3 vEclipseDirection;\nvoid main() {")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vEclipseDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;")
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 uMoon;\nuniform float uMoonCos;\nvarying vec3 vEclipseDirection;\nvoid main() {")
        .replace("#include <opaque_fragment>", `
          float eclipseCosine = dot(normalize(vEclipseDirection), uMoon);
          float eclipseEdge = max(fwidth(eclipseCosine), 1e-9);
          float eclipseCovered = smoothstep(uMoonCos - eclipseEdge, uMoonCos + eclipseEdge, eclipseCosine);
          diffuseColor.a *= 1.0 - eclipseCovered;
          #include <opaque_fragment>`)
    }
    return material
  }

  /** Points the cut at the Moon, `radiusDeg` wide; undefined takes it away. */
  setMoon(direction: { x: number, y: number, z: number } | undefined, radiusDeg = 0): void {
    if (!direction) {
      this.moonCosRadius.value = 2
      return
    }
    this.moonDirection.set(direction.x, direction.y, direction.z).normalize()
    this.moonCosRadius.value = Math.cos((radiusDeg * Math.PI) / 180)
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

  constructor(sunRadiusRad: number) {
    const maxAngle = sunRadiusRad * SolarCorona.MAX_RADII
    const material = new ShaderMaterial({
      uniforms: {
        uSun: { value: new Vector3(0, 1, 0) },
        uMoon: { value: new Vector3(0, 1, 0) },
        uMoonCos: { value: 2 },
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
        uniform vec3 uMoon;
        uniform float uMoonCos;
        uniform float uSunRadius;
        uniform float uMaxRadii;
        uniform vec3 uRadiance;
        uniform float uCoefficient;
        uniform float uExponent;
        varying vec3 vDirection;
        void main() {
          vec3 direction = normalize(vDirection);
          float angle = acos(clamp(dot(direction, uSun), -1.0, 1.0));
          float radii = max(angle / uSunRadius, 1.0);
          if (radii > uMaxRadii) discard;
          float cosine = dot(direction, uMoon);
          float edge = max(fwidth(cosine), 1e-9);
          float covered = smoothstep(uMoonCos - edge, uMoonCos + edge, cosine);
          // Fades to nothing over the last radius of the cap, so that its rim never shows.
          float fade = clamp(uMaxRadii - radii, 0.0, 1.0);
          float brightness = uCoefficient * pow(radii, -uExponent) * (1.0 - covered) * fade;
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
  show(sun: { x: number, y: number, z: number } | undefined, moon: { x: number, y: number, z: number }, moonCosRadius: number, radiance: readonly number[]): void {
    if (!sun) {
      this.object.visible = false
      return
    }
    const uniforms = this.object.material.uniforms
    this.towards.set(sun.x, sun.y, sun.z).normalize()
    this.object.quaternion.setFromUnitVectors(this.up, this.towards)
    ;(uniforms.uSun.value as Vector3).copy(this.towards)
    ;(uniforms.uMoon.value as Vector3).set(moon.x, moon.y, moon.z).normalize()
    uniforms.uMoonCos.value = moonCosRadius
    ;(uniforms.uRadiance.value as Vector3).set(radiance[0], radiance[1], radiance[2])
    this.object.visible = true
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.object.material.dispose()
  }
}
