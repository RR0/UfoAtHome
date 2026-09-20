import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from "three"

/**
 * The bloom round something bright: a disc facing the eye, drawn additively, fading as a Gaussian
 * from its middle.
 *
 * What reaches an eye from a small bright source far off is its glare, not its outline — a flame a
 * kilometre away is a third of a pixel and is still seen — so anything that gives out light wears
 * one: a flame (see FlameEffect) and a body that states its own luminance (see BodySystem and
 * BodyAppearance.luminanceCdM2).
 *
 * It is drawn without depth and after the relief, which is itself transparent at its fading edge:
 * a glare drawn before that would be painted over by it wherever the two overlapped.
 */
export class Glare {
  /** The angular radius a glare is never drawn smaller than — the same floor as a decor lamp's
   * (see DecorSystem's LAMP_MIN_ANGULAR_RADIUS_RAD). */
  static readonly MIN_ANGLE_RAD = 0.002
  /** How much of a disc of radius r a glare falling as exp(-4 (d/r)²) actually fills. */
  static readonly FILL = (1 - Math.exp(-4)) / 4
  /** A glare round a source close enough to be seen for itself is a bloom, not the source: never
   * brighter than this share of the source's own luminance. */
  static readonly MAX_SHARE = 0.3

  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>

  constructor(name: string, renderOrder: number) {
    this.mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      uniforms: { uColor: { value: new Color(0, 0, 0) }, uRadius: { value: 1 } },
      vertexShader: Glare.VERTEX,
      fragmentShader: Glare.FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false
    }))
    this.mesh.name = name
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = renderOrder
    this.mesh.visible = false
  }

  /** Stands the glare at a point of the scene, this big and this colour (linear, on screen). */
  shine(position: { x: number, y: number, z: number }, radiusM: number, colour: readonly [number, number, number]): void {
    this.mesh.visible = true
    this.mesh.position.set(position.x, position.y, position.z)
    this.mesh.material.uniforms.uRadius.value = radiusM
    ;(this.mesh.material.uniforms.uColor.value as Color).setRGB(colour[0], colour[1], colour[2])
  }

  hide(): void {
    this.mesh.visible = false
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }

  /**
   * How big a glare round a source of this size is at `distanceM`, metres, and how bright its
   * middle is: the source's own light spread over the glare, when the glare is larger than the
   * source — which is what conserves it — and a faint bloom when it is not.
   *
   * @param radiusM How wide the glare is drawn, at least — a source seen for itself blooms about
   *   its own size, one too far to resolve blooms at the floor angle.
   * @param areaM2 The lit area of the source itself, square metres.
   */
  static spread(radiusM: number, areaM2: number, luminanceCdM2: number, distanceM: number): { radiusM: number, luminanceCdM2: number } {
    const radius = Math.max(radiusM, distanceM * Glare.MIN_ANGLE_RAD)
    const glareArea = Glare.FILL * Math.PI * radius * radius
    return { radiusM: radius, luminanceCdM2: luminanceCdM2 * Math.min(Glare.MAX_SHARE, areaM2 / glareArea) }
  }

  /**
   * How wide a bloom has to be to carry a source's whole light at the cap — the widest a glare
   * round a source of this lit area is ever worth drawing, since past it the glare would be
   * dimmer than MAX_SHARE rather than larger.
   */
  static conserving(areaM2: number): number {
    return Math.sqrt(areaM2 / (Glare.MAX_SHARE * Glare.FILL * Math.PI))
  }

  private static readonly VERTEX = /* glsl */ `
    uniform float uRadius;
    varying vec2 vOffset;
    void main() {
      vOffset = position.xy;
      vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      centre.xy += position.xy * uRadius;
      gl_Position = projectionMatrix * centre;
    }
  `

  private static readonly FRAGMENT = /* glsl */ `
    uniform vec3 uColor;
    varying vec2 vOffset;
    void main() {
      float d2 = dot(vOffset, vOffset);
      if (d2 > 1.0) discard;
      float weight = exp(-4.0 * d2);
      gl_FragColor = vec4(uColor * weight, weight);
    }
  `
}
