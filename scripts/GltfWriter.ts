/**
 * Writing a glTF 2.0 file by hand, for the stand-in models this project builds from accounts
 * (see public/models/README.md and the build-*-craft scripts).
 *
 * By hand because three's own exporter needs a browser's FileReader, and a static model needs
 * nothing it offers. One buffer, embedded: meshes of positions, normals and indices, their
 * materials, and nodes.
 */
import type { BufferGeometry } from "three"

/** One mesh of a model: a geometry, the name the renderer finds it by, and which material it wears. */
export interface Part {
  name: string
  geometry: BufferGeometry
  material: number
}

export interface GltfMaterial {
  name: string
  pbrMetallicRoughness: {
    baseColorFactor: number[]
    metallicFactor: number
    roughnessFactor: number
  }
  /** What it gives out of itself, linear RGB — a lit window, a glowing panel. */
  emissiveFactor?: number[]
  /** Whether it lets the light through, and how: glTF's own "OPAQUE" or "BLEND". */
  alphaMode?: string
  doubleSided?: boolean
  /** glTF material extensions, by name — KHR_materials_transmission and KHR_materials_ior for glass. */
  extensions?: Record<string, object>
}

export class GltfWriter {
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

  /**
   * A node with no mesh: a place on the model something else is hung from — where a flame comes
   * out, and, with `rotation`, which way it points (see BodyFlame).
   *
   * @param rotation A quaternion, x, y, z, w, as glTF writes one. None means the model's own axes.
   */
  addNode(name: string, translation: [number, number, number], rotation?: [number, number, number, number]): void {
    this.nodes.push(rotation ? { name, translation, rotation } : { name, translation })
  }

  toJSON(generator: string): object {
    const buffer = Buffer.concat(this.chunks)
    const extensionsUsed = [...new Set(this.materials.flatMap(material => Object.keys(material.extensions ?? {})))]
    return {
      asset: { version: "2.0", generator },
      ...(extensionsUsed.length > 0 ? { extensionsUsed } : {}),
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

  /** A glTF material from an sRGB colour, which glTF wants linear. */
  static material(name: string, css: string, metallic: number, roughness: number, extra: Partial<GltfMaterial> = {}): GltfMaterial {
    return { name, pbrMetallicRoughness: { baseColorFactor: [...GltfWriter.linear(css), 1], metallicFactor: metallic, roughnessFactor: roughness }, ...extra }
  }

  /** An sRGB colour as glTF's linear three. */
  static linear(css: string): number[] {
    const value = parseInt(css.slice(1), 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
      .map(channel => channel / 255)
      .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
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

/** What a builder writes out: the file's size along each axis, for the catalogue entry. */
export class GltfBounds {
  static sizeOf(gltf: object): number[] {
    const accessors = (gltf as { accessors: { min?: number[], max?: number[] }[] }).accessors.filter(a => a.min && a.max)
    return [0, 1, 2].map(axis => Math.max(...accessors.map(a => a.max![axis])) - Math.min(...accessors.map(a => a.min![axis])))
  }
}
