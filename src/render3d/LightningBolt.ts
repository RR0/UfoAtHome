import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three"
import { Rng } from "../engine/astronomy/MeteorFall.js"
import type { LightningFlash } from "../engine/weather/LightningSchedule.js"
import { horizontalToCartesian } from "./skyColors.js"

/**
 * The visible channel of a flash that reaches the ground: a jagged, branching line from the cloud
 * base down to the ground, drawn only while the flash is lit.
 *
 * Placed by ANGLE, like everything at the sky's distance in this scene: a channel five kilometres
 * away shows no parallax across a witness's few metres, so its top stands at the altitude of the
 * cloud base seen from there and its foot on the horizon, and the terrain in front hides it the
 * way it hides a setting star.
 *
 * Drawn as two ribbons (WebGL ignores line width): a narrow core at the channel's apparent width and
 * a wide, faint glow around it, both additive, so a strike brightens what is behind it rather than
 * painting over it. Each ribbon is turned to face the witness when it is built, which it keeps: the
 * witness is at the centre of the sphere it is drawn on.
 */
export class LightningBolt {
  readonly object = new Group()
  private readonly radius: number
  private readonly core: MeshBasicMaterial
  private readonly glow: MeshBasicMaterial
  private flashKey?: string

  /** How wide the bright core looks, degrees: a channel a few centimetres across, blurred by the air
   * and by the eye to about this at a few kilometres. */
  static readonly CORE_WIDTH_DEG = 0.06
  static readonly GLOW_WIDTH_DEG = 0.5
  private static readonly SEGMENTS = 28

  constructor(radius: number) {
    this.radius = radius
    this.object.name = "lightning-bolt"
    this.core = new MeshBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false })
    this.glow = new MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false })
    this.object.visible = false
    // After the cloud decks: the channel is below the base and in front of what it hangs from.
    this.object.renderOrder = 5.95
  }

  /**
   * Shows `flash` at `brightness` (0 hides it), with the cloud base at `cloudBaseM` above the witness.
   */
  set(flash: LightningFlash | undefined, brightness: number, cloudBaseM: number): void {
    if (!flash || !flash.cloudToGround || brightness <= 0.01) {
      this.object.visible = false
      return
    }
    const key = `${flash.channelSeed}:${Math.round(cloudBaseM)}`
    if (key !== this.flashKey) this.build(flash, cloudBaseM, key)
    this.core.opacity = Math.min(1, brightness * 1.4)
    this.glow.opacity = brightness * 0.35
    this.object.visible = true
  }

  private build(flash: LightningFlash, cloudBaseM: number, key: string): void {
    this.flashKey = key
    for (const child of [...this.object.children]) {
      ;(child as Mesh).geometry.dispose()
      this.object.remove(child)
    }
    const rng = new Rng(flash.channelSeed)
    const topAltitudeDeg = (Math.atan2(cloudBaseM, flash.distanceM) * 180) / Math.PI
    const main = this.channel(rng, flash.azimuthDeg, topAltitudeDeg, 0, 1)
    const paths = [main]
    // One or two branches, leaving the main channel in its upper part and dying out before the ground.
    const branches = 1 + Math.floor(rng.next() * 2)
    for (let b = 0; b < branches; b++) {
      const from = main[Math.floor(rng.between(0.15, 0.5) * main.length)]
      paths.push(this.channel(rng, from.azimuthDeg, from.altitudeDeg, from.altitudeDeg * rng.between(0.3, 0.7), 0.5))
    }
    for (const path of paths) {
      this.object.add(new Mesh(this.ribbon(path, LightningBolt.GLOW_WIDTH_DEG), this.glow))
      this.object.add(new Mesh(this.ribbon(path, LightningBolt.CORE_WIDTH_DEG), this.core))
    }
  }

  /** A random walk down from `topDeg` to `bottomDeg`, jagged the way a stepped leader is: short
   * straight runs with abrupt turns. */
  private channel(rng: Rng, azimuthDeg: number, topDeg: number, bottomDeg: number, spread: number): { azimuthDeg: number; altitudeDeg: number }[] {
    const points: { azimuthDeg: number; altitudeDeg: number }[] = []
    const height = topDeg - bottomDeg
    let azimuth = azimuthDeg
    for (let i = 0; i <= LightningBolt.SEGMENTS; i++) {
      const altitude = topDeg - (height * i) / LightningBolt.SEGMENTS
      points.push({ azimuthDeg: azimuth, altitudeDeg: altitude })
      azimuth += rng.between(-1, 1) * height * 0.06 * spread
    }
    return points
  }

  /** A strip of `widthDeg` along the path, facing the centre of the sphere. */
  private ribbon(path: { azimuthDeg: number; altitudeDeg: number }[], widthDeg: number): BufferGeometry {
    const positions = new Float32Array(path.length * 2 * 3)
    const indices: number[] = []
    const halfWidth = (this.radius * Math.tan((widthDeg * Math.PI) / 180)) / 2
    const points = path.map(point => {
      const { x, y, z } = horizontalToCartesian(point.altitudeDeg, point.azimuthDeg, this.radius)
      return new Vector3(x, y, z)
    })
    points.forEach((point, i) => {
      const next = points[Math.min(i + 1, points.length - 1)]
      const previous = points[Math.max(i - 1, 0)]
      const along = next.clone().sub(previous).normalize()
      const side = along.cross(point.clone().normalize()).normalize().multiplyScalar(halfWidth)
      positions.set([point.x + side.x, point.y + side.y, point.z + side.z], i * 6)
      positions.set([point.x - side.x, point.y - side.y, point.z - side.z], i * 6 + 3)
      if (i < points.length - 1) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    })
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    return geometry
  }

  dispose(): void {
    for (const child of this.object.children) (child as Mesh).geometry.dispose()
    this.core.dispose()
    this.glow.dispose()
    this.object.removeFromParent()
  }
}
