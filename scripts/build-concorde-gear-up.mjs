// mgg8's Concorde G-BOAC (CC0) with its gear taken off, as one file. A model of an aircraft on the ground drawn in flight shows its wheels;
// they are separate parts of one material, picked here by where they stand.
// Usage: node scripts/build-concorde-gear-up.mjs <folder of scene.gltf> <out.glb>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const [dir, outFile] = process.argv.slice(2)
const g = JSON.parse(readFileSync(join(dir, 'scene.gltf'))), bin = readFileSync(join(dir, 'scene.bin'))
const COMPONENTS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, TYPES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
const view = i => { const a = g.accessors[i], v = g.bufferViews[a.bufferView], size = COMPONENTS[a.componentType] * TYPES[a.type]; return { a, offset: (v.byteOffset || 0) + (a.byteOffset || 0), size, stride: v.byteStride || size } }
const isGear = ({ min, max }) => {
  const x0 = Math.min(Math.abs(min[0]), Math.abs(max[0])), x1 = Math.max(Math.abs(min[0]), Math.abs(max[0]))
  const main = min[0] * max[0] > 0 && x0 >= 1.9 && x1 <= 4.7 && min[2] >= -8 && max[2] <= -4.6 && max[1] <= 4.11
  const nose = x1 <= 0.52 && min[2] >= 10.6 && max[2] <= 13.5 && min[1] < 3.3 && max[1] <= 3.96
  return main || nose
}
// The parts are told apart in the model's own frame, its meshes being stated in another one.
const multiply = (A, B) => { const r = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let w = 0; w < 4; w++) for (let k = 0; k < 4; k++) r[c * 4 + w] += A[k * 4 + w] * B[c * 4 + k]; return r }
const localOf = n => { if (n.matrix) return n.matrix; const t = n.translation ?? [0, 0, 0], [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], s = n.scale ?? [1, 1, 1]; return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1] }
const worldOfMesh = new Map(); const visit = (i, M) => { const n = g.nodes[i], W = multiply(M, localOf(n)); if (n.mesh !== undefined) worldOfMesh.set(n.mesh, W); (n.children ?? []).forEach(c => visit(c, W)) }
g.scenes[0].nodes.forEach(i => visit(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
const chunks = []; let length = 0
const push = (buffer, target) => { const pad = (4 - length % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); length += pad } g2.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: buffer.length, ...(target ? { target } : {}) }); chunks.push(buffer); length += buffer.length; return g2.bufferViews.length - 1 }
const g2 = { ...g, bufferViews: [], accessors: [], buffers: [] }
const addAccessor = (source, count, data, target, minmax) => { const { bufferView, ...rest } = source; g2.accessors.push({ ...rest, bufferView: push(data, target), byteOffset: 0, count, ...minmax }); return g2.accessors.length - 1 }
let removed = 0
g2.meshes = g.meshes.map((mesh, meshIndex) => ({ ...mesh, primitives: mesh.primitives.map(p => {
  const W = worldOfMesh.get(meshIndex)
  const inModel = q => [0, 1, 2].map(a => W[a] * q[0] + W[4 + a] * q[1] + W[8 + a] * q[2] + W[12 + a])
  const P = view(p.attributes.POSITION), I = view(p.indices), count = P.a.count, pos = i => [0, 1, 2].map(a => bin.readFloatLE(P.offset + i * P.stride + a * 4))
  const indices = Array.from({ length: I.a.count }, (_, i) => I.size === 4 ? bin.readUInt32LE(I.offset + i * 4) : bin.readUInt16LE(I.offset + i * 2))
  const parent = Array.from({ length: count }, (_, i) => i); const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] } return x }; const same = new Map()
  for (let i = 0; i < count; i++) { const key = pos(i).map(v => Math.round(v * 2000)).join(); if (same.has(key)) parent[find(i)] = find(same.get(key)); else same.set(key, i) }
  for (let i = 0; i < indices.length; i += 3) { parent[find(indices[i])] = find(indices[i + 1]); parent[find(indices[i])] = find(indices[i + 2]) }
  const boxes = new Map(); for (let i = 0; i < count; i++) { const r = find(i), q = inModel(pos(i)); const b = boxes.get(r) ?? { min: [...q], max: [...q] }; for (let a = 0; a < 3; a++) { b.min[a] = Math.min(b.min[a], q[a]); b.max[a] = Math.max(b.max[a], q[a]) } boxes.set(r, b) }
  const gear = g.materials[p.material].name === 'PaletteMaterial004' ? new Set([...boxes].filter(([, b]) => isGear(b)).map(([r]) => r)) : new Set()
  removed += gear.size
  const kept = [], map = new Int32Array(count).fill(-1); for (let i = 0; i < count; i++) if (!gear.has(find(i))) { map[i] = kept.length; kept.push(i) }
  const attributes = {}
  for (const [name, index] of Object.entries(p.attributes)) { const A = view(index), data = Buffer.alloc(kept.length * A.size); kept.forEach((v, k) => bin.copy(data, k * A.size, A.offset + v * A.stride, A.offset + v * A.stride + A.size))
    let minmax = {}; if (name === 'POSITION') { const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]; for (const v of kept) { const q = pos(v); for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], q[a]); max[a] = Math.max(max[a], q[a]) } } minmax = { min, max } } else if (A.a.min) minmax = { min: A.a.min, max: A.a.max }
    attributes[name] = addAccessor(A.a, kept.length, data, 34962, minmax) }
  const out = []; for (let i = 0; i < indices.length; i += 3) if (map[indices[i]] >= 0 && map[indices[i + 1]] >= 0 && map[indices[i + 2]] >= 0) out.push(map[indices[i]], map[indices[i + 1]], map[indices[i + 2]])
  const data = Buffer.alloc(out.length * 4); out.forEach((v, k) => data.writeUInt32LE(v, k * 4))
  const { min: _a, max: _b, ...source } = I.a
  return { ...p, attributes, indices: addAccessor({ ...source, componentType: 5125 }, out.length, data, 34963, { min: [out.reduce((a, b) => Math.min(a, b), Infinity)], max: [out.reduce((a, b) => Math.max(a, b), 0)] }) }
}) }))
g2.images = g.images.map(image => { const file = readFileSync(join(dir, image.uri)); const { uri, ...rest } = image; return { ...rest, mimeType: uri.endsWith('.png') ? 'image/png' : 'image/jpeg', bufferView: push(file) } })
const pad = (4 - length % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); length += pad }
g2.buffers = [{ byteLength: length }]
const json = Buffer.from(JSON.stringify(g2)); const jsonPad = Buffer.alloc((4 - json.length % 4) % 4, 0x20); const jsonLength = json.length + jsonPad.length
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonLength + 8 + length, 8); header.writeUInt32LE(jsonLength, 12); header.writeUInt32LE(0x4E4F534A, 16)
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(length, 0); binHeader.writeUInt32LE(0x004E4942, 4)
mkdirSync(dirname(outFile), { recursive: true }); writeFileSync(outFile, Buffer.concat([header, json, jsonPad, binHeader, ...chunks]))
console.log('parts removed', removed, 'bytes', 12 + 8 + jsonLength + 8 + length)
