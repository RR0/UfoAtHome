/**
 * Builds the two sky lanterns sold the world over, and writes them to public/models/ufoathome-sky-lantern-*\/:
 *
 * - "classic": round at its lit mouth, where the paper is glued round a bamboo or wire ring, and square at its flat top, where four
 *   panels meet: a lantern a metre tall with straight sides, its ring as wide as its square head.
 * - "balloon": the "heart", mushroom or chef's hat lantern, narrow at the ring and swelling to a wide, lobed top, dented between its lobes
 *   where the panels are glued.
 *
 * Both are seen from below as much as from the side: the mouth is open, the inside of the paper, lit straight by the flame, glows more
 * than its outside, and the flame burns on its fuel cell in the middle of the mouth, held there by two crossed wires.
 *
 * Their parts, each with its own material, named for what the recording says of them (see BodyKeyframe.lights): "paper", the outside, lit
 * by the flame point by point as a point source lights a surface (see LitFromWithin), brightest by the flame;
 * "paper-inside"; "flame"; "fuel-cell" and "frame", which do not glow. The paper's colour is a setting of the model (see the catalogue's
 * "paperColor"), and the scene says it glows all over (see BodySystem.GLOWS_WHOLE). Their proportions are what retailers list (0.9 to
 * 1.1 m tall, a ring of 0.3 to 0.4 m, a head of 0.5 to 0.7 m); a body stretches them to the size it states.
 *
 * Run with: node --import tsx scripts/build-sky-lanterns.ts
 */
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial } from "./GltfWriter.js"

type LanternShape = "classic" | "balloon"

/** A lantern, metres, its mouth at y = 0 and its top at y = HEIGHT_M. */
class SkyLanternModel {
  static readonly HEIGHT_M = 1
  /** The half-width of the classic lantern, ring and head alike. */
  private static readonly CLASSIC_M = 0.3
  private static readonly AROUND = 40
  private static readonly SIDE = 16
  private static readonly TOP = 8
  /** Where the flame burns, the light that lights the paper from within: on its fuel cell in the middle of the mouth. */
  static readonly FLAME_AT: [number, number, number] = [0, 0.075, 0]

  readonly materials: GltfMaterial[] = [
    // Rice paper: white, glowing with the flame's light through it (see SkyLantern.COMMON.color). Its colour is the model's setting, which
    // filters that light too.
    GltfWriter.material("paper", "#ffffff", 0, 0.95, { emissiveFactor: GltfWriter.linear("#ffa250") }),
    GltfWriter.material("paper-inside", "#ffffff", 0, 0.95, { emissiveFactor: GltfWriter.linear("#ffa250") }),
    GltfWriter.material("flame", "#000000", 0, 1, { emissiveFactor: [1, 0.78, 0.45] }),
    GltfWriter.material("fuel-cell", "#2a221a", 0, 0.9),
    GltfWriter.material("frame", "#4a3a28", 0, 0.8)
  ]

  /** The ring's radius: what the paper is glued round at the mouth. */
  private readonly ringM: number

  constructor(private readonly shape: LanternShape) {
    this.ringM = shape === "classic" ? SkyLanternModel.CLASSIC_M : 0.17
  }

  write(writer: GltfWriter): void {
    const rows = SkyLanternModel.SIDE + SkyLanternModel.TOP
    for (const [name, inside] of [["paper", false], ["paper-inside", true]] as const) {
      const geometry = this.envelope(inside, 0, rows)
      // The flame lights the paper as a point source does (see LitFromWithin): the mean of what it gives it, which the luminance the
      // recording states is the mean of.
      this.materials[this.materialOf(name)].extras = { litFromWithin: { at: SkyLanternModel.FLAME_AT, mean: SkyLanternModel.meanLight(geometry) } }
      writer.addMesh({ name, geometry, material: this.materialOf(name) })
    }
    const ring = new TorusGeometry(this.ringM, 0.004, 6, SkyLanternModel.AROUND)
    ring.rotateX(Math.PI / 2)
    writer.addMesh({ name: "frame", geometry: SkyLanternModel.merged([ring, ...this.wires()]), material: this.materialOf("frame") })
    const cell = new BoxGeometry(0.07, 0.025, 0.07)
    cell.translate(0, 0.0125, 0)
    writer.addMesh({ name: "fuel-cell", geometry: cell, material: this.materialOf("fuel-cell") })
    const flame = new SphereGeometry(1, 12, 10)
    flame.scale(0.022, 0.06, 0.022)
    flame.translate(...SkyLanternModel.FLAME_AT)
    writer.addMesh({ name: "flame", geometry: flame, material: this.materialOf("flame") })
  }

  /** The two wires crossing the mouth that hold the fuel cell in its middle. */
  private wires(): BufferGeometry[] {
    return [0, Math.PI / 2].map(angle => {
      const wire = new BoxGeometry(2 * this.ringM, 0.004, 0.004)
      wire.rotateY(angle)
      return wire
    })
  }

  /**
   * The paper: its side from the ring up, then its top in to the middle, a grid of points round it. Inside, the same paper a millimetre
   * in, its faces turned inwards: what the flame lights, seen through the mouth.
   */
  private envelope(inside: boolean, from: number, until: number): BufferGeometry {
    const around = SkyLanternModel.AROUND, rows = until - from
    const positions: number[] = []
    for (let row = from; row <= until; row++) {
      for (let column = 0; column <= around; column++) {
        const angle = 2 * Math.PI * column / around
        const [x, y, z] = row <= SkyLanternModel.SIDE
          ? this.side(row / SkyLanternModel.SIDE, angle)
          : this.top((row - SkyLanternModel.SIDE) / SkyLanternModel.TOP, angle)
        const shrink = inside ? 0.995 : 1
        positions.push(x * shrink, y - (inside ? 0.002 : 0), z * shrink)
      }
    }
    const index: number[] = []
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < around; column++) {
        const a = row * (around + 1) + column, b = a + around + 1
        // Counter-clockwise seen from outside, unless it is the inside.
        if (inside) index.push(a, a + 1, b, a + 1, b + 1, b)
        else index.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setIndex(index)
    geometry.computeVertexNormals()
    return geometry
  }

  /** A point of the side, `v` from the ring (0) to the shoulder (1). */
  private side(v: number, angle: number): [number, number, number] {
    const ring = this.ringM
    if (this.shape === "classic") {
      // From a circle at the ring to a square with rounded corners at the head (a superellipse whose exponent grows), as wide.
      const exponent = 2 + 6 * v * v
      const [x, z] = SkyLanternModel.superellipse(angle, ring, exponent)
      return [x, v * 0.97 * SkyLanternModel.HEIGHT_M, z]
    }
    // Narrow at the ring, swelling to the shoulder, its two lobes (across x) wider than its front and back.
    const swell = Math.sin(v * Math.PI / 2)
    const radius = ring + (0.31 - ring) * swell
    const lobes = 1 + 0.1 * swell * swell * Math.cos(2 * angle)
    return [Math.cos(angle) * radius * lobes, v * 0.72 * SkyLanternModel.HEIGHT_M, Math.sin(angle) * radius]
  }

  /** A point of the top, `u` from the shoulder (0) in to its middle (1). */
  private top(u: number, angle: number): [number, number, number] {
    const [sx, shoulderY, sz] = this.side(1, angle)
    const height = SkyLanternModel.HEIGHT_M
    if (this.shape === "classic") {
      // Flat, the edge rounded over the last three centimetres.
      const inward = 1 - u
      return [sx * inward, shoulderY + (height - shoulderY) * Math.sqrt(1 - inward * inward), sz * inward]
    }
    // A dome over each lobe, dented along the seam between them (x = 0).
    const inward = Math.cos(u * Math.PI / 2)
    const dome = Math.sin(u * Math.PI / 2)
    const seam = Math.exp(-(((Math.cos(angle) * inward) / 0.12) ** 2))
    const y = shoulderY + (height - shoulderY) * dome - 0.07 * dome * seam
    return [sx * inward, y, sz * inward]
  }

  /** The mean over a surface, by area, of what the flame gives each of its points: the cosine of its incidence over its distance squared. */
  private static meanLight(geometry: BufferGeometry): number {
    const position = geometry.getAttribute("position"), index = geometry.index!
    const [fx, fy, fz] = SkyLanternModel.FLAME_AT
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
      const centre = [(a[0] + b[0] + c[0]) / 3 - fx, (a[1] + b[1] + c[1]) / 3 - fy, (a[2] + b[2] + c[2]) / 3 - fz]
      const d2 = centre[0] ** 2 + centre[1] ** 2 + centre[2] ** 2
      const incidence = Math.abs(n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2]) / twice / Math.sqrt(d2)
      lit += Math.min(incidence / d2, 1e6) * twice / 2
      area += twice / 2
    }
    return lit / area
  }

  /** The point at `angle` of a superellipse of half-width `half`: a circle for an exponent of 2, a square as it grows. */
  private static superellipse(angle: number, half: number, exponent: number): [number, number] {
    const c = Math.cos(angle), s = Math.sin(angle)
    return [half * Math.sign(c) * Math.abs(c) ** (2 / exponent), half * Math.sign(s) * Math.abs(s) ** (2 / exponent)]
  }

  /** Geometries of one material in one, each indexed. */
  private static merged(geometries: BufferGeometry[]): BufferGeometry {
    const positions: number[] = [], normals: number[] = [], index: number[] = []
    for (const geometry of geometries) {
      const offset = positions.length / 3
      positions.push(...geometry.getAttribute("position").array)
      normals.push(...geometry.getAttribute("normal").array)
      index.push(...Array.from(geometry.index!.array, i => i + offset))
    }
    const merged = new BufferGeometry()
    merged.setAttribute("position", new Float32BufferAttribute(positions, 3))
    merged.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    merged.setIndex(index)
    return merged
  }

  private materialOf(name: string): number {
    return this.materials.findIndex(material => material.name === name)
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
for (const shape of ["classic", "balloon"] as const) {
  const directory = path.join(root, "public", "models", `ufoathome-sky-lantern-${shape}`)
  mkdirSync(directory, { recursive: true })
  const lantern = new SkyLanternModel(shape)
  const writer = new GltfWriter(lantern.materials)
  lantern.write(writer)
  const gltf = writer.toJSON("UFO@home scripts/build-sky-lanterns.ts") as { scenes: { extras?: object }[] }
  // It glows all over: its glare is the whole lantern's (see BodySystem.GLOWS_WHOLE).
  gltf.scenes[0].extras = { glowsWhole: true }
  const file = path.join(directory, "lantern.gltf")
  writeFileSync(file, JSON.stringify(gltf) + "\n")
  console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
}
