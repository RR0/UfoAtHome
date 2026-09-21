import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from "three"

/**
 * The veiling glare round a bright source at the eye: the light an eye's media scatter sideways on
 * the way to the retina, which lays a luminance over everything near the source's direction.
 *
 * Its law is Stiles and Holladay's, the one the CIE's disability glare keeps: a veiling luminance
 * of k·E/θ² candela per square metre at θ degrees from a source giving an illuminance E, lux, at
 * the eye, with k = 10. It is why the stars near a full Moon are gone, why a planet low in the dusk
 * wears a halo, and why a streetlamp's surroundings drown: nothing to do with the air, all of it in
 * the eye. Inside the source's own disc there is no angle left to divide by, and the veil is held.
 *
 * The Sun's own veil is drawn by the lens flare's pass, over the whole frame (see LensFlareEffect's
 * glare()); this is the same law for everything else bright enough to have one.
 */
export class Veil {
  /** Stiles and Holladay's constant: cd/m² of veil per lux at the eye, times degrees squared. */
  static readonly K = 10
  /** Where a veil stops being worth drawing: a thousandth of the eye's semi-saturation. */
  static readonly FAINTEST = 1e-3
  /** Never wider than this, whatever the source: the law is measured out to about thirty degrees. */
  static readonly MAX_RADIUS_DEG = 30

  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>

  constructor(name: string) {
    this.mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(0, 0, 0) },
        uTanRadius: { value: 0.1 },
        uSourceDeg: { value: 0.25 }
      },
      vertexShader: Veil.VERTEX,
      fragmentShader: Veil.FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      fog: false
    }))
    this.mesh.name = name
    this.mesh.frustumCulled = false
    this.mesh.visible = false
  }

  /** How far out a veil of this strength (k·E, relative) is worth drawing, degrees. */
  static radiusDeg(strength: number): number {
    return Math.min(Veil.MAX_RADIUS_DEG, Math.sqrt(Math.max(strength, 0) / Veil.FAINTEST))
  }

  /**
   * Stands the veil round a source at `position`.
   *
   * @param illuminance The source's illuminance at the eye, per channel, relative like the scene's
   *   light (see ScatteredSky.relativeScale).
   * @param sourceDeg The source's own angular radius, degrees: the veil is held inside it.
   */
  shine(position: { x: number, y: number, z: number }, illuminance: readonly [number, number, number], sourceDeg: number): void {
    const strength = Veil.K * Math.max(illuminance[0], illuminance[1], illuminance[2])
    const radiusDeg = Veil.radiusDeg(strength)
    if (radiusDeg <= sourceDeg) {
      this.mesh.visible = false
      return
    }
    this.mesh.visible = true
    this.mesh.position.set(position.x, position.y, position.z)
    const uniforms = this.mesh.material.uniforms
    ;(uniforms.uColor.value as Color).setRGB(Veil.K * illuminance[0], Veil.K * illuminance[1], Veil.K * illuminance[2])
    uniforms.uTanRadius.value = Math.tan((radiusDeg * Math.PI) / 180)
    uniforms.uSourceDeg.value = sourceDeg
  }

  hide(): void {
    this.mesh.visible = false
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }

  private static readonly VERTEX = /* glsl */ `
    uniform float uTanRadius;
    varying vec2 vOffset;
    void main() {
      vOffset = position.xy;
      vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      centre.xy += position.xy * uTanRadius * length(centre.xyz);
      gl_Position = projectionMatrix * centre;
    }
  `

  private static readonly FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    uniform float uTanRadius;
    uniform float uSourceDeg;
    varying vec2 vOffset;
    void main() {
      float reach = length(vOffset);
      if (reach > 1.0) discard;
      float theta = max(degrees(atan(reach * uTanRadius)), uSourceDeg);
      float edge = degrees(atan(uTanRadius));
      // Less the veil at the edge, so the quad ends where the veil is already at its faintest.
      float veil = max(1.0 / (theta * theta) - 1.0 / (edge * edge), 0.0);
      gl_FragColor = vec4(uColor * veil, 1.0);
    }
  `
}
