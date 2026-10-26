import { BufferAttribute, BufferGeometry, Group, Mesh, type MeshBasicMaterial } from "three"
import type { HorizontalPosition } from "../engine/astronomy/CelestialPositions.js"
import { LaunchPlumeSighting } from "../engine/interpretation/LaunchPlume.js"
import type { PlumePuffView } from "../engine/interpretation/LaunchPlume.js"
import { SkyRibbons } from "./SkyRibbons.js"
import { horizontalToCartesian } from "./skyColors.js"

interface Vector {
  x: number
  y: number
  z: number
}

/**
 * Draws a rocket's plume lit by a Sun the ground no longer sees: each puff of it (see
 * LaunchPlumeSighting) a soft disc of light on the sky, as wide as the puff has spread by then.
 *
 * Each disc is the column of a diffusing cloud of particles seen from afar: brightest across the
 * middle and fading out, with no edge, as a Gaussian does (see LaunchPlumeSighting.SIGMA_OF_RADIUS),
 * which is the look of the "jellyfish" bells (a dome whose rim is dim), of their lengthening trails
 * and of the soft arms of a spiral. Discs add, as light does, so the overlap of many puffs a few
 * seconds apart is the glow along the track and a single young puff is the bright head.
 *
 * In the celestial group, at the radius meteors burn at: a plume stands hundreds of kilometres off
 * and shows no parallax against a few metres of eye height. Drawn as the ribbons are, into the
 * eye's picture at its own pixels (see SkyRibbons).
 */
export class PlumeSystem {
  private static readonly RADIUS = 840
  private static readonly MAX_PUFFS = 1000
  /**
   * Where the rings stand as a share of the radius, and how much of the middle's light each has: a Gaussian of a standard deviation
   * of half the radius, cut at a radius and a quarter where it has fallen to a twentieth, and lowered by that so it ends at nothing.
   */
  private static readonly RINGS = [0, 0.25, 0.5, 0.75, 1, 1.25] as const
  private static readonly COLUMN = PlumeSystem.RINGS.map(ring => {
    const gaussian = (r: number) => Math.exp(-((r / LaunchPlumeSighting.SIGMA_OF_RADIUS) ** 2) / 2)
    const edge = gaussian(PlumeSystem.RINGS[PlumeSystem.RINGS.length - 1])
    return Math.max(0, (gaussian(ring) - edge) / (1 - edge))
  })
  private static readonly SECTORS = 12
  /** Fan of the middle, then a band of two triangles per sector between each two rings. */
  private static readonly VERTICES_PER_PUFF = PlumeSystem.SECTORS * (3 + 6 * (PlumeSystem.RINGS.length - 2))
  /** The most a pixel is ever given, relative: under a half float's largest, which is 65 504. */
  private static readonly BRIGHTEST_RELATIVE = 60000

  readonly object = new Group()
  private readonly mesh: Mesh
  private readonly positions = new Float32Array(PlumeSystem.MAX_PUFFS * PlumeSystem.VERTICES_PER_PUFF * 3)
  private readonly colors = new Float32Array(PlumeSystem.MAX_PUFFS * PlumeSystem.VERTICES_PER_PUFF * 3)
  private shown = 0
  /** The puffs as last drawn, with which way each is, how wide it looks and how bright its middle is: what the pointer is looked for among (see pickAt). */
  private drawn: { view: PlumePuffView; direction: Vector; radiusRad: number; luminance: number }[] = []
  /**
   * How much a plume must add to the sky behind it to be seen, as a share of the sky's own light: the eye's threshold of contrast for a patch a
   * degree or more across is a few percent when it has an edge, and a plume has none, fading out as a Gaussian does: about twice that.
   */
  static readonly VISIBLE_CONTRAST = 0.1

  constructor() {
    this.object.name = "plumes"
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(this.positions, 3))
    geometry.setAttribute("color", new BufferAttribute(this.colors, 3))
    geometry.setDrawRange(0, 0)
    this.mesh = new Mesh(geometry, SkyRibbons.material())
    this.mesh.frustumCulled = false
    SkyRibbons.track(this.mesh)
    this.object.add(this.mesh)
  }

  /** How many puffs are drawn — read by tests and by whatever has to know a plume is showing. */
  get count(): number {
    return this.shown
  }

  /**
   * Draws these puffs. `relativeScale` is what a candela per square metre is in the scene's own light
   * (see ScatteredSky.relativeScale), `air` what the air above the eye keeps of a light arriving from a
   * direction, per channel, and `transmission` what the clouds let past.
   */
  set(views: ReadonlyArray<PlumePuffView>, relativeScale: number, air: (position: HorizontalPosition) => readonly [number, number, number],
    transmission: (position: HorizontalPosition) => number): void {
    let vertex = 0
    let shown = 0
    this.drawn = []
    for (const view of views) {
      if (shown >= PlumeSystem.MAX_PUFFS) break
      const through = transmission(view.centre)
      if (through <= 0) continue
      const arriving = air(view.centre)
      const colour = [0, 1, 2].map(channel => Math.min(
        PlumeSystem.BRIGHTEST_RELATIVE,
        view.luminanceCdM2 * (view.colour?.[channel] ?? 1) * relativeScale * view.sunTransmittance[channel] * arriving[channel] * through
      )) as [number, number, number]
      if (Math.max(...colour) <= 0) continue
      vertex = this.pushPuff(vertex, view, colour)
      this.drawn.push({
        view,
        direction: this.normalise(horizontalToCartesian(view.centre.altitudeDeg, view.centre.azimuthDeg, 1)),
        radiusRad: (view.radiusDeg * Math.PI) / 180,
        luminance: 0.2126 * colour[0] + 0.7152 * colour[1] + 0.0722 * colour[2]
      })
      shown++
    }
    this.shown = shown
    const geometry = this.mesh.geometry
    geometry.setDrawRange(0, vertex)
    ;(geometry.getAttribute("position") as BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute("color") as BufferAttribute).needsUpdate = true
  }

  private pushPuff(vertex: number, view: PlumePuffView, colour: readonly [number, number, number]): number {
    const centre = horizontalToCartesian(view.centre.altitudeDeg, view.centre.azimuthDeg, PlumeSystem.RADIUS)
    const out = this.normalise(centre)
    // Across the sky: east-ish, then up-ish, both perpendicular to the line of sight.
    const east = this.normalise(this.cross({ x: 0, y: 1, z: 0 }, out))
    const north = this.cross(out, east)
    const radius = PlumeSystem.RADIUS * Math.tan((view.radiusDeg * Math.PI) / 180)
    const ring = (index: number, sector: number): Vector => {
      const angle = (sector / PlumeSystem.SECTORS) * 2 * Math.PI
      const r = PlumeSystem.RINGS[index] * radius
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      return { x: centre.x + east.x * x + north.x * y, y: centre.y + east.y * x + north.y * y, z: centre.z + east.z * x + north.z * y }
    }
    const level = (index: number): number => PlumeSystem.COLUMN[index]
    for (let s = 0; s < PlumeSystem.SECTORS; s++) {
      const next = (s + 1) % PlumeSystem.SECTORS
      // The middle, as a fan to the first ring.
      vertex = this.push(vertex, centre, colour, level(0))
      vertex = this.push(vertex, ring(1, s), colour, level(1))
      vertex = this.push(vertex, ring(1, next), colour, level(1))
      for (let band = 1; band < PlumeSystem.RINGS.length - 1; band++) {
        const a = ring(band, s)
        const b = ring(band, next)
        const c = ring(band + 1, s)
        const d = ring(band + 1, next)
        vertex = this.push(vertex, a, colour, level(band))
        vertex = this.push(vertex, b, colour, level(band))
        vertex = this.push(vertex, c, colour, level(band + 1))
        vertex = this.push(vertex, b, colour, level(band))
        vertex = this.push(vertex, d, colour, level(band + 1))
        vertex = this.push(vertex, c, colour, level(band + 1))
      }
    }
    return vertex
  }

  /**
   * The puff under a direction of sight, in the frame the plumes are drawn in, where the plume is seen: the light all the puffs add there,
   * each by the same profile they are drawn with (looked for as far as `toleranceRad` from the direction, so that a puff too small to land on
   * is found), must stand out from the sky behind by VISIBLE_CONTRAST of `background`, its light in the same units. The puff that adds the most
   * is the one named. Nothing where the plume has faded into the sky, however wide the cloud it was.
   */
  pickAt(direction: Vector, toleranceRad: number, background = 0): PlumePuffView | undefined {
    const unit = this.normalise(direction)
    let total = 0
    let best: { view: PlumePuffView; light: number } | undefined
    for (const puff of this.drawn) {
      const cosine = Math.max(-1, Math.min(1, unit.x * puff.direction.x + unit.y * puff.direction.y + unit.z * puff.direction.z))
      const share = Math.max(0, Math.acos(cosine) - toleranceRad) / Math.max(puff.radiusRad, 1e-9)
      const light = puff.luminance * PlumeSystem.profile(share)
      if (light <= 0) continue
      total += light
      if (!best || light > best.light) best = { view: puff.view, light }
    }
    return best && total >= PlumeSystem.VISIBLE_CONTRAST * background ? best.view : undefined
  }

  /** How much of a puff's middle light it has at `share` of its radius from its middle: the Gaussian it is drawn with (see RINGS). */
  private static profile(share: number): number {
    const rings = PlumeSystem.RINGS
    if (share >= rings[rings.length - 1]) return 0
    let i = 0
    while (share > rings[i + 1]) i++
    const f = (share - rings[i]) / (rings[i + 1] - rings[i])
    return PlumeSystem.COLUMN[i] + (PlumeSystem.COLUMN[i + 1] - PlumeSystem.COLUMN[i]) * f
  }

  private push(vertex: number, point: Vector, colour: readonly [number, number, number], share: number): number {
    const i = vertex * 3
    this.positions[i] = point.x
    this.positions[i + 1] = point.y
    this.positions[i + 2] = point.z
    this.colors[i] = colour[0] * share
    this.colors[i + 1] = colour[1] * share
    this.colors[i + 2] = colour[2] * share
    return vertex + 1
  }

  private cross(a: Vector, b: Vector): Vector {
    return this.normalise({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
  }

  private normalise(v: Vector): Vector {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as MeshBasicMaterial).dispose()
    this.object.removeFromParent()
  }
}
