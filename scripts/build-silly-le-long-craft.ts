/**
 * Builds the stand-in model of the phenomenon T1 saw from his van on the RN2 near Silly-le-Long on
 * 31 May 2015 (GEIPAN 2015-05-09194), as he described it, and writes it to
 * public/models/ufoathome-silly-le-long-craft/.
 *
 * UFO@home does not design models (see public/models/README.md); like build-valensole-craft.ts, this
 * one has nothing to reference, and is built from figures anyone can check against the GEIPAN's
 * report (CR) and the gendarmerie's file (PV).
 *
 * ONE object, whatever side it is seen from. Before the bridge T1 saw it from the front, low over
 * the horizon: a "masse sombre horizontale plate" with two steady white lights at its ends and a
 * red one flashing near the left one (CR p.4-6, drawing 004). Past the bridge he saw it close, from
 * the side and then from behind: the two branches of a flattened V, grey and smooth "comme du
 * béton", and at the rear two white rectangles flashing together, the front lights gone (CR p.4,
 * 8-9, drawing 005). A flat V flying towards him is that bar; the same V seen from behind and below
 * is drawing 005, its rear face a band over its darker underside and its point down.
 *
 * - The span: 34 m. T1 gave 30 m wide (CR p.4, PV p.10); held still where he placed it (PV p.7) at
 *   the sizes the GEIPAN's reconstitution fitted to his pointings (CR p.49-54), it measures 32 to
 *   35 m all along the approach, and 34 m is that.
 * - The branches: square in section (CR p.8), 5 m — the smaller of his "Epaisseur 5 à 8 mètres"
 *   (PV p.10), and the height of the bar from afar.
 * - Front to back: 20 m, ASSUMED. He said both "plus large que longue, mais de très peu" (CR p.8) and
 *   "trois fois sa longueur" (CR p.4); 20 m lies between, and the front was never seen, its
 *   appearance assumed by T1 himself (CR p.8).
 * - The ends cut square, along the line of flight: drawing 005 shows them vertical.
 * - The front lights: 1 m across (ASSUMED; smaller than the rear rectangles, CR p.4), on the leading
 *   edges near each end, the red 11.5 % of the span in from the left one as T1 saw it from the front
 *   (drawing 004). Behind the hull they are hidden by it: "Dès après le passage sous le pont, les
 *   lumières à l'avant du PAN n'étaient plus visibles" (CR p.8).
 * - The rear rectangles: at each end of the rear face, its full thickness (CR p.4), 9.5 % of the span
 *   wide (drawing 005). Off, darker than the grey (CR p.8).
 * - Each light has its own material, named, so that the recording switches it on its own (see
 *   BodyKeyframe.lights): the model says where and what colour, the track when and how bright.
 * - The hull is a node named "hull", which is what the drawn outlines are measured against.
 *
 * Run with: node --import tsx scripts/build-silly-le-long-craft.ts
 */
import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Shape } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial, Part } from "./GltfWriter.js"

/** A point of the plan, metres: x to the craft's right, z towards its back (its front is -Z). */
type PlanPoint = [number, number]

/** The craft, in metres, its middle at the origin, its front towards -Z. */
class SillyLeLongCraft {
  static readonly SPAN_M = 34
  static readonly LENGTH_M = 20
  static readonly THICKNESS_M = 5
  static readonly FRONT_LIGHT_M = 1
  static readonly RED_IN_SHARE = 0.115
  static readonly REAR_LIGHT_SHARE = 0.095
  /** How far a light stands proud of the face it is on: enough for the hull not to hide it. */
  static readonly PROUD_M = 0.06

  readonly materials: GltfMaterial[] = [
    // Grey and smooth "comme du béton", matte: nothing in the account shone off it.
    GltfWriter.material("hull", "#9a9da0", 0, 0.9),
    ...["front-white-left", "front-white-right"].map(name => GltfWriter.material(name, "#15161a", 0, 0.6, { emissiveFactor: [1, 1, 1] })),
    GltfWriter.material("front-red", "#15161a", 0, 0.6, { emissiveFactor: [1, 0.08, 0.05] }),
    // White "comme des LED" when lit, darker than the grey when not (CR p.8).
    ...["rear-left", "rear-right"].map(name => GltfWriter.material(name, "#0b0c0e", 0, 0.6, { emissiveFactor: [0.93, 0.96, 1] }))
  ]

  /** Where the nose is, where each leading edge ends, and how deep a branch is along z. */
  private readonly apexZ = -SillyLeLongCraft.LENGTH_M / 2
  private readonly tailZ = SillyLeLongCraft.LENGTH_M / 2
  /** A branch's depth along the line of flight, for THICKNESS_M across it: solved, since the
   * branches' slant depends on it. */
  private readonly depthZ: number

  constructor() {
    const half = SillyLeLongCraft.SPAN_M / 2
    let depth = SillyLeLongCraft.THICKNESS_M
    for (let i = 0; i < 20; i++) {
      const slant = Math.atan((SillyLeLongCraft.LENGTH_M - depth) / half)
      depth = SillyLeLongCraft.THICKNESS_M / Math.cos(slant)
    }
    this.depthZ = depth
  }

  write(writer: GltfWriter): void {
    writer.addMesh({ name: "hull", geometry: this.hull(), material: 0 })
    for (const part of this.lights()) writer.addMesh(part)
  }

  /** The plan: nose, right leading tip, right trailing tip, notch, and the left side mirrored. */
  private plan(): PlanPoint[] {
    const half = SillyLeLongCraft.SPAN_M / 2
    const leadTipZ = this.tailZ - this.depthZ
    const notchZ = this.apexZ + this.depthZ
    return [[0, this.apexZ], [half, leadTipZ], [half, this.tailZ], [0, notchZ], [-half, this.tailZ], [-half, leadTipZ]]
  }

  /** The plan raised to its thickness, centred on y = 0. */
  private hull(): BufferGeometry {
    const shape = new Shape()
    const plan = this.plan()
    // The shape's y is the plan's -z, so that lying it down (x unchanged, y up) puts the nose at -Z.
    shape.moveTo(plan[0][0], -plan[0][1])
    for (const [x, z] of plan.slice(1)) shape.lineTo(x, -z)
    shape.closePath()
    const geometry = new ExtrudeGeometry(shape, { depth: SillyLeLongCraft.THICKNESS_M, bevelEnabled: false })
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, -SillyLeLongCraft.THICKNESS_M / 2, 0)
    return SillyLeLongCraft.indexed(geometry)
  }

  /** The five lights, each a thin plate on the face it is on. */
  private lights(): Part[] {
    const half = SillyLeLongCraft.SPAN_M / 2
    const leadTipZ = this.tailZ - this.depthZ
    const notchZ = this.apexZ + this.depthZ
    const parts: Part[] = []
    const front = SillyLeLongCraft.FRONT_LIGHT_M
    // Seen from the front, T1's left is the craft's right, +x.
    for (const [name, side, inset] of [
      ["front-white-left", 1, front], ["front-white-right", -1, front], ["front-red", 1, SillyLeLongCraft.RED_IN_SHARE * SillyLeLongCraft.SPAN_M]
    ] as const) {
      const x = side * (half - inset)
      const z = this.apexZ + (leadTipZ - this.apexZ) * (Math.abs(x) / half)
      parts.push({ name, geometry: this.plate([0, this.apexZ], [side * half, leadTipZ], [x, z], front, front, -1), material: this.materialOf(name) })
    }
    const width = SillyLeLongCraft.REAR_LIGHT_SHARE * SillyLeLongCraft.SPAN_M
    for (const [name, side] of [["rear-left", 1], ["rear-right", -1]] as const) {
      // Along the rear face, from its end: the middle of a plate `width` long.
      const along = (width / 2) / Math.hypot(half, this.tailZ - notchZ)
      const x = side * half * (1 - along)
      const z = this.tailZ - (this.tailZ - notchZ) * along
      parts.push({ name, geometry: this.plate([0, notchZ], [side * half, this.tailZ], [x, z], width, SillyLeLongCraft.THICKNESS_M, 1), material: this.materialOf(name) })
    }
    return parts
  }

  private materialOf(name: string): number {
    return this.materials.findIndex(material => material.name === name)
  }

  /**
   * A plate `width` along the edge from `from` to `to`, `height` tall, centred on `at` and set proud
   * of the face on the side `facing` says: -1 the side towards the nose, 1 the side towards the tail.
   */
  private plate(from: PlanPoint, to: PlanPoint, at: PlanPoint, width: number, height: number, facing: -1 | 1): BufferGeometry {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const length = Math.hypot(dx, dz)
    const ux = dx / length
    const uz = dz / length
    // The face's normal, turned to the side asked for.
    let nx = -uz
    let nz = ux
    if (Math.sign(nz) !== facing) {
      nx = -nx
      nz = -nz
    }
    const geometry = new BoxGeometry(width, height, SillyLeLongCraft.PROUD_M * 2)
    // The box's own x along the edge, its own z along the normal.
    geometry.rotateY(Math.atan2(-uz, ux))
    geometry.translate(at[0] + nx * SillyLeLongCraft.PROUD_M, 0, at[1] + nz * SillyLeLongCraft.PROUD_M)
    return geometry
  }

  /** ExtrudeGeometry gives no index, which a glTF mesh here is written with: one per vertex. */
  private static indexed(geometry: BufferGeometry): BufferGeometry {
    const count = geometry.getAttribute("position").count
    geometry.setIndex(Array.from({ length: count }, (_, i) => i))
    geometry.deleteAttribute("uv")
    return geometry
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-silly-le-long-craft")
mkdirSync(directory, { recursive: true })
const craft = new SillyLeLongCraft()
const writer = new GltfWriter(craft.materials)
craft.write(writer)
const file = path.join(directory, "craft.gltf")
const gltf = writer.toJSON("UFO@home scripts/build-silly-le-long-craft.ts")
writeFileSync(file, JSON.stringify(gltf) + "\n")
console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
