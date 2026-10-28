/**
 * Makes a heavy glTF model (a photogrammetry capture, typically: hundreds of thousands of triangles and a 4K texture) light enough to be
 * hosted and drawn as scenery: each primitive's mesh simplified to a share of its triangles (meshoptimizer, its borders locked so that the
 * chunks of a capture still meet), only the vertices still used kept, with 16-bit indices where they fit, and its one texture scaled down
 * (ffmpeg) — written as one self-contained .glb. The nodes, materials and the rest are kept as they are.
 *
 * Scenery is seen at tens or hundreds of metres (see public/models/README.md): what a capture spends on a cornice's last centimetre buys
 * nothing there.
 *
 *   node --import tsx scripts/models/simplify-gltf.ts <scene.gltf> <out.glb> [ratio=0.15] [textureSize=2048] [error=0.01]
 *
 * `error` is how far the simplified surface may stray, as a share of the model's size: what stops the simplification short of the ratio.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { MeshoptSimplifier } from "meshoptimizer"

interface Accessor { bufferView?: number, byteOffset?: number, componentType: number, count: number, type: string, min?: number[], max?: number[] }
interface BufferView { buffer: number, byteOffset?: number, byteLength: number, byteStride?: number, target?: number }

const [input, output, ratioArg, sizeArg, errorArg] = process.argv.slice(2)
if (!input || !output) throw new Error("usage: simplify-gltf.ts <scene.gltf> <out.glb> [ratio] [textureSize]")
const ratio = Number(ratioArg ?? 0.15)
const textureSize = Number(sizeArg ?? 2048)
const error = Number(errorArg ?? 0.01)
/** Whether the borders of each primitive are kept as they are, so that chunks of one capture still meet. A capture whose texture seams split
 * its mesh everywhere is all borders, and has to be simplified without: set LOCK_BORDER=0. */
const lockBorder = process.env.LOCK_BORDER !== "0"
const folder = dirname(input)
const gltf = JSON.parse(readFileSync(input, "utf8"))
const buffers: Buffer[] = gltf.buffers.map((buffer: { uri: string }) => readFileSync(join(folder, buffer.uri)))
const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

/** An accessor's values, as floats or as indices, packed. */
function read(index: number): Float32Array | Uint32Array {
  const accessor: Accessor = gltf.accessors[index]
  const view: BufferView = gltf.bufferViews[accessor.bufferView!]
  const components = COMPONENTS[accessor.type]
  const source = buffers[view.buffer]
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const size = accessor.componentType === 5126 || accessor.componentType === 5125 ? 4 : accessor.componentType === 5123 ? 2 : 1
  const stride = view.byteStride ?? components * size
  const out = accessor.componentType === 5126 ? new Float32Array(accessor.count * components) : new Uint32Array(accessor.count * components)
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < components; c++) {
      const at = start + i * stride + c * size
      out[i * components + c] = accessor.componentType === 5126 ? source.readFloatLE(at)
        : accessor.componentType === 5125 ? source.readUInt32LE(at) : accessor.componentType === 5123 ? source.readUInt16LE(at) : source.readUInt8(at)
    }
  }
  return out
}

await MeshoptSimplifier.ready
const chunks: Buffer[] = []
let length = 0
const views: BufferView[] = []
const accessors: Accessor[] = []
/** Appends data as a buffer view and an accessor of it, and returns the accessor's index. */
function append(data: Float32Array | Uint16Array | Uint32Array, type: string, componentType: number, target: number, bounds = false): number {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  const padding = (4 - (length % 4)) % 4
  if (padding) {
    chunks.push(Buffer.alloc(padding))
    length += padding
  }
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target })
  chunks.push(bytes)
  length += bytes.length
  const components = COMPONENTS[type]
  const accessor: Accessor = { bufferView: views.length - 1, componentType, count: data.length / components, type }
  if (bounds) {
    accessor.min = Array(components).fill(Infinity)
    accessor.max = Array(components).fill(-Infinity)
    for (let i = 0; i < data.length; i++) {
      accessor.min[i % components] = Math.min(accessor.min[i % components], data[i])
      accessor.max[i % components] = Math.max(accessor.max[i % components], data[i])
    }
  }
  accessors.push(accessor)
  return accessors.length - 1
}

let before = 0, after = 0
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) {
    const positions = read(primitive.attributes.POSITION) as Float32Array
    const indices = read(primitive.indices) as Uint32Array
    before += indices.length / 3
    const target = Math.floor(indices.length * ratio / 3) * 3
    const [simplified] = MeshoptSimplifier.simplify(indices, positions, 3, target, error, lockBorder ? ["LockBorder"] : [])
    // Only the vertices still used, in the order they are first used.
    const remap = new Map<number, number>()
    const kept: number[] = []
    const reindexed = new Uint32Array(simplified.length)
    simplified.forEach((vertex, i) => {
      let to = remap.get(vertex)
      if (to === undefined) {
        to = kept.length
        remap.set(vertex, to)
        kept.push(vertex)
      }
      reindexed[i] = to
    })
    after += reindexed.length / 3
    const attributes: Record<string, number> = {}
    for (const [name, index] of Object.entries(primitive.attributes) as [string, number][]) {
      const values = read(index) as Float32Array
      const components = COMPONENTS[gltf.accessors[index].type]
      const packed = new Float32Array(kept.length * components)
      kept.forEach((vertex, i) => packed.set(values.subarray(vertex * components, vertex * components + components), i * components))
      attributes[name] = append(packed, gltf.accessors[index].type, 5126, 34962, name === "POSITION")
    }
    primitive.attributes = attributes
    primitive.indices = kept.length < 65536 ? append(Uint16Array.from(reindexed), "SCALAR", 5123, 34963) : append(reindexed, "SCALAR", 5125, 34963)
  }
}

// The texture, scaled down and embedded.
const scratch = mkdtempSync(join(tmpdir(), "simplify-gltf-"))
gltf.images = gltf.images.map((image: { uri: string }) => {
  const scaled = join(scratch, "texture.jpg")
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(folder, image.uri), "-vf", `scale='min(${textureSize},iw)':-1`, "-q:v", "4", scaled])
  const bytes = readFileSync(scaled)
  const padding = (4 - (length % 4)) % 4
  if (padding) {
    chunks.push(Buffer.alloc(padding))
    length += padding
  }
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length })
  chunks.push(bytes)
  length += bytes.length
  return { bufferView: views.length - 1, mimeType: "image/jpeg" }
})

gltf.accessors = accessors
gltf.bufferViews = views
const bin = Buffer.concat([...chunks, Buffer.alloc((4 - (length % 4)) % 4)])
gltf.buffers = [{ byteLength: bin.length }]
const json = Buffer.from(JSON.stringify(gltf))
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)])
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8)
const chunkHeader = (size: number, type: number) => {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32LE(size, 0)
  buffer.writeUInt32LE(type, 4)
  return buffer
}
writeFileSync(output, Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(bin.length, 0x004e4942), bin]))
console.log(`${before} triangles → ${after}, ${(12 + 16 + jsonChunk.length + bin.length) / 1e6} MB → ${output}`)
