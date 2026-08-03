// Named imports (not `import * as THREE`) so Rollup can tree-shake the unused 95% of
// three.js — a namespace import defeats tree-shaking since property access on it isn't
// statically analyzable, which was the difference between an ~850KB and an ~180KB bundle here.
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  Fog,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  WebGLRenderer
} from "three"
import type { Material } from "three"
import {
  skyColorsForAltitude,
  starCountForAltitude,
  starBrightness,
  starBrightnessTierIndex,
  starColorScale,
  twinkleIntensity,
  STAR_BRIGHTNESS_TIERS
} from "./skyColors.js"
import type { RgbColor } from "./skyColors.js"

const SKY_RADIUS = 900
const GROUND_RADIUS = 900
const STAR_RADIUS = 850

interface StarTier {
  readonly points: Points
  readonly colorAttribute: BufferAttribute
  readonly brightness: Float32Array
  readonly phase: Float32Array
  readonly speedFactor: Float32Array
}

export interface SceneLighting {
  /** Sun altitude in degrees — see engine/astronomy/SunPosition.ts. Only the altitude is used for
   * now (sky darkness/color, star visibility); azimuth-based sun/moon placement is deferred until
   * the witness's viewing direction is part of the data model — see skyColors.ts's docstring. */
  altitudeDeg: number
}

/**
 * Renders the "decor" (sky, horizon, stars) behind a sighting's 2D shape
 * layer — see SceneElement, which composites this underneath a
 * transparent-background <rr0-ufo>. Deliberately minimal for this
 * first pass: a vertex-colored sky dome, a flat haze-blended ground plane
 * (an aeronautical horizon, not a literal terrain), and a starfield when
 * dark enough. No camera movement/animation loop yet — render() is called
 * once per lighting update.
 */
export class SceneRenderer {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera

  private skyMesh?: Mesh
  private groundMesh?: Mesh
  private starTiers: StarTier[] = []
  private animationFrameId: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera = new PerspectiveCamera(60, canvas.width / Math.max(canvas.height, 1), 0.1, SKY_RADIUS * 1.2)
    this.camera.position.set(0, 1.6, 0)
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.render()
  }

  setLighting(lighting: SceneLighting): void {
    const colors = skyColorsForAltitude(lighting.altitudeDeg)
    this.buildSky(colors.zenith, colors.horizon)
    this.buildGround(colors.horizon)
    this.buildStars(starCountForAltitude(lighting.altitudeDeg))
    this.scene.fog = new Fog(new Color(...colors.horizon), SKY_RADIUS * 0.2, SKY_RADIUS)
    this.render()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.stopTwinkle()
    this.disposeMesh(this.skyMesh)
    this.disposeMesh(this.groundMesh)
    this.disposeStarTiers()
    this.renderer.dispose()
  }

  /** Starts the atmospheric twinkle loop — idempotent, and a no-op with no stars built. Called
   * automatically by buildStars() whenever it builds a non-empty field; exposed so
   * SceneElement can still call stopTwinkle() on disconnect without needing its own timer. */
  startTwinkle(): void {
    if (this.animationFrameId !== null || this.starTiers.length === 0) return
    const tick = (timeMs: number) => {
      this.updateTwinkle(timeMs / 1000)
      this.render()
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  stopTwinkle(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private buildSky(zenith: RgbColor, horizon: RgbColor): void {
    this.disposeMesh(this.skyMesh)
    const geometry = new SphereGeometry(SKY_RADIUS, 32, 16)
    const position = geometry.attributes.position
    const colors: number[] = []
    const zenithColor = new Color(...zenith)
    const horizonColor = new Color(...horizon)
    for (let i = 0; i < position.count; i++) {
      const t = clamp((position.getY(i) / SKY_RADIUS + 1) / 2, 0, 1)
      const color = horizonColor.clone().lerp(zenithColor, t)
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
    const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false })
    this.skyMesh = new Mesh(geometry, material)
    this.scene.add(this.skyMesh)
  }

  private buildGround(horizon: RgbColor): void {
    this.disposeMesh(this.groundMesh)
    const geometry = new CircleGeometry(GROUND_RADIUS, 48)
    const groundColor = new Color(horizon[0] * 0.35, horizon[1] * 0.35, horizon[2] * 0.35)
    const material = new MeshBasicMaterial({ color: groundColor, fog: true })
    this.groundMesh = new Mesh(geometry, material)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.position.y = -0.5
    this.scene.add(this.groundMesh)
  }

  /** Builds `count` stars with a brightness-skewed distribution (see skyColors.ts's
   * starBrightness) split into discrete size tiers, each with its own PointsMaterial (three.js
   * has no per-vertex point size without a custom shader) but per-vertex color so brightness
   * still varies continuously within a tier. Also (re)seeds the atmospheric twinkle loop. */
  private buildStars(count: number): void {
    this.disposeStarTiers()
    if (count === 0) {
      this.stopTwinkle()
      return
    }
    // Separately seeded from position so star brightness/twinkle tuning never perturbs the
    // (bit-identical, already-established) star positions.
    const positionRandom = mulberry32(1337)
    const brightnessRandom = mulberry32(7331)
    const stars = Array.from({ length: count }, () => {
      const theta = positionRandom() * Math.PI * 2
      const phi = Math.acos(positionRandom())
      return {
        x: STAR_RADIUS * Math.sin(phi) * Math.cos(theta),
        y: Math.abs(STAR_RADIUS * Math.cos(phi)),
        z: STAR_RADIUS * Math.sin(phi) * Math.sin(theta),
        brightness: starBrightness(brightnessRandom()),
        phase: brightnessRandom() * Math.PI * 2,
        speedFactor: 0.7 + brightnessRandom() * 0.6
      }
    })
    this.starTiers = STAR_BRIGHTNESS_TIERS.map((tier, tierIndex) => {
      const tierStars = stars.filter(star => starBrightnessTierIndex(star.brightness) === tierIndex)
      const positions = new Float32Array(tierStars.length * 3)
      const brightness = new Float32Array(tierStars.length)
      const phase = new Float32Array(tierStars.length)
      const speedFactor = new Float32Array(tierStars.length)
      tierStars.forEach((star, i) => {
        positions[i * 3] = star.x
        positions[i * 3 + 1] = star.y
        positions[i * 3 + 2] = star.z
        brightness[i] = star.brightness
        phase[i] = star.phase
        speedFactor[i] = star.speedFactor
      })
      const geometry = new BufferGeometry()
      geometry.setAttribute("position", new BufferAttribute(positions, 3))
      const colorAttribute = new BufferAttribute(new Float32Array(tierStars.length * 3), 3)
      geometry.setAttribute("color", colorAttribute)
      const material = new PointsMaterial({ vertexColors: true, size: tier.size, sizeAttenuation: false, fog: false })
      const points = new Points(geometry, material)
      this.scene.add(points)
      return { points, colorAttribute, brightness, phase, speedFactor }
    })
    // Populates real initial colors synchronously (single source of truth for the color
    // formula — see updateTwinkle) before the very first render(), which setLighting() calls
    // right after buildStars() returns — otherwise that first frame would show default black.
    this.updateTwinkle(0)
    this.startTwinkle()
  }

  /** Rewrites each star tier's per-vertex color buffer for the current time — the CPU-side
   * "twinkle": no shader needed at these star counts (a few thousand Math.sin calls and a
   * small buffer re-upload per frame, well under a millisecond of work). */
  private updateTwinkle(timeSeconds: number): void {
    for (const tier of this.starTiers) {
      const colors = tier.colorAttribute.array as Float32Array
      for (let i = 0; i < tier.brightness.length; i++) {
        const intensity = twinkleIntensity(
          tier.brightness[i],
          { phase: tier.phase[i], speedFactor: tier.speedFactor[i] },
          timeSeconds
        )
        const scale = starColorScale(tier.brightness[i]) * intensity
        colors[i * 3] = scale
        colors[i * 3 + 1] = scale
        colors[i * 3 + 2] = scale
      }
      tier.colorAttribute.needsUpdate = true
    }
  }

  private disposeStarTiers(): void {
    for (const tier of this.starTiers) {
      this.disposeMesh(tier.points)
    }
    this.starTiers = []
  }

  private disposeMesh(object?: Mesh | Points): void {
    if (!object) return
    this.scene.remove(object)
    object.geometry.dispose()
    const material = object.material as Material | Material[]
    if (Array.isArray(material)) {
      material.forEach(m => m.dispose())
    } else {
      material.dispose()
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Small deterministic PRNG (no dependency) so the starfield looks the same across re-renders. */
function mulberry32(seed: number): () => number {
  let a = seed
  return function random(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
