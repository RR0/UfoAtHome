// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { Color, Float32BufferAttribute, Group, Points, PointsMaterial, BufferGeometry, Vector2 } from "three"
import { Line2 } from "three/examples/jsm/lines/Line2.js"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js"
import { DEFAULT_TRACE_COLOR, type InvestigatorTrace } from "../engine/model/Trace.js"
import { geoToLocalMeters } from "./terrain/GeoProjection.js"
import type { GroundYAt } from "./RoadSystem.js"

/**
 * What an investigator drew over the place — lines of sight, axes, markers, outlines — drawn over
 * the scene as lines that keep their width on the screen.
 *
 * Drawn OVER the scene rather than in it, like the compass and the pictures of the place, and for
 * the reason they are: a trace is somebody's claim about where something was, laid next to what the
 * account says, and a hill between the observer and the end of it must not take it away. It is not
 * lit, not fogged and not in a reflection, and it keeps one width in pixels however narrow the
 * field is, since a line that grew fortyfold under a telephoto would be a bar across the picture.
 *
 * Loaded on demand (see SceneRenderer.setTraces): the lines come from a module most readers never
 * need, as most recordings carry no trace.
 */
export class TraceSystem {
  /** Pixels. */
  static readonly LINE_WIDTH_PX = 2.5
  static readonly MARKER_SIZE_PX = 9
  /** How far apart the vertices are on a line that follows the ground, metres: close enough to
   * follow a bank, far enough that a kilometre is a few dozen of them. */
  static readonly STEP_M = 15
  /** Above the relief, so a line on the ground is not drawn into it. */
  static readonly LIFT_M = 0.3

  readonly group = new Group()
  private readonly materials: LineMaterial[] = []
  private readonly pointsMaterials: PointsMaterial[] = []

  constructor(private readonly layer: number) {
    this.group.name = "traces"
  }

  /**
   * Lays `traces` on a patch whose own origin is (originLat, originLng) and reads zero at the
   * elevation `siteElevationM`.
   *
   * Always rebuilt, for the reason RoadSystem.set gives: a line follows the relief under it, and
   * the relief is rebuilt as the observer moves.
   */
  set(traces: InvestigatorTrace[], originLat: number, originLng: number, siteElevationM: number, groundYAt: GroundYAt): void {
    this.empty()
    for (const trace of traces) {
      const points = this.positions(trace, originLat, originLng, siteElevationM, groundYAt)
      const color = new Color(trace.color ?? DEFAULT_TRACE_COLOR)
      if (trace.kind === "point") {
        const geometry = new BufferGeometry()
        geometry.setAttribute("position", new Float32BufferAttribute(points.slice(0, 3), 3))
        const material = new PointsMaterial({ color, size: TraceSystem.MARKER_SIZE_PX, sizeAttenuation: false, depthTest: false, fog: false })
        this.pointsMaterials.push(material)
        const marker = new Points(geometry, material)
        marker.name = "trace point"
        marker.frustumCulled = false
        marker.layers.set(this.layer)
        this.group.add(marker)
      } else if (points.length >= 6) {
        const geometry = new LineGeometry()
        geometry.setPositions(trace.kind === "polygon" ? [...points, points[0], points[1], points[2]] : points)
        const material = new LineMaterial({
          color: color.getHex(),
          linewidth: TraceSystem.LINE_WIDTH_PX,
          worldUnits: false,
          transparent: true,
          opacity: 0.92,
          depthTest: false,
          fog: false
        })
        this.materials.push(material)
        const line = new Line2(geometry, material)
        line.name = `trace ${trace.kind}`
        // A line of sight is kilometres long and its bounding sphere is a poor guide to whether any
        // of it is on screen.
        line.frustumCulled = false
        line.layers.set(this.layer)
        this.group.add(line)
      }
    }
  }

  /** Tells the lines how many pixels the picture they are drawn into has: a line's width is
   * worked out from it, and a stale value draws it thick or thin. */
  setResolution(size: Vector2): void {
    for (const material of this.materials) material.resolution.copy(size)
  }

  get any(): boolean {
    return this.group.children.length > 0
  }

  dispose(): void {
    this.empty()
  }

  private empty(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      ;(child as Line2 | Points).geometry.dispose()
    }
    for (const material of this.materials.splice(0)) material.dispose()
    for (const material of this.pointsMaterials.splice(0)) material.dispose()
  }

  /** The vertices as x,y,z in the patch's own frame (z is the negated north axis, see GeoProjection),
   * with the ground-following ones subdivided so they lie on the relief. */
  private positions(trace: InvestigatorTrace, originLat: number, originLng: number, siteElevationM: number, groundYAt: GroundYAt): number[] {
    const altitude = trace.altitude ?? "ground"
    const vertices = trace.points.map(point => {
      const { x, z } = geoToLocalMeters(point.lat, point.lng, originLat, originLng)
      return { x, z, altM: point.altM ?? 0 }
    })
    const follows = altitude !== "absolute"
    const out: number[] = []
    const heightAt = (x: number, z: number, altM: number) =>
      altitude === "absolute" ? altM - siteElevationM : groundYAt(x, z) + (altitude === "relative" ? altM : 0) + TraceSystem.LIFT_M
    const closed = trace.kind === "polygon"
    const count = closed ? vertices.length : vertices.length - 1
    for (let i = 0; i < Math.max(count, 1); i++) {
      const from = vertices[i]
      const to = vertices[(i + 1) % vertices.length]
      const steps = follows && trace.kind !== "point" ? Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / TraceSystem.STEP_M)) : 1
      for (let s = 0; s < steps; s++) {
        const f = s / steps
        const x = from.x + (to.x - from.x) * f
        const z = from.z + (to.z - from.z) * f
        out.push(x, heightAt(x, z, from.altM + (to.altM - from.altM) * f), z)
      }
    }
    if (!closed && trace.kind !== "point") {
      const last = vertices[vertices.length - 1]
      out.push(last.x, heightAt(last.x, last.z, last.altM), last.z)
    }
    return out
  }
}
