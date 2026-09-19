/**
 * Builds the stand-in models of the Socorro craft, as Lonnie Zamora's own account and the documents
 * of the Project Blue Book file describe it, and writes them to public/models/ufoathome-socorro-craft/.
 *
 * UFO@home does not design models (see public/models/README.md): it references and places them. This
 * is not an exception but the lack of anything to reference — nobody has published a model of this
 * craft that follows the account rather than a later illustration of it — and so it is built the way
 * the star catalogue is: by a script, from sources that can be checked, into files that any better
 * model can replace by taking their ids. Page numbers are those of the Blue Book file's scan
 * (documents.theblackvault.com/bluebookdesk/pbb-socorro.pdf).
 *
 * - The hull is an ellipsoid 3.36 m across and 1.73 m high: the "oval" Zamora drew, at the size its
 *   6.41° × 3.31° make at the hundred feet he gave (see witness-socorro.json). Round in plan is
 *   ASSUMED: he saw it from one side.
 * - It stands "about three and a half feet from the ground" (his statement, p. 88): 1.07 m.
 * - On legs "slanted outwards to the ground" (p. 88). He saw two; four are built, because four
 *   imprints were measured, and each ends where Holder measured one (p. 84: sides 13′2½″, 9′7½″,
 *   14′7½″, 11′10½″, diagonals 14′5½″ and 14′6½″, meeting at 89°). Those six lengths do not quite
 *   close into one quadrilateral: the four feet are the best fit, 0.34 m out on average. Each rests
 *   on a pad the size of an imprint, 16 by 6 inches (FBI, Byrnes), its long side outwards, as an
 *   imprint "made by an object going into the earth at an angle" would be. Where the quadrilateral
 *   points is not recorded: turning the model turns it.
 * - The insignia is drawn in strokes on the hull, centred on the side he saw (the model's front,
 *   -Z), red, 2 feet wide (Holder, p. 77; FBI): "craft.gltf" carries the figure he signed (p. 85),
 *   a horseshoe arc, an inverted V inside it, a stroke under the V's apex and a bar beneath, its
 *   strokes measured on the scan; "craft-stanford.gltf" the inverted V with three bars beneath that
 *   the dispatcher and the press reported and Ray Stanford holds was the real one, the signed figure
 *   being a decoy Holder asked for. The drawing is wider than tall (0.72), which the stated 2 × 2½
 *   feet contradict: its proportions are kept, at its stated width.
 * - A node named "exhaust" marks the middle of the underside, where the flame came out (see
 *   BodyFlame), and the hull is a node named "hull", which is what is measured against the object
 *   he drew (see BodyJson.outlineNode) — not the legs, which are not in his drawing of it.
 *
 * Run with: node --import tsx scripts/build-socorro-craft.ts
 */
import { BufferGeometry, CylinderGeometry, BoxGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

interface Part {
  name: string
  geometry: BufferGeometry
  material: number
}

interface GltfMaterial {
  name: string
  pbrMetallicRoughness: { baseColorFactor: number[], metallicFactor: number, roughnessFactor: number }
}

/** A figure in strokes, in units of its own width, y downwards from its top — as measured on a scan. */
type Strokes = [number, number][][]

/** Which insignia a model carries — see the file comment. */
type Insignia = "signed" | "stanford"

/** The craft itself: its parts in metres, standing on the ground at y = 0, its front towards -Z. */
class SocorroCraft {
  static readonly HULL_RADIUS_M = 1.68
  static readonly HULL_HALF_HEIGHT_M = 0.865
  static readonly HULL_ABOVE_GROUND_M = 1.07
  /** Where the four feet stand, x and z around the hull's axis — the fit to Holder's six lengths. */
  static readonly FEET: [number, number][] = [[-1.59, 1.258], [-1.834, -1.305], [1.838, -2.094], [1.586, 2.142]]
  static readonly PAD_M = { length: 0.41, width: 0.15, thickness: 0.05 }
  /** Where a leg meets the underside, from the axis. */
  static readonly LEG_TOP_RADIUS_M = 1.0
  static readonly INSIGNIA_WIDTH_M = 0.61
  /** How wide the painted strokes are: no source says. 6 cm is chosen so that each stroke still
   * covers two pixels at the hundred feet he saw it from; at 3.5 cm a horizontal stroke could fall
   * between two rows of pixels and vanish, as the bars under the V did. */
  static readonly STROKE_WIDTH_M = 0.06
  /** How far the insignia stands proud of the hull, so the two never fight for the same pixels. */
  static readonly INSIGNIA_LIFT_M = 0.008

  /** The signed figure (p. 85), its strokes measured on the scan. The small break a pen left in the
   * arc's right side is not reproduced. */
  static readonly SIGNED: Strokes = [
    [[0, 0.45], [0.01, 0.3], [0.06, 0.14], [0.18, 0.04], [0.33, 0.005], [0.49, 0], [0.65, 0.01], [0.8, 0.05], [0.92, 0.15], [0.98, 0.3], [1.0, 0.45]],
    [[0.22, 0.42], [0.48, 0.12], [0.69, 0.44]],
    [[0.46, 0.22], [0.44, 0.47]],
    [[0.14, 0.72], [0.93, 0.67]]
  ]
  /** The inverted V with three lines beneath it ("un 'V' invertido, con tres líneas debajo"): its
   * proportions are nobody's measurement, only the description's. */
  static readonly STANFORD: Strokes = [
    [[0.1, 0.45], [0.5, 0], [0.9, 0.45]],
    [[0.1, 0.6], [0.9, 0.6]],
    [[0.1, 0.78], [0.9, 0.78]],
    [[0.1, 0.96], [0.9, 0.96]]
  ]

  private readonly hullCentreY = SocorroCraft.HULL_ABOVE_GROUND_M + SocorroCraft.HULL_HALF_HEIGHT_M

  readonly materials: GltfMaterial[] = [
    // "White, like aluminium": a light, barely metallic surface. A strongly metallic one reflects its
    // surroundings and little else, and with no environment map to reflect it rendered near black.
    SocorroCraft.material("hull", "#e8e6df", 0.15, 0.4),
    SocorroCraft.material("insignia", "#b4231f", 0, 0.6),
    SocorroCraft.material("legs", "#8a8a86", 0.2, 0.5)
  ]

  constructor(private readonly insignia: Insignia) {
  }

  parts(): Part[] {
    return [
      { name: "hull", geometry: this.hull(), material: 0 },
      { name: "insignia", geometry: this.figure(this.insignia === "signed" ? SocorroCraft.SIGNED : SocorroCraft.STANFORD), material: 1 },
      ...this.legs().map((geometry, index) => ({ name: `${index % 2 === 0 ? "leg" : "pad"}-${Math.floor(index / 2) + 1}`, geometry, material: 2 }))
    ]
  }

  /** Where the flame comes out: the middle of the underside. */
  get exhaust(): [number, number, number] {
    return [0, SocorroCraft.HULL_ABOVE_GROUND_M, 0]
  }

  private hull(): BufferGeometry {
    const geometry = new SphereGeometry(1, 64, 32)
    geometry.scale(SocorroCraft.HULL_RADIUS_M, SocorroCraft.HULL_HALF_HEIGHT_M, SocorroCraft.HULL_RADIUS_M)
    geometry.translate(0, this.hullCentreY, 0)
    geometry.computeVertexNormals()
    return geometry
  }

  /** The hull's front surface at (x, y), for laying the insignia on it rather than across it. */
  private frontZ(x: number, y: number): number {
    const a = SocorroCraft.HULL_RADIUS_M
    const b = SocorroCraft.HULL_HALF_HEIGHT_M
    const inside = 1 - (x * x) / (a * a) - ((y - this.hullCentreY) ** 2) / (b * b)
    return -a * Math.sqrt(Math.max(inside, 0))
  }

  /**
   * A figure's strokes as ribbons laid on the hull's front: each segment a strip STROKE_WIDTH_M
   * wide, finely divided so that every one of its points sits on the curved surface, the figure
   * centred on the middle of the side.
   */
  private figure(strokes: Strokes): BufferGeometry {
    const scale = SocorroCraft.INSIGNIA_WIDTH_M
    const height = Math.max(...strokes.flat().map(([, y]) => y))
    const half = SocorroCraft.STROKE_WIDTH_M / 2
    const positions: number[] = []
    const indices: number[] = []
    const onHull = (x: number, y: number) => positions.push(x, y, this.frontZ(x, y) - SocorroCraft.INSIGNIA_LIFT_M)
    for (const stroke of strokes) {
      const points = stroke.map(([u, v]) => [(u - 0.5) * scale, this.hullCentreY + (height / 2 - v) * scale])
      for (let i = 0; i + 1 < points.length; i++) {
        const [x0, y0] = points[i]
        const [x1, y1] = points[i + 1]
        const length = Math.hypot(x1 - x0, y1 - y0)
        const nx = -(y1 - y0) / length * half
        const ny = (x1 - x0) / length * half
        const steps = Math.max(1, Math.ceil(length / 0.02))
        const first = positions.length / 3
        for (let step = 0; step <= steps; step++) {
          const f = step / steps
          const x = x0 + (x1 - x0) * f
          const y = y0 + (y1 - y0) * f
          // Past the ends by half a width, so that two segments of one stroke join without a notch.
          const ex = step === 0 ? -(x1 - x0) / length * half : step === steps ? (x1 - x0) / length * half : 0
          const ey = step === 0 ? -(y1 - y0) / length * half : step === steps ? (y1 - y0) / length * half : 0
          onHull(x + ex + nx, y + ey + ny)
          onHull(x + ex - nx, y + ey - ny)
        }
        for (let step = 0; step < steps; step++) {
          const a = first + step * 2
          // Counter-clockwise from the front (-Z) it faces: a glTF material is single-sided.
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
        }
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    // Every face of a ribbon should face -Z; one that came out the other way round is flipped.
    const normal = geometry.getAttribute("normal")
    if (normal.getZ(0) > 0) {
      const index = geometry.getIndex()!
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1)
        index.setX(i + 1, index.getX(i + 2))
        index.setX(i + 2, b)
      }
      geometry.computeVertexNormals()
    }
    return geometry
  }

  /** Four legs from the underside out to the measured feet, each on a pad the size of an imprint. */
  private legs(): BufferGeometry[] {
    const legs: BufferGeometry[] = []
    const a = SocorroCraft.HULL_RADIUS_M
    const topRadius = SocorroCraft.LEG_TOP_RADIUS_M
    const topY = this.hullCentreY - SocorroCraft.HULL_HALF_HEIGHT_M * Math.sqrt(1 - (topRadius / a) ** 2)
    const pad = SocorroCraft.PAD_M
    for (const [fx, fz] of SocorroCraft.FEET) {
      const outward = Math.atan2(fz, fx)
      const top = new Vector3(Math.cos(outward) * topRadius, topY, Math.sin(outward) * topRadius)
      const foot = new Vector3(fx, pad.thickness, fz)
      const leg = new CylinderGeometry(0.05, 0.05, top.distanceTo(foot), 12)
      // A cylinder stands along +Y: turned onto the line from foot to top, then set between them.
      leg.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3().subVectors(top, foot).normalize()))
      leg.translate((top.x + foot.x) / 2, (top.y + foot.y) / 2, (top.z + foot.z) / 2)
      legs.push(leg)
      const footPad = new BoxGeometry(pad.length, pad.thickness, pad.width)
      footPad.rotateY(-outward)
      footPad.translate(fx, pad.thickness / 2, fz)
      legs.push(footPad)
    }
    return legs
  }

  /** A glTF material from an sRGB colour, which glTF wants linear. */
  private static material(name: string, css: string, metallic: number, roughness: number): GltfMaterial {
    const value = parseInt(css.slice(1), 16)
    const linear = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
      .map(channel => channel / 255)
      .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return { name, pbrMetallicRoughness: { baseColorFactor: [...linear, 1], metallicFactor: metallic, roughnessFactor: roughness } }
  }
}

/**
 * A glTF 2.0 file with its one buffer embedded: meshes of positions, normals and indices, their
 * materials, and nodes. Written by hand because three's own exporter needs a browser's FileReader,
 * and a static model needs nothing it offers.
 */
class GltfWriter {
  private readonly chunks: Buffer[] = []
  private byteLength = 0
  private readonly bufferViews: object[] = []
  private readonly accessors: object[] = []
  private readonly meshes: object[] = []
  private readonly nodes: object[] = []

  constructor(private readonly materials: GltfMaterial[]) {
  }

  addMesh(part: Part): void {
    const geometry = part.geometry
    const position = geometry.getAttribute("position")
    const normal = geometry.getAttribute("normal")
    const positions = new Float32Array(position.array)
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < position.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], positions[i * 3 + axis])
        max[axis] = Math.max(max[axis], positions[i * 3 + axis])
      }
    }
    const POSITION = this.addAccessor(positions, 34962, 5126, "VEC3", position.count, { min, max })
    const NORMAL = this.addAccessor(new Float32Array(normal.array), 34962, 5126, "VEC3", normal.count)
    const index = geometry.index!
    const indices = new Uint32Array(index.array)
    const indicesAccessor = this.addAccessor(indices, 34963, 5125, "SCALAR", index.count)
    this.meshes.push({ name: part.name, primitives: [{ attributes: { POSITION, NORMAL }, indices: indicesAccessor, material: part.material }] })
    this.nodes.push({ name: part.name, mesh: this.meshes.length - 1 })
  }

  addNode(name: string, translation: [number, number, number]): void {
    this.nodes.push({ name, translation })
  }

  toJSON(generator: string): object {
    const buffer = Buffer.concat(this.chunks)
    return {
      asset: { version: "2.0", generator },
      scene: 0,
      scenes: [{ nodes: this.nodes.map((_, index) => index) }],
      nodes: this.nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: buffer.length, uri: `data:application/octet-stream;base64,${buffer.toString("base64")}` }]
    }
  }

  private addAccessor(data: Float32Array | Uint32Array, target: number, componentType: number, type: string, count: number, bounds: object = {}): number {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    const offset = this.byteLength
    this.chunks.push(bytes)
    this.byteLength += bytes.length
    // Every view starts on a four-byte boundary, which glTF requires.
    const padding = (4 - (this.byteLength % 4)) % 4
    if (padding > 0) {
      this.chunks.push(Buffer.alloc(padding))
      this.byteLength += padding
    }
    this.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target })
    this.accessors.push({ bufferView: this.bufferViews.length - 1, componentType, count, type, ...bounds })
    return this.accessors.length - 1
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-socorro-craft")
mkdirSync(directory, { recursive: true })
for (const [insignia, name] of [["signed", "craft.gltf"], ["stanford", "craft-stanford.gltf"]] as [Insignia, string][]) {
  const craft = new SocorroCraft(insignia)
  const writer = new GltfWriter(craft.materials)
  for (const part of craft.parts()) writer.addMesh(part)
  writer.addNode("exhaust", craft.exhaust)
  const file = path.join(directory, name)
  const gltf = writer.toJSON("UFO@home scripts/build-socorro-craft.ts") as { accessors: { min?: number[], max?: number[] }[] }
  writeFileSync(file, JSON.stringify(gltf) + "\n")
  const bounds = gltf.accessors.filter(accessor => accessor.min && accessor.max)
  const size = [0, 1, 2].map(axis => Math.max(...bounds.map(b => b.max![axis])) - Math.min(...bounds.map(b => b.min![axis])))
  console.log(`Wrote ${path.relative(root, file)}: ${size.map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
}
