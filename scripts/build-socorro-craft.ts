/**
 * Builds the stand-in model of the Socorro craft, as Lonnie Zamora's own account and the recording
 * made of it describe it, and writes it to public/models/ufoathome-socorro-craft/craft.gltf.
 *
 * UFO@home does not design models (see public/models/README.md): it references and places them. This
 * is not an exception but the lack of anything to reference — nobody has published a model of this
 * craft that follows the account rather than a later illustration of it — and so it is built the way
 * the star catalogue is: by a script, from sources that can be checked, into a file that any better
 * model can replace by taking its id. Everything it states comes from somewhere:
 *
 * - The hull is an ellipsoid 3.36 m across and 1.73 m high, round in plan: the "oval" Zamora drew,
 *   at the size its 6.41° × 3.31° make at the hundred feet he gave (see witness-socorro.json).
 *   Round in plan is ASSUMED: he saw it from one side.
 * - The insignia is the red oval the recording draws on it (1.40° × 1.12° at a hundred feet, so
 *   0.74 × 0.60 m), centred on the side he saw — the model's front, -Z. Its outline is the
 *   recording's approximate one; the figure inside it, which the sources disagree about, is not
 *   drawn.
 * - The legs are there because he said it stood on legs; four, splayed, because four landing marks
 *   were measured on the site. Their height (0.6 m) and shape are ASSUMED.
 * - A node named "exhaust" marks the middle of the underside, where the flame he saw came out (see
 *   BodyFlame), so that where a flame comes from is the model's to say.
 *
 * Run with: node --import tsx scripts/build-socorro-craft.ts
 */
import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Quaternion, SphereGeometry, Vector3 } from "three"
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

/** The craft itself: its parts in metres, standing on the ground at y = 0, its front towards -Z. */
class SocorroCraft {
  static readonly HULL_RADIUS_M = 1.68
  static readonly HULL_HALF_HEIGHT_M = 0.865
  static readonly LEG_HEIGHT_M = 0.6
  static readonly INSIGNIA_HALF_WIDTH_M = 0.37
  static readonly INSIGNIA_HALF_HEIGHT_M = 0.30
  /** How far the insignia stands proud of the hull, so the two never fight for the same pixels. */
  static readonly INSIGNIA_LIFT_M = 0.008

  private readonly hullCentreY = SocorroCraft.LEG_HEIGHT_M + SocorroCraft.HULL_HALF_HEIGHT_M

  readonly materials: GltfMaterial[] = [
    // "White, like aluminium": a light, barely metallic surface. A strongly metallic one reflects its
    // surroundings and little else, and with no environment map to reflect it rendered near black.
    SocorroCraft.material("hull", "#e8e6df", 0.15, 0.4),
    SocorroCraft.material("insignia", "#b4231f", 0, 0.6),
    SocorroCraft.material("legs", "#8a8a86", 0.2, 0.5)
  ]

  parts(): Part[] {
    return [
      { name: "hull", geometry: this.hull(), material: 0 },
      { name: "insignia", geometry: this.insignia(), material: 1 },
      // Each leg is followed by its pad.
      ...this.legs().map((geometry, index) => ({ name: `${index % 2 === 0 ? "leg" : "pad"}-${Math.floor(index / 2) + 1}`, geometry, material: 2 }))
    ]
  }

  /** Where the flame comes out: the middle of the underside. */
  get exhaust(): [number, number, number] {
    return [0, SocorroCraft.LEG_HEIGHT_M, 0]
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

  /** The red oval: a disc of rings and spokes, each of its points put on the curved hull. */
  private insignia(): BufferGeometry {
    const rings = 12
    const spokes = 48
    const positions: number[] = []
    const indices: number[] = []
    const add = (r: number, angle: number) => {
      const x = SocorroCraft.INSIGNIA_HALF_WIDTH_M * r * Math.cos(angle)
      const y = this.hullCentreY + SocorroCraft.INSIGNIA_HALF_HEIGHT_M * r * Math.sin(angle)
      positions.push(x, y, this.frontZ(x, y) - SocorroCraft.INSIGNIA_LIFT_M)
    }
    add(0, 0)
    for (let ring = 1; ring <= rings; ring++) {
      for (let spoke = 0; spoke < spokes; spoke++) add(ring / rings, (spoke / spokes) * 2 * Math.PI)
    }
    const at = (ring: number, spoke: number) => ring === 0 ? 0 : 1 + (ring - 1) * spokes + (spoke % spokes)
    for (let ring = 0; ring < rings; ring++) {
      for (let spoke = 0; spoke < spokes; spoke++) {
        // Wound clockwise as seen from +Z, i.e. counter-clockwise from the front (-Z) it faces: a
        // glTF material is single-sided, and the other way round it faced into the hull and was
        // culled from every point of view outside it.
        if (ring === 0) {
          indices.push(at(0, 0), at(1, spoke + 1), at(1, spoke))
        } else {
          indices.push(at(ring, spoke), at(ring, spoke + 1), at(ring + 1, spoke))
          indices.push(at(ring, spoke + 1), at(ring + 1, spoke + 1), at(ring + 1, spoke))
        }
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  /** Four splayed legs from the underside to the ground, each on a round pad. */
  private legs(): BufferGeometry[] {
    const legs: BufferGeometry[] = []
    const topRadius = 0.9
    const footRadius = 1.25
    const topY = this.hullCentreY - SocorroCraft.HULL_HALF_HEIGHT_M * Math.sqrt(1 - (topRadius / SocorroCraft.HULL_RADIUS_M) ** 2)
    for (let index = 0; index < 4; index++) {
      const angle = Math.PI / 4 + (index * Math.PI) / 2
      const top = new Vector3(Math.cos(angle) * topRadius, topY, Math.sin(angle) * topRadius)
      const foot = new Vector3(Math.cos(angle) * footRadius, 0.05, Math.sin(angle) * footRadius)
      const leg = new CylinderGeometry(0.05, 0.05, top.distanceTo(foot), 12)
      // A cylinder stands along +Y: turned onto the line from foot to top, then set between them.
      leg.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3().subVectors(top, foot).normalize()))
      leg.translate((top.x + foot.x) / 2, (top.y + foot.y) / 2, (top.z + foot.z) / 2)
      legs.push(leg)
      const pad = new CylinderGeometry(0.16, 0.18, 0.05, 20)
      pad.translate(foot.x, 0.025, foot.z)
      legs.push(pad)
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

const craft = new SocorroCraft()
const writer = new GltfWriter(craft.materials)
for (const part of craft.parts()) writer.addMesh(part)
writer.addNode("exhaust", craft.exhaust)
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-socorro-craft")
mkdirSync(directory, { recursive: true })
const file = path.join(directory, "craft.gltf")
writeFileSync(file, JSON.stringify(writer.toJSON("UFO@home scripts/build-socorro-craft.ts")) + "\n")
console.log(`Wrote ${path.relative(root, file)}`)
