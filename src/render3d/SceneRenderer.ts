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
import { skyColorsForAltitude, starCountForAltitude } from "./skyColors.js"
import type { RgbColor } from "./skyColors.js"

const SKY_RADIUS = 900
const GROUND_RADIUS = 900
const STAR_RADIUS = 850

export interface SceneLighting {
  /** Sun altitude in degrees — see engine/astronomy/SunPosition.ts. Only the altitude is used for
   * now (sky darkness/color, star visibility); azimuth-based sun/moon placement is deferred until
   * the witness's viewing direction is part of the data model — see skyColors.ts's docstring. */
  altitudeDeg: number
}

/**
 * Renders the "decor" (sky, horizon, stars) behind a sighting's 2D shape
 * layer — see UfoSceneElement, which composites this underneath a
 * transparent-background <rr0-ufo-player>. Deliberately minimal for this
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
  private starPoints?: Points

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
    this.disposeMesh(this.skyMesh)
    this.disposeMesh(this.groundMesh)
    this.disposeMesh(this.starPoints)
    this.renderer.dispose()
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

  private buildStars(count: number): void {
    this.disposeMesh(this.starPoints)
    this.starPoints = undefined
    if (count === 0) return
    const random = mulberry32(1337)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2
      const phi = Math.acos(random())
      positions[i * 3] = STAR_RADIUS * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = Math.abs(STAR_RADIUS * Math.cos(phi))
      positions[i * 3 + 2] = STAR_RADIUS * Math.sin(phi) * Math.sin(theta)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    const material = new PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, fog: false })
    this.starPoints = new Points(geometry, material)
    this.scene.add(this.starPoints)
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
