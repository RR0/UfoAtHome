/**
 * Builds the balloons an interpretation can claim an account saw (see src/modules/interpretations/balloons), and writes them to
 * public/models/ufoathome-balloon-*\/balloon.gltf:
 *
 * - "latex": a latex balloon, round and a little pointed at its knot, the party balloon, the pilot and the weather balloon, a solar and a
 *   captive one alike (a body stretches it to the size it states, and colours it), with a small lamp under its knot ("light-lamp") that
 *   a pilot balloon carried up at night.
 * - "led": the same, glowing all over from the LED inside it (see LitFromWithin): its colour is the LED's.
 * - "foil": a round foil balloon, a polished pillow with its valve's tab at its foot.
 * - "stratospheric": a polyethylene balloon at float, open at its foot, wide at its shoulder and tapering to its base (the "natural
 *   shape" of a zero-pressure balloon).
 * - "hot-air": a sport hot-air balloon: an envelope of sixteen gores in two colours ("envelope", "envelope-stripe"), open at its mouth, its
 *   basket under it on four cables, its burner over the basket and the flame it throws up into the mouth ("flame"). The envelope glows as
 *   the flame lights it from inside, point by point (see LitFromWithin), while it fires.
 *
 * Each is in metres (a body stretches it to the size it states), its lowest point at y = 0, up +Y. The shapes are this project's, from
 * photographs and makers' drawings.
 *
 * Run with: node --import tsx scripts/build-balloons.ts
 */
import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial } from "./GltfWriter.js"

class BalloonModel {
  private readonly parts = new Map<string, BufferGeometry[]>()

  constructor(readonly materials: GltfMaterial[]) {
  }

  add(material: string, geometry: BufferGeometry): void {
    const list = this.parts.get(material) ?? []
    const indexed = geometry.index ? geometry : BalloonModel.indexed(geometry)
    if (indexed.getAttribute("uv")) indexed.deleteAttribute("uv")
    indexed.computeVertexNormals()
    list.push(indexed)
    this.parts.set(material, list)
  }

  /** The merged geometry of one material: what a light inside lights the mean of (see meanLight). */
  merged(material: string): BufferGeometry {
    return mergeGeometries(this.parts.get(material)!, false)!
  }

  /** Lights `material` from a point inside, `at`, as a point source lights a surface (see LitFromWithin). */
  litFrom(material: string, at: [number, number, number]): void {
    this.materials.find(m => m.name === material)!.extras = { litFromWithin: { at, mean: BalloonModel.meanLight(this.merged(material), at) } }
  }

  write(writer: GltfWriter): void {
    for (const [material, geometries] of this.parts) {
      writer.addMesh({ name: material, geometry: mergeGeometries(geometries, false)!, material: this.materials.findIndex(m => m.name === material) })
    }
  }

  private static indexed(geometry: BufferGeometry): BufferGeometry {
    const count = geometry.getAttribute("position").count
    geometry.setIndex(Array.from({ length: count }, (_, i) => i))
    return geometry
  }

  /** The mean over a surface of what a point source at `at` gives it, cos θ / d² (see LitFromWithinExtras.mean). */
  private static meanLight(geometry: BufferGeometry, at: [number, number, number]): number {
    const position = geometry.getAttribute("position"), index = geometry.index!
    let lit = 0, area = 0
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map(k => {
        const v = index.getX(i + k)
        return [position.getX(v), position.getY(v), position.getZ(v)]
      })
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
      const twice = Math.hypot(n[0], n[1], n[2])
      if (twice === 0) continue
      const centre = [(a[0] + b[0] + c[0]) / 3 - at[0], (a[1] + b[1] + c[1]) / 3 - at[1], (a[2] + b[2] + c[2]) / 3 - at[2]]
      const d2 = centre[0] ** 2 + centre[1] ** 2 + centre[2] ** 2
      const incidence = Math.abs(n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2]) / twice / Math.sqrt(d2)
      lit += Math.min(incidence / d2, 1e6) * twice / 2
      area += twice / 2
    }
    return lit / area
  }
}

/** A surface of revolution about Y through these (radius, height) points, from `phi` round by `length` radians. */
const lathe = (profile: [number, number][], segments: number, phi = 0, length = 2 * Math.PI): BufferGeometry =>
  new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), segments, phi, length)

/** A thin rod from `a` to `b`. */
const rod = (a: [number, number, number], b: [number, number, number], radius: number): BufferGeometry => {
  const from = new Vector3(...a), to = new Vector3(...b)
  const along = to.clone().sub(from)
  const geometry = new CylinderGeometry(radius, radius, along.length(), 6)
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), along.clone().normalize()))
  const middle = from.clone().add(to).multiplyScalar(0.5)
  return geometry.translate(middle.x, middle.y, middle.z)
}

/**
 * A latex balloon one metre wide: round, a little pointed towards its neck, its neck and its knot under it. Its bottom is the lamp's, a
 * fortieth of its width (see BalloonFlight.lightsOf).
 */
const LATEX_PROFILE: [number, number][] = (() => {
  const points: [number, number][] = [[0, 0.085], [0.028, 0.085], [0.03, 0.11]]
  for (let i = 1; i <= 40; i++) {
    const theta = Math.PI * i / 40
    // Pinched towards the neck: the lower half drawn in by the cube of its cosine.
    const r = 0.5 * Math.sin(theta) * (1 - 0.32 * Math.max(0, Math.cos(theta)) ** 3)
    const y = 0.62 - 0.51 * Math.cos(theta)
    if (r > 0.03 || i > 20) points.push([Math.max(r, 0), y])
  }
  return points
})()

function latex(model: BalloonModel, lamp: boolean): void {
  model.add("envelope", lathe(LATEX_PROFILE, 48))
  // The knot: a ring of rolled latex under its neck, as thick as it is dull, which neither its colour nor its light reaches.
  model.add("knot", new TorusGeometry(0.03, 0.012, 8, 20).rotateX(Math.PI / 2).translate(0, 0.075, 0))
  if (lamp) model.add("light-lamp", new SphereGeometry(0.025, 12, 8).translate(0, 0.025, 0))
  else model.add("knot", new CylinderGeometry(0.012, 0.012, 0.05, 8).translate(0, 0.04, 0))
}

function foil(model: BalloonModel): void {
  // A pillow of two discs of film welded at their rim: round, flat where it is widest, its seam a thin ridge.
  model.add("foil", new SphereGeometry(0.5, 48, 24).scale(1, 1, 0.27).translate(0, 0.54, 0))
  model.add("foil", new TorusGeometry(0.5, 0.006, 6, 64).translate(0, 0.54, 0))
  // The tab of its valve, white plastic, where it was filled.
  model.add("valve", new BoxGeometry(0.07, 0.06, 0.01).translate(0, 0.03, 0))
}

/** A foil pillow of this outline: two sheets welded at their rim, puffed to `thickness` in the middle, its middle at z = `z`. */
const pillow = (shape: Shape, thickness: number, z = 0): BufferGeometry => {
  const bevel = thickness / 2
  const geometry = new ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: true, bevelThickness: bevel, bevelSize: Math.min(0.03, bevel), bevelSegments: 6, curveSegments: 24 })
  return geometry.translate(0, 0, z - 0.001)
}

/** An ellipse as a shape, its middle at (x, y). */
const ellipse = (x: number, y: number, rx: number, ry: number): Shape => {
  const shape = new Shape()
  shape.absellipse(x, y, rx, ry, 0, 2 * Math.PI, false, 0)
  return shape
}

/** A rectangle with rounded corners, its middle at (x, y). */
const rounded = (x: number, y: number, w: number, h: number, r: number): Shape => {
  const shape = new Shape(), x0 = x - w / 2, y0 = y - h / 2
  shape.moveTo(x0 + r, y0)
  shape.lineTo(x0 + w - r, y0)
  shape.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r)
  shape.lineTo(x0 + w, y0 + h - r)
  shape.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h)
  shape.lineTo(x0 + r, y0 + h)
  shape.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r)
  shape.lineTo(x0, y0 + r)
  shape.quadraticCurveTo(x0, y0, x0 + r, y0)
  return shape
}

/** A five-pointed foil star half a metre from its middle to a point, its top point up, and its valve's tab at its foot. */
function foilStar(model: BalloonModel): void {
  const shape = new Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.25 : 0.105, a = Math.PI / 2 + i * Math.PI / 5
    const x = r * Math.cos(a), y = 0.25 + r * Math.sin(a)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  model.add("foil", pillow(shape, 0.1).translate(0, 0.03, 0))
  model.add("valve", new BoxGeometry(0.035, 0.04, 0.005).translate(0, 0.02, 0))
}

/** A foil heart half a metre across. */
function foilHeart(model: BalloonModel): void {
  const shape = new Shape()
  shape.moveTo(0, 0.02)
  shape.bezierCurveTo(-0.06, 0.1, -0.25, 0.2, -0.25, 0.33)
  shape.bezierCurveTo(-0.25, 0.45, -0.12, 0.5, 0, 0.4)
  shape.bezierCurveTo(0.12, 0.5, 0.25, 0.45, 0.25, 0.33)
  shape.bezierCurveTo(0.25, 0.2, 0.06, 0.1, 0, 0.02)
  model.add("foil", pillow(shape, 0.11).translate(0, 0.02, 0))
  model.add("valve", new BoxGeometry(0.035, 0.04, 0.005).translate(0, 0.02, 0))
}

/**
 * The figure of a child, a "super shape" foil balloon 0.9 m tall: a big head of hair round a face, a shirt, shorts, legs, shoes, the arms
 * wide and up, each a pillow of its own colour (the model's settings `hairColor`, `skinColor`, `envelopeColor` for the shirt,
 * `bottomColor`, `shoesColor`). A figure of no one in particular, of the proportions of such balloons (the "Dora" of Nancy, 2005).
 */
function foilFigure(model: BalloonModel): void {
  const d = 0.08
  // Its shoes, legs and shorts.
  for (const side of [-1, 1]) {
    model.add("foil-shoes", pillow(ellipse(side * 0.085, 0.06, 0.075, 0.05), d))
    model.add("foil-skin", pillow(rounded(side * 0.07, 0.17, 0.08, 0.16, 0.03), d * 0.8, -0.005))
    // Its arm, from the shoulder up and out, and its hand.
    const arm = rounded(0, 0, 0.26, 0.075, 0.035)
    model.add("foil-skin", pillow(arm, d * 0.8, -0.005).rotateZ(side * 0.4).translate(side * 0.225, 0.585, 0))
    model.add("foil-skin", pillow(ellipse(side * 0.345, 0.65, 0.05, 0.055), d))
  }
  model.add("foil-bottom", pillow(rounded(0, 0.3, 0.28, 0.15, 0.04), d))
  model.add("foil-top", pillow(rounded(0, 0.46, 0.33, 0.22, 0.06), d))
  // Its head: the hair behind, the face in front of it.
  model.add("foil-hair", pillow(rounded(0, 0.73, 0.42, 0.33, 0.14), d * 1.2, -0.01))
  model.add("foil-skin", pillow(ellipse(0, 0.68, 0.13, 0.12), d * 0.9, 0.012))
  model.add("valve", new BoxGeometry(0.035, 0.04, 0.005).translate(0, 0.02, -0.03))
}

/**
 * A prank balloon: a bag 0.6 m across and a metre tall, open at its mouth, held open by a cross of straws on which up to nine flames burn
 * (`light-flame-1` in the middle, the others round it, so that two, four or eight lit stand evenly), each a ball a fiftieth of its width
 * (see BalloonFlight.lightsOf). The bag ("envelope") glows by their light from inside (see LitFromWithin).
 */
const PRANK_FLAMES: [number, number, number][] = [[0, 0.13, 0], ...[0, 180, 90, 270, 45, 225, 135, 315].map(a => {
  const r = a * Math.PI / 180
  return [Math.round(0.15 * Math.sin(r) * 1e4) / 1e4, 0.13, Math.round(-0.15 * Math.cos(r) * 1e4) / 1e4] as [number, number, number]
})]

function prank(model: BalloonModel): void {
  const profile: [number, number][] = [[0.2, 0.12], [0.26, 0.25], [0.295, 0.45], [0.3, 0.65], [0.28, 0.82], [0.22, 0.94], [0.12, 1.0], [0, 1.02]]
  model.add("envelope", lathe(profile, 40))
  // The cross of straws the flames stand on.
  model.add("frame", new BoxGeometry(0.4, 0.008, 0.008).translate(0, 0.12, 0))
  model.add("frame", new BoxGeometry(0.008, 0.008, 0.4).translate(0, 0.12, 0))
  PRANK_FLAMES.forEach((at, i) => model.add(`light-flame-${i + 1}`, new SphereGeometry(0.012, 10, 8).scale(1, 1.6, 1).translate(...at)))
}

function stratospheric(model: BalloonModel): void {
  // The natural shape at float, one metre wide: from its foot, where the flight train hangs, out to its shoulder and round over its crown.
  const profile: [number, number][] = [[0.006, 0], [0.07, 0.08], [0.17, 0.2], [0.28, 0.34], [0.38, 0.47], [0.45, 0.58], [0.495, 0.68],
    [0.5, 0.73], [0.48, 0.79], [0.42, 0.84], [0.3, 0.88], [0.15, 0.9], [0, 0.905]]
  model.add("envelope", lathe(profile, 64))
  // The fitting at its crown, and the tapes that run up its gores: ridges seen in the Sun.
  model.add("fitting", new CylinderGeometry(0.03, 0.03, 0.01, 16).translate(0, 0.905, 0))
}

/** The hot-air balloon's envelope, from its mouth to its crown, metres: a Cameron Z-90's 16.5 m across, 24 m from the basket's floor. */
const HOT_AIR_PROFILE: [number, number][] = [[2.0, 5.0], [3.5, 7.0], [5.6, 9.5], [7.4, 12.5], [8.25, 15.5], [8.0, 18.5], [6.9, 21.0],
  [4.8, 23.0], [2.2, 23.9], [0, 24.1]]
/** Where the flame burns, which lights the envelope from inside. */
const FLAME_AT: [number, number, number] = [0, 4.2, 0]

function hotAir(model: BalloonModel): void {
  const gores = 16
  for (let i = 0; i < gores; i++) {
    model.add(i % 2 === 0 ? "envelope" : "envelope-stripe", lathe(HOT_AIR_PROFILE, 4, 2 * Math.PI * i / gores, 2 * Math.PI / gores))
  }
  // The basket, its rim, and the four cables from its corners up to the mouth.
  model.add("wicker", new BoxGeometry(1.4, 1.1, 1.1).translate(0, 0.55, 0))
  model.add("frame", new BoxGeometry(1.46, 0.08, 1.16).translate(0, 1.1, 0))
  const corners: [number, number][] = [[-0.7, -0.55], [0.7, -0.55], [0.7, 0.55], [-0.7, 0.55]]
  for (const [x, z] of corners) {
    const r = Math.hypot(x, z)
    model.add("frame", rod([x, 1.1, z], [x / r * 2.0, 5.0, z / r * 2.0], 0.015))
    // The burner's frame stands on rods from the basket's corners.
    model.add("frame", rod([x * 0.9, 1.1, z * 0.9], [x * 0.35, 2.9, z * 0.35], 0.02))
  }
  model.add("frame", new BoxGeometry(0.8, 0.25, 0.8).translate(0, 3.0, 0))
  // The flame it throws up into the mouth, two metres long.
  model.add("flame", new ConeGeometry(0.28, 2.0, 16).translate(0, 4.2, 0))
}

const here = path.dirname(fileURLToPath(import.meta.url))
const glowing = (css: string) => ({ emissiveFactor: GltfWriter.linear(css) })
const MODELS: { id: string, build: (model: BalloonModel) => void, materials: GltfMaterial[], whole?: boolean, lit?: [string[], [number, number, number]] }[] = [
  {
    id: "latex", build: model => latex(model, true),
    materials: [GltfWriter.material("envelope", "#ffffff", 0, 0.35), GltfWriter.material("knot", "#d8d0c4", 0, 0.6),
      GltfWriter.material("light-lamp", "#ffffff", 0, 0.4, glowing("#ffffff"))]
  },
  {
    id: "led", build: model => latex(model, false), whole: true, lit: [["envelope"], [0, 0.6, 0]],
    materials: [GltfWriter.material("envelope", "#ffffff", 0, 0.5, { ...glowing("#ffffff"), doubleSided: true }), GltfWriter.material("knot", "#d8d0c4", 0, 0.6)]
  },
  { id: "foil", build: foil, materials: [GltfWriter.material("foil", "#ffffff", 1, 0.12), GltfWriter.material("valve", "#f2f2f2", 0, 0.5)] },
  { id: "foil-star", build: foilStar, materials: [GltfWriter.material("foil", "#ffffff", 1, 0.12), GltfWriter.material("valve", "#f2f2f2", 0, 0.5)] },
  { id: "foil-heart", build: foilHeart, materials: [GltfWriter.material("foil", "#ffffff", 1, 0.12), GltfWriter.material("valve", "#f2f2f2", 0, 0.5)] },
  {
    id: "foil-figure", build: foilFigure,
    materials: ["hair", "skin", "top", "bottom", "shoes"].map(part => GltfWriter.material(`foil-${part}`, "#ffffff", 0.6, 0.25)).concat(GltfWriter.material("valve", "#f2f2f2", 0, 0.5))
  },
  {
    id: "prank", build: prank, lit: [["envelope"], [0, 0.2, 0]],
    materials: [
      GltfWriter.material("envelope", "#ffffff", 0, 0.5, { emissiveFactor: GltfWriter.linear("#ffb347"), doubleSided: true, alphaMode: "BLEND",
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 0.75], metallicFactor: 0, roughnessFactor: 0.5 } }),
      GltfWriter.material("frame", "#e8e2d0", 0, 0.8),
      ...Array.from({ length: 9 }, (_, i) => GltfWriter.material(`light-flame-${i + 1}`, "#ffffff", 0, 0.4, { emissiveFactor: [1, 1, 1] }))
    ]
  },
  {
    id: "stratospheric", build: stratospheric,
    materials: [GltfWriter.material("envelope", "#ffffff", 0, 0.3, { doubleSided: true }), GltfWriter.material("fitting", "#5a5f66", 0.7, 0.4)]
  },
  {
    id: "hot-air", build: hotAir, lit: [["envelope", "envelope-stripe"], FLAME_AT],
    materials: [
      GltfWriter.material("envelope", "#ffffff", 0, 0.6, { ...glowing("#ffb347"), doubleSided: true }),
      GltfWriter.material("envelope-stripe", "#ffffff", 0, 0.6, { ...glowing("#ffb347"), doubleSided: true }),
      GltfWriter.material("flame", "#000000", 0, 1, glowing("#ffd08a")),
      GltfWriter.material("wicker", "#8a6a3e", 0, 0.9),
      GltfWriter.material("frame", "#2a2a2a", 0.6, 0.5)
    ]
  }
]

for (const { id, build, materials, whole, lit } of MODELS) {
  const model = new BalloonModel(materials)
  build(model)
  if (lit) for (const material of lit[0]) model.litFrom(material, lit[1])
  const writer = new GltfWriter(model.materials)
  model.write(writer)
  const gltf = writer.toJSON("UFO@home scripts/build-balloons.ts") as { scenes: { extras?: object }[] }
  // An LED balloon glows all over: its glare is the whole balloon's (see BodySystem.GLOWS_WHOLE).
  if (whole) gltf.scenes[0].extras = { glowsWhole: true }
  const directory = path.join(here, "..", "public", "models", `ufoathome-balloon-${id}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "balloon.gltf"), JSON.stringify(gltf) + "\n")
  const [x, y, z] = GltfBounds.sizeOf(gltf)
  console.log(`${id}: ${x.toFixed(3)} × ${y.toFixed(3)} × ${z.toFixed(3)} m (x, y, z); height / width ${(y / x).toFixed(3)}, depth / width ${(z / x).toFixed(3)}`)
}
