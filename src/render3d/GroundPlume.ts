import { BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector2 } from "three"

/** What a plume is made of and how it moves — see GroundPlume. */
export interface PlumeKind {
  /** How many puffs are alive at once. */
  count: number
  /** How long one lives, seconds. */
  lifeS: number
  /** How far from the source it starts, metres, and how fast it spreads outwards, m/s. */
  startRadiusM: number
  spreadMS: number
  /** How fast it rises, m/s. */
  riseMS: number
  /** Its size at birth and at death, metres across. */
  birthSizeM: number
  deathSizeM: number
  /** Its colour, linear, and how opaque it is at its densest. */
  colour: readonly [number, number, number]
  opacity: number
}

/**
 * Dust raised by a flame striking the ground, or smoke from brush set burning: puffs born at a
 * source, spreading, rising and carried off by the wind, growing and thinning as they go.
 *
 * Every puff's state is a function of the RECORDING's time, not of the frames drawn: a paused replay
 * shows one instant of it, and scrubbing back replays the same plume. Puff i is born at
 * (i / count) of the life and dies a life later, over and over, along a direction and at a speed
 * of its own drawn once from its index.
 *
 * Seen by the light around it only as far as its colour says: it is not lit by the scene, which for
 * a thin haze of pale dust against a lit ground is close, and for a plume in shadow is too bright.
 */
export class GroundPlume {
  static readonly DUST: PlumeKind = {
    count: 160, lifeS: 2.2, startRadiusM: 0.4, spreadMS: 2.5, riseMS: 0.8,
    birthSizeM: 0.5, deathSizeM: 2.2, colour: [0.52, 0.44, 0.33], opacity: 0.35
  }
  static readonly SMOKE: PlumeKind = {
    count: 60, lifeS: 7, startRadiusM: 0.1, spreadMS: 0.15, riseMS: 0.7,
    birthSizeM: 0.6, deathSizeM: 3.5, colour: [0.42, 0.42, 0.42], opacity: 0.18
  }

  readonly points: Points<BufferGeometry, ShaderMaterial>
  private readonly positions: Float32Array
  private readonly sizes: Float32Array
  private readonly alphas: Float32Array
  /** Per puff, drawn once from its index: direction outwards, speed factor, rise factor. */
  private readonly seeds: [number, number, number][]

  constructor(private readonly kind: PlumeKind) {
    const geometry = new BufferGeometry()
    this.positions = new Float32Array(kind.count * 3)
    this.sizes = new Float32Array(kind.count)
    this.alphas = new Float32Array(kind.count)
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("size", new BufferAttribute(this.sizes, 1))
    geometry.setAttribute("alpha", new BufferAttribute(this.alphas, 1))
    this.seeds = Array.from({ length: kind.count }, (_, i) => [
      GroundPlume.hash(i * 3 + 1) * 2 * Math.PI,
      0.5 + GroundPlume.hash(i * 3 + 2),
      0.6 + 0.8 * GroundPlume.hash(i * 3 + 3)
    ])
    const material = new ShaderMaterial({
      uniforms: { uColour: { value: new Color(kind.colour[0], kind.colour[1], kind.colour[2]) }, uHalfHeight: { value: 500 } },
      vertexShader: GroundPlume.VERTEX,
      fragmentShader: GroundPlume.FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      toneMapped: false
    })
    this.points = new Points(geometry, material)
    this.points.frustumCulled = false
    // After the relief, which is transparent and drawn at order 1 (see FlameEffect.RENDER_ORDER).
    this.points.renderOrder = 3
    this.points.visible = false
    // How big a metre is on screen depends on the target being drawn into — the canvas, or the
    // wider one an eye's projection is resampled from — so it is read just before each draw.
    const size = new Vector2()
    this.points.onBeforeRender = renderer => {
      const target = renderer.getRenderTarget()
      this.points.material.uniforms.uHalfHeight.value = (target ? target.height : renderer.getDrawingBufferSize(size).y) / 2
    }
  }

  /**
   * The plume at `seconds` into the recording, from a source at (x, y, z) of the scene, blown by
   * `wind` (m/s, scene axes), at `strength` 0-1 of its full density.
   */
  set(x: number, y: number, z: number, seconds: number, wind: { x: number, z: number }, strength: number): void {
    const kind = this.kind
    this.points.visible = strength > 0
    if (!this.points.visible) return
    for (let i = 0; i < kind.count; i++) {
      const [direction, speed, rise] = this.seeds[i]
      const age = ((seconds + (i / kind.count) * kind.lifeS) % kind.lifeS + kind.lifeS) % kind.lifeS
      const f = age / kind.lifeS
      const radius = kind.startRadiusM + kind.spreadMS * speed * Math.sqrt(age)
      this.positions[i * 3] = x + Math.cos(direction) * radius + wind.x * age
      this.positions[i * 3 + 1] = y + kind.riseMS * rise * age
      this.positions[i * 3 + 2] = z + Math.sin(direction) * radius + wind.z * age
      this.sizes[i] = kind.birthSizeM + (kind.deathSizeM - kind.birthSizeM) * f
      // In quickly, out slowly, and all of it as strong as its source is.
      this.alphas[i] = kind.opacity * strength * Math.min(1, f * 8) * (1 - f)
    }
    const geometry = this.points.geometry
    geometry.getAttribute("position").needsUpdate = true
    geometry.getAttribute("size").needsUpdate = true
    geometry.getAttribute("alpha").needsUpdate = true
  }

  dispose(): void {
    this.points.geometry.dispose()
    this.points.material.dispose()
  }

  /** A number in [0, 1) from an integer, the same every time. */
  private static hash(n: number): number {
    const x = Math.sin(n * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }

  private static readonly VERTEX = /* glsl */ `
    attribute float size;
    attribute float alpha;
    uniform float uHalfHeight;
    varying float vAlpha;
    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      // Metres across at this distance, in pixels of the target: what three's own point attenuation
      // computes, made exact for the projection in use.
      gl_PointSize = max(1.0, size * uHalfHeight * projectionMatrix[1][1] / max(0.1, -viewPosition.z));
      vAlpha = alpha;
      gl_Position = projectionMatrix * viewPosition;
    }
  `

  private static readonly FRAGMENT = /* glsl */ `
    uniform vec3 uColour;
    varying float vAlpha;
    void main() {
      vec2 offset = gl_PointCoord * 2.0 - 1.0;
      float d2 = dot(offset, offset);
      if (d2 > 1.0) discard;
      gl_FragColor = vec4(uColour, vAlpha * exp(-3.0 * d2));
    }
  `
}
