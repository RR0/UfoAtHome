/**
 * Splits Jungle Jim's "Realistic Trees Collection" (CC BY 4.0) into one light glTF per tree, and writes
 * them to public/models/jungle-jim-realistic-trees/ with the catalogue entries to paste in index.json.
 *
 * The source is one scene of seven trees standing side by side, 11 MB of geometry and 21 PNGs of 1024 px
 * (twenty of which are the same four pictures: one bark, three leaf sheets). A decor object is one tree
 * seen at tens of metres, a scene may hold two hundred of them, so:
 * - each tree is its own file, moved to stand on y = 0 on its own trunk, in metres (the collection's unit is
 *   a tenth of a metre once the FBX scale is applied: its tallest tree is 10.7 m, which is a tree);
 * - the geometry is simplified (meshoptimizer), to a few thousand triangles a tree: the foliage is cards,
 *   which simplify well, and the branches are a mesh nobody counts the twigs of at that distance;
 * - the leaves are cut out (alpha test) rather than blended, so two hundred trees need no sorting and throw
 *   a leafy shadow;
 * - the textures are shrunk once (bark 256 px, leaf sheets 512 px, by `sips`, which only macOS has: pass the
 *   directory of the shrunk pictures as the third argument), and the normal maps are dropped.
 *
 * Run with: node scripts/build-realistic-trees.ts <collection dir> <out dir> <shrunk textures dir>
 * where the shrunk dir holds bark.png, leaves-A.png, leaves-B.png and leaves-C.png.
 */
import { MeshoptSimplifier } from "meshoptimizer"
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

interface GltfNode { name?: string, mesh?: number, children?: number[], matrix?: number[] }
interface GltfPrimitive { attributes: Record<string, number>, indices: number, material: number }
interface GltfAccessor { bufferView: number, byteOffset?: number, count: number, componentType: number, type: string }
interface GltfView { byteOffset?: number, byteLength: number, byteStride?: number }
interface SourceGltf {
  nodes: GltfNode[]
  meshes: { name: string, primitives: GltfPrimitive[] }[]
  accessors: GltfAccessor[]
  bufferViews: GltfView[]
}

/** The unit conversion left once the nodes' own matrices are applied: the collection's trees come out as 10 x too tall. */
const METRES_PER_UNIT = 0.1

/** A tree of the collection: which node group it is, what it is called here, and which leaf sheet it wears. */
interface TreeSpec {
  group: string
  slug: string
  name: string
  leaves: "A" | "B" | "C"
}

const TREES: TreeSpec[] = [
  { group: "Tree EZTree0.Large", slug: "large-a", name: "Large broadleaf tree A", leaves: "A" },
  { group: "Tree EZTree1.Large001", slug: "large-b", name: "Large broadleaf tree B", leaves: "A" },
  { group: "Tree EZTree1.Large009", slug: "large-c", name: "Large broadleaf tree C", leaves: "B" },
  { group: "Tree EZTree0.Medium010", slug: "medium-a", name: "Medium broadleaf tree A", leaves: "B" },
  { group: "Tree EZTree0.Medium011", slug: "medium-b", name: "Medium broadleaf tree B", leaves: "B" },
  { group: "Tree EZTree1.Medium002", slug: "medium-c", name: "Medium broadleaf tree C", leaves: "A" },
  { group: "Tree EZTree1.Bush006", slug: "bush", name: "Bush", leaves: "C" }
]

/** Triangles kept: a tree seen at tens of metres has no use for the rest. */
const BRANCH_TRIANGLES = 1800
const LEAF_TRIANGLES = 3600

class Mat4 {
  static identity(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  }

  /** Column-major a * b. */
  static multiply(a: number[], b: number[]): number[] {
    const out = new Array<number>(16).fill(0)
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k]
      }
    }
    return out
  }
}

class Collection {
  readonly gltf: SourceGltf
  private readonly bin: Buffer
  private readonly parents = new Map<number, number>()

  readonly dir: string

  constructor(dir: string) {
    this.dir = dir
    this.gltf = JSON.parse(readFileSync(path.join(dir, "scene.gltf"), "utf8")) as SourceGltf
    this.bin = readFileSync(path.join(dir, "scene.bin"))
    this.gltf.nodes.forEach((node, index) => node.children?.forEach(child => this.parents.set(child, index)))
  }

  nodeNamed(name: string): number {
    const index = this.gltf.nodes.findIndex(node => node.name === name)
    if (index < 0) throw new Error(`No node named ${name}`)
    return index
  }

  world(node: number): number[] {
    let matrix = this.gltf.nodes[node].matrix ?? Mat4.identity()
    for (let parent = this.parents.get(node); parent !== undefined; parent = this.parents.get(parent)) {
      matrix = Mat4.multiply(this.gltf.nodes[parent].matrix ?? Mat4.identity(), matrix)
    }
    return matrix
  }

  floats(accessor: number, components: number): Float32Array {
    const { bufferView, count, byteOffset = 0 } = this.gltf.accessors[accessor]
    const view = this.gltf.bufferViews[bufferView]
    const stride = view.byteStride ?? components * 4
    const out = new Float32Array(count * components)
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < components; c++) out[i * components + c] = this.bin.readFloatLE((view.byteOffset ?? 0) + byteOffset + i * stride + c * 4)
    }
    return out
  }

  indices(accessor: number): Uint32Array {
    const { bufferView, count, componentType, byteOffset = 0 } = this.gltf.accessors[accessor]
    const view = this.gltf.bufferViews[bufferView]
    const size = componentType === 5125 ? 4 : componentType === 5123 ? 2 : 1
    const stride = view.byteStride ?? size
    const out = new Uint32Array(count)
    for (let i = 0; i < count; i++) {
      const at = (view.byteOffset ?? 0) + byteOffset + i * stride
      out[i] = size === 4 ? this.bin.readUInt32LE(at) : size === 2 ? this.bin.readUInt16LE(at) : this.bin.readUInt8(at)
    }
    return out
  }
}

/** One mesh of a tree: positions in metres, normals, texture coordinates, triangles. */
interface Part {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

class TreeBuilder {
  private readonly collection: Collection
  private readonly spec: TreeSpec

  constructor(collection: Collection, spec: TreeSpec) {
    this.collection = collection
    this.spec = spec
  }

  /** The parts of the tree: its branches, and its leaves (one or two meshes, joined). */
  parts(): { branches: Part, leaves: Part } {
    const { gltf } = this.collection
    const group = this.collection.nodeNamed(this.spec.group)
    const branches: Part[] = []
    const leaves: Part[] = []
    for (const child of gltf.nodes[group].children ?? []) {
      const node = gltf.nodes[child]
      const mesh = gltf.meshes[node.mesh!]
      const matrix = this.collection.world(child)
      for (const primitive of mesh.primitives) {
        const part = this.read(primitive, matrix)
        ;(mesh.name.includes("branches") ? branches : leaves).push(part)
      }
    }
    const joined = { branches: TreeBuilder.join(branches), leaves: TreeBuilder.join(leaves) }
    // Standing on its own trunk, at y = 0: the lowest part of the branches, where they are.
    let minY = Infinity
    for (let i = 1; i < joined.branches.positions.length; i += 3) minY = Math.min(minY, joined.branches.positions[i])
    let sumX = 0, sumZ = 0, n = 0
    for (let i = 0; i < joined.branches.positions.length; i += 3) {
      if (joined.branches.positions[i + 1] < minY + 0.15) {
        sumX += joined.branches.positions[i]
        sumZ += joined.branches.positions[i + 2]
        n++
      }
    }
    const cx = sumX / n, cz = sumZ / n
    for (const part of [joined.branches, joined.leaves]) {
      for (let i = 0; i < part.positions.length; i += 3) {
        part.positions[i] -= cx
        part.positions[i + 1] -= minY
        part.positions[i + 2] -= cz
      }
    }
    return joined
  }

  private read(primitive: GltfPrimitive, m: number[]): Part {
    const source = this.collection.floats(primitive.attributes.POSITION, 3)
    const sourceNormals = this.collection.floats(primitive.attributes.NORMAL, 3)
    const positions = new Float32Array(source.length)
    const normals = new Float32Array(source.length)
    for (let i = 0; i < source.length; i += 3) {
      const x = source[i], y = source[i + 1], z = source[i + 2]
      positions[i] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * METRES_PER_UNIT
      positions[i + 1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * METRES_PER_UNIT
      positions[i + 2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * METRES_PER_UNIT
      const nx = sourceNormals[i], ny = sourceNormals[i + 1], nz = sourceNormals[i + 2]
      const tx = m[0] * nx + m[4] * ny + m[8] * nz
      const ty = m[1] * nx + m[5] * ny + m[9] * nz
      const tz = m[2] * nx + m[6] * ny + m[10] * nz
      const length = Math.hypot(tx, ty, tz) || 1
      normals[i] = tx / length
      normals[i + 1] = ty / length
      normals[i + 2] = tz / length
    }
    return { positions, normals, uvs: this.collection.floats(primitive.attributes.TEXCOORD_0, 2), indices: this.collection.indices(primitive.indices) }
  }

  private static join(parts: Part[]): Part {
    const vertices = parts.reduce((sum, part) => sum + part.positions.length / 3, 0)
    const triangles = parts.reduce((sum, part) => sum + part.indices.length, 0)
    const joined: Part = { positions: new Float32Array(vertices * 3), normals: new Float32Array(vertices * 3), uvs: new Float32Array(vertices * 2), indices: new Uint32Array(triangles) }
    let vertex = 0, index = 0
    for (const part of parts) {
      joined.positions.set(part.positions, vertex * 3)
      joined.normals.set(part.normals, vertex * 3)
      joined.uvs.set(part.uvs, vertex * 2)
      for (let i = 0; i < part.indices.length; i++) joined.indices[index + i] = part.indices[i] + vertex
      vertex += part.positions.length / 3
      index += part.indices.length
    }
    return joined
  }
}

class Decimator {
  /** The part with about `triangles` triangles left, its vertices renumbered. */
  static reduce(part: Part, triangles: number): Part {
    let indices = part.indices
    if (indices.length / 3 > triangles) {
      const attributes = new Float32Array((part.positions.length / 3) * 5)
      for (let i = 0; i < part.positions.length / 3; i++) {
        attributes.set(part.normals.subarray(i * 3, i * 3 + 3), i * 5)
        attributes.set(part.uvs.subarray(i * 2, i * 2 + 2), i * 5 + 3)
      }
      try {
        ;[indices] = MeshoptSimplifier.simplifyWithAttributes(part.indices, part.positions, 3, attributes, 5, [0.5, 0.5, 0.5, 1, 1], null, triangles * 3, 0.2, ["Prune", "Permissive"])
      } catch (error) {
        console.log(`  (simplifier failed on ${part.positions.length / 3} vertices, ${part.indices.length / 3} triangles: ${error}; trying positions alone)`)
        ;[indices] = MeshoptSimplifier.simplify(part.indices, part.positions, 3, triangles * 3, 0.2, ["Prune", "Permissive"])
      }
    }
    const remap = new Map<number, number>()
    const used: number[] = []
    const out = new Uint32Array(indices.length)
    for (let i = 0; i < indices.length; i++) {
      let to = remap.get(indices[i])
      if (to === undefined) {
        to = used.length
        remap.set(indices[i], to)
        used.push(indices[i])
      }
      out[i] = to
    }
    const positions = new Float32Array(used.length * 3), normals = new Float32Array(used.length * 3), uvs = new Float32Array(used.length * 2)
    used.forEach((from, to) => {
      positions.set(part.positions.subarray(from * 3, from * 3 + 3), to * 3)
      normals.set(part.normals.subarray(from * 3, from * 3 + 3), to * 3)
      uvs.set(part.uvs.subarray(from * 2, from * 2 + 2), to * 2)
    })
    return { positions, normals, uvs, indices: out }
  }
}

class GlbWriter {
  private readonly chunks: Buffer[] = []
  private length = 0
  readonly views: object[] = []
  readonly accessors: object[] = []

  /** Adds a block of the binary chunk (4-byte aligned) and returns the index of its buffer view. */
  view(data: Buffer, target?: number): number {
    const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)])
    this.views.push({ buffer: 0, byteOffset: this.length, byteLength: data.length, ...(target ? { target } : {}) })
    this.chunks.push(padded)
    this.length += padded.length
    return this.views.length - 1
  }

  accessor(data: Float32Array | Uint32Array, type: string, componentType: number, target: number): number {
    const components = type === "VEC3" ? 3 : type === "VEC2" ? 2 : 1
    const bufferView = this.view(Buffer.from(data.buffer, data.byteOffset, data.byteLength), target)
    const bounds: { min?: number[], max?: number[] } = {}
    if (type === "VEC3" && data instanceof Float32Array) {
      bounds.min = [Infinity, Infinity, Infinity]
      bounds.max = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < data.length; i += 3) {
        for (let c = 0; c < 3; c++) {
          bounds.min[c] = Math.min(bounds.min[c], data[i + c])
          bounds.max[c] = Math.max(bounds.max[c], data[i + c])
        }
      }
    }
    this.accessors.push({ bufferView, componentType, count: data.length / components, type, ...bounds })
    return this.accessors.length - 1
  }

  binary(): Buffer {
    return Buffer.concat(this.chunks)
  }

  static pack(json: object, bin: Buffer): Buffer {
    const text = Buffer.from(JSON.stringify(json))
    const jsonChunk = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)])
    const header = Buffer.alloc(12)
    header.writeUInt32LE(0x46546c67, 0)
    header.writeUInt32LE(2, 4)
    header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8)
    const jsonHeader = Buffer.alloc(8)
    jsonHeader.writeUInt32LE(jsonChunk.length, 0)
    jsonHeader.writeUInt32LE(0x4e4f534a, 4)
    const binHeader = Buffer.alloc(8)
    binHeader.writeUInt32LE(bin.length, 0)
    binHeader.writeUInt32LE(0x004e4942, 4)
    return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin])
  }
}

const FLOAT = 5126
const UNSIGNED_INT = 5125
const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963

/** Writes one tree as a GLB: a branches mesh and a leaves mesh, two materials, two embedded pictures. */
function writeTree(spec: TreeSpec, parts: { branches: Part, leaves: Part }, textures: string, file: string): { sizeM: { widthM: number, lengthM: number, heightM: number }, triangles: number } {
  const writer = new GlbWriter()
  const primitives = [parts.branches, parts.leaves].map((part, material) => ({
    attributes: {
      POSITION: writer.accessor(part.positions, "VEC3", FLOAT, ARRAY_BUFFER),
      NORMAL: writer.accessor(part.normals, "VEC3", FLOAT, ARRAY_BUFFER),
      TEXCOORD_0: writer.accessor(part.uvs, "VEC2", FLOAT, ARRAY_BUFFER)
    },
    indices: writer.accessor(part.indices, "SCALAR", UNSIGNED_INT, ELEMENT_ARRAY_BUFFER),
    material
  }))
  const barkView = writer.view(readFileSync(path.join(textures, "bark.png")))
  const leafView = writer.view(readFileSync(path.join(textures, `leaves-${spec.leaves}.png`)))
  const json = {
    asset: { version: "2.0", generator: "UFO@home scripts/build-realistic-trees.ts", extras: { source: "https://sketchfab.com/3d-models/realistic-trees-collection-fe67c886eebf4bcb988d7c45e69995ad", author: "Jungle Jim", license: "CC-BY-4.0" } },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: spec.slug, mesh: 0 }],
    meshes: [{ name: spec.slug, primitives }],
    materials: [
      { name: "bark", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.95 }, doubleSided: true },
      { name: "leaves", pbrMetallicRoughness: { baseColorTexture: { index: 1 }, metallicFactor: 0, roughnessFactor: 0.9 }, alphaMode: "MASK", alphaCutoff: 0.5, doubleSided: true }
    ],
    textures: [{ source: 0 }, { source: 1 }],
    images: [{ bufferView: barkView, mimeType: "image/png" }, { bufferView: leafView, mimeType: "image/png" }],
    accessors: writer.accessors,
    bufferViews: writer.views,
    buffers: [{ byteLength: writer.binary().length }]
  }
  writeFileSync(file, GlbWriter.pack(json, writer.binary()))
  const all = [...parts.branches.positions, ...parts.leaves.positions]
  const extent = (axis: number) => {
    let min = Infinity, max = -Infinity
    for (let i = axis; i < all.length; i += 3) {
      min = Math.min(min, all[i])
      max = Math.max(max, all[i])
    }
    return max - min
  }
  const round = (value: number) => Math.round(value * 10) / 10
  return {
    sizeM: { widthM: round(extent(0)), lengthM: round(extent(2)), heightM: round(extent(1)) },
    triangles: (parts.branches.indices.length + parts.leaves.indices.length) / 3
  }
}

async function main(): Promise<void> {
  const [collectionDir, outDir, texturesDir] = process.argv.slice(2)
  if (!collectionDir || !outDir || !texturesDir) throw new Error("Usage: node scripts/build-realistic-trees.ts <collection dir> <out dir> <shrunk textures dir>")
  await MeshoptSimplifier.ready
  mkdirSync(outDir, { recursive: true })
  const collection = new Collection(collectionDir)
  const entries = []
  for (const spec of TREES) {
    const raw = new TreeBuilder(collection, spec).parts()
    const parts = { branches: Decimator.reduce(raw.branches, BRANCH_TRIANGLES), leaves: Decimator.reduce(raw.leaves, LEAF_TRIANGLES) }
    const file = `${spec.slug}.glb`
    const { sizeM, triangles } = writeTree(spec, parts, texturesDir, path.join(outDir, file))
    console.log(`${spec.slug}: ${raw.branches.indices.length / 3 + raw.leaves.indices.length / 3} -> ${triangles} triangles, ${sizeM.widthM} x ${sizeM.lengthM} x ${sizeM.heightM} m`)
    entries.push({
      id: `jungle-jim-tree-${spec.slug}`,
      kind: "tree",
      name: `${spec.name} (realistic)`,
      file: `jungle-jim-realistic-trees/${file}`,
      sizeM,
      credit: {
        title: `Realistic Trees Collection — ${spec.name}`,
        author: "Jungle Jim",
        license: "CC BY 4.0",
        sourceUrl: "https://sketchfab.com/3d-models/realistic-trees-collection-fe67c886eebf4bcb988d7c45e69995ad"
      }
    })
  }
  copyFileSync(path.join(collectionDir, "license.txt"), path.join(outDir, "License.txt"))
  writeFileSync(path.join(outDir, "catalogue-entries.json"), JSON.stringify(entries, null, 2))
}

await main()
