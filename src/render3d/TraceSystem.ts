// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { CanvasTexture, Color, Float32BufferAttribute, Group, Points, PointsMaterial, BufferGeometry, Sprite, SpriteMaterial, Vector2 } from "three"
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
  /** Height of a name on the screen, pixels, whatever the field. */
  static readonly LABEL_HEIGHT_PX = 15
  /** How far apart the vertices are on a line that follows the ground, metres: close enough to
   * follow a bank, far enough that a kilometre is a few dozen of them. */
  static readonly STEP_M = 15
  /** Above the relief, so a line on the ground is not drawn into it. */
  static readonly LIFT_M = 0.3

  readonly group = new Group()
  private readonly materials: LineMaterial[] = []
  private readonly pointsMaterials: PointsMaterial[] = []
  /** The names, each with the width over height of its picture, so a name can be kept the same size
   * on the screen (see setView). */
  private readonly labels: { sprite: Sprite; aspect: number }[] = []
  private viewportHeightPx = 720
  private fovDeg = 60

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
  set(traces: InvestigatorTrace[], labels: ReadonlyMap<string, string>, originLat: number, originLng: number, siteElevationM: number, groundYAt: GroundYAt): void {
    this.empty()
    for (const trace of traces) {
      const points = this.positions(trace, originLat, originLng, siteElevationM, groundYAt)
      const color = new Color(trace.color ?? DEFAULT_TRACE_COLOR)
      const name = labels.get(trace.id)
      if (name && points.length >= 3) this.addLabel(name, this.labelAnchor(points, trace.kind))
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

  /**
   * Tells the traces what they are drawn into: how many pixels it has, and how wide its field is.
   * A line's width is worked out from the first, and a stale value draws it thick or thin; a name
   * is kept the same size on the screen through the second, since a narrow field would otherwise
   * magnify it with everything else (the compass is held still the same way).
   */
  setView(size: Vector2, fovDeg: number): void {
    for (const material of this.materials) material.resolution.copy(size)
    if (size.y === this.viewportHeightPx && fovDeg === this.fovDeg) return
    this.viewportHeightPx = size.y
    this.fovDeg = fovDeg
    this.scaleLabels()
  }

  get any(): boolean {
    return this.group.children.length > 0
  }

  dispose(): void {
    this.empty()
  }

  /** The vertex a name is written at: the farthest from the observer's place for a line, which is
   * where a line of sight says what it points at (its other end is under the observer's feet), and
   * the first for a place or an outline. */
  private labelAnchor(points: number[], kind: InvestigatorTrace["kind"]): [number, number, number] {
    let best = 0
    if (kind === "line") {
      let farthest = -1
      for (let i = 0; i + 2 < points.length; i += 3) {
        const distance = Math.hypot(points[i], points[i + 2])
        if (distance > farthest) { farthest = distance; best = i }
      }
    }
    return [points[best], points[best + 1], points[best + 2]]
  }

  private addLabel(text: string, at: [number, number, number]): void {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return
    const font = "bold 30px sans-serif"
    context.font = font
    const padding = 10
    canvas.width = Math.ceil(context.measureText(text).width) + padding * 2
    canvas.height = 44
    context.font = font
    context.fillStyle = "rgba(0, 0, 0, 0.6)"
    context.beginPath()
    context.roundRect(0, 0, canvas.width, canvas.height, 10)
    context.fill()
    context.fillStyle = "#ffffff"
    context.textBaseline = "middle"
    context.fillText(text, padding, canvas.height / 2 + 2)
    const material = new SpriteMaterial({ map: new CanvasTexture(canvas), depthTest: false, depthWrite: false, fog: false, sizeAttenuation: false })
    const sprite = new Sprite(material)
    sprite.name = "trace name"
    // Anchored by its lower left corner, so the name stands up and to the right of what it names
    // instead of lying over it.
    sprite.center.set(0, 0)
    sprite.position.set(at[0], at[1], at[2])
    sprite.frustumCulled = false
    sprite.layers.set(this.layer)
    this.labels.push({ sprite, aspect: canvas.width / canvas.height })
    this.group.add(sprite)
    this.scaleLabels()
  }

  /** With no size attenuation a sprite's height on screen is its scale times the projection's
   * 1 / tan(half field), in units of half the picture: so scale by tan(half field) to hold a pixel size. */
  private scaleLabels(): void {
    const height = (TraceSystem.LABEL_HEIGHT_PX / (this.viewportHeightPx / 2)) * Math.tan((this.fovDeg * Math.PI) / 360)
    for (const { sprite, aspect } of this.labels) sprite.scale.set(height * aspect, height, 1)
  }

  private empty(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child)
      if (child instanceof Sprite) {
        child.material.map?.dispose()
        child.material.dispose()
      } else {
        ;(child as Line2 | Points).geometry.dispose()
      }
    }
    this.labels.length = 0
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
