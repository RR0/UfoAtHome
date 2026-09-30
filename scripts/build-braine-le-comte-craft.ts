/**
 * Builds the stand-in for the phenomenon the three observers at Braine-le-Comte saw on 12 July 2015
 * (COBEPS 20150712BraineleComte), and writes it to public/models/ufoathome-braine-le-comte-craft/.
 *
 * UFO@home does not design models (see public/models/README.md); this one is a flat, rounded V
 * drawn from what the three said and nothing else, to stand where a fitted flight says the
 * phenomenon was. It is the same outline the recordings draw as a shape (scripts/data/cases/
 * build_braine_le_comte.py): BJN's "cerf-volant, deltaplane ou boomerang avec un angle obtus" and
 * AKH's "masse compacte, dense", a wing more than a stroke.
 *
 * - The plan: a V pointing forward (its tip towards -Z), its arms 100 degrees apart (BJN: an obtuse
 *   angle), each a third of the span thick, every corner rounded ("bords arrondis", COBEPS p. 18).
 * - The span: 10.5 m. NOT stated by anybody: no observer gave a distance, and the report says none
 *   can be computed. It is what their angular sizes come to when they are laid on one straight
 *   flight 100 m up (BJN's own estimate, COBEPS p. 13): 9.7 to 11.0 m for AKH and for BJN's first
 *   sighting. ASSUMED.
 * - Its thickness: 1.3 m, ASSUMED (nobody saw it edge-on).
 * - One hull node, "hull", which is what the drawn outlines are measured against.
 *
 * Run with: node --import tsx scripts/build-braine-le-comte-craft.ts
 */
import { ExtrudeGeometry, Shape } from "three"
import type { BufferGeometry } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"

type Point = [number, number]

/** The flat V, in metres, its bounding box centred on the origin, its tip towards -Z. */
class BraineLeComteCraft {
  static readonly SPAN_M = 10.5
  static readonly THICKNESS_M = 1.3
  /** Half the angle between the two arms. */
  static readonly HALF_APEX = 50 * Math.PI / 180
  /** An arm's width, as a share of the span. */
  static readonly ARM_SHARE = 0.34

  readonly materials = [GltfWriter.material("hull", "#2b2629", 0, 0.9)]

  write(writer: GltfWriter): void {
    writer.addMesh({ name: "hull", geometry: this.hull(), material: 0 })
  }

  /** The outline, unit-less: a centre line offset both ways, rounded twice over (Chaikin). */
  private outline(): Point[] {
    const half = BraineLeComteCraft.HALF_APEX
    const arm = 0.5 / Math.sin(half)
    const ends: [Point, Point, Point] = [[-0.5, -arm * Math.cos(half)], [0, 0], [0.5, -arm * Math.cos(half)]]
    const h = BraineLeComteCraft.ARM_SHARE / 2
    const direction = (a: Point, b: Point): Point => {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1])
      return [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
    }
    const d1 = direction(ends[0], ends[1])
    const d2 = direction(ends[1], ends[2])
    const n1: Point = [-d1[1], d1[0]]
    const n2: Point = [-d2[1], d2[0]]
    const k = 1 + n1[0] * n2[0] + n1[1] * n2[1]
    const miter: Point = [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k]
    const up: Point[] = [[ends[0][0] + n1[0] * h, ends[0][1] + n1[1] * h], [ends[1][0] + miter[0] * h, ends[1][1] + miter[1] * h], [ends[2][0] + n2[0] * h, ends[2][1] + n2[1] * h]]
    const down: Point[] = [[ends[0][0] - n1[0] * h, ends[0][1] - n1[1] * h], [ends[1][0] - miter[0] * h, ends[1][1] - miter[1] * h], [ends[2][0] - n2[0] * h, ends[2][1] - n2[1] * h]]
    const cap = (c: Point, a0: number): Point[] => Array.from({ length: 7 }, (_, i) =>
      [c[0] + h * Math.cos(a0 - Math.PI * (i + 1) / 8), c[1] + h * Math.sin(a0 - Math.PI * (i + 1) / 8)] as Point)
    let outline: Point[] = [...up, ...cap(ends[2], Math.atan2(n2[1], n2[0])), ...down.slice().reverse(), ...cap(ends[0], Math.atan2(-n1[1], -n1[0]))]
    for (let pass = 0; pass < 2; pass++) {
      const smoothed: Point[] = []
      outline.forEach((p, i) => {
        const q = outline[(i + 1) % outline.length]
        smoothed.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]])
      })
      outline = smoothed
    }
    return outline
  }

  /** The outline at the span stated, lying flat, its box centred. */
  private hull(): BufferGeometry {
    const outline = this.outline()
    const xs = outline.map(p => p[0])
    const ys = outline.map(p => p[1])
    const scale = BraineLeComteCraft.SPAN_M / (Math.max(...xs) - Math.min(...xs))
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2
    const shape = new Shape()
    // The shape's y is the forward distance: lying it down (rotateX -90) makes forward -Z.
    outline.forEach(([x, y], i) => {
      const point: Point = [(x - cx) * scale, (y - cy) * scale]
      if (i === 0) shape.moveTo(point[0], point[1])
      else shape.lineTo(point[0], point[1])
    })
    shape.closePath()
    const geometry = new ExtrudeGeometry(shape, { depth: BraineLeComteCraft.THICKNESS_M, bevelEnabled: false })
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, -BraineLeComteCraft.THICKNESS_M / 2, 0)
    const count = geometry.getAttribute("position").count
    geometry.setIndex(Array.from({ length: count }, (_, i) => i))
    geometry.deleteAttribute("uv")
    return geometry
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-braine-le-comte-craft")
mkdirSync(directory, { recursive: true })
const craft = new BraineLeComteCraft()
const writer = new GltfWriter(craft.materials)
craft.write(writer)
const file = path.join(directory, "craft.gltf")
const gltf = writer.toJSON("UFO@home scripts/build-braine-le-comte-craft.ts")
writeFileSync(file, JSON.stringify(gltf) + "\n")
console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
