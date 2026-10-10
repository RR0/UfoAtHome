/**
 * Builds the stand-in model of the machine Renato Nicolaï saw at Trans-en-Provence on 8 January 1981,
 * and writes it to public/models/ufoathome-trans-en-provence-craft/.
 *
 * UFO@home does not design models (see public/models/README.md): it references and places them. No
 * published one follows the account rather than an illustrator, so this one is built by a script, from
 * figures anyone can check (GEPAN Technical Note 16, as translated by Velasco, JSE 4(1), 1990).
 *
 * - "Two plates upside down against each other" / "two lead weights turned over onto each other": a
 *   lower and an upper bowl joined at a flat ledge ("une nervure tout autour de sa circonférence",
 *   "une couronne métallique qui séparait les 2 poids"). Outside diameter 2.5 m and height 1.7 to 1.8 m
 *   (GEPAN, the witness reasoning from the 2.5 m retaining wall he saw it against), so a diameter to
 *   height ratio of 1.42; the ledge ("a thick ridge") is 23 cm proud of the hull on each side, ASSUMED
 *   ("at least 15 cm" in the account to the private group, which is the same order); seen from above it is
 *   what tells a saucer resting on its ledge from half a ball set on the ground.
 * - Under it, on take-off: four circles "of smaller diameter, arranged symmetrically", which he
 *   compares to masonry pails (a pail is about 28 cm across: 14 cm radius), and two round pieces
 *   "which could be reactors or feet" that stand 20 cm below the body. The feet's section, and where
 *   the six pieces stand on the underside, are ASSUMED: the four circles on the axes, the two feet
 *   between them, all on a circle of 0.45 m.
 * - The two concentric circles of the mark on the ground (2.20 m and 2.40 m, 10 cm apart) are the size
 *   of this machine's lower bowl and ledge, and are not drawn here: they are the ground's.
 * - Grey "comparable to zinc", "the colour of lead": no emission, a rough surface; the ledge "flat
 *   in colour, darker", and the four pods a little darker than the rest (the account).
 * - The hull is a node named "hull" (its upper bowl, its ledge and its lower bowl), which is what the
 *   shapes drawn from the account are measured against. The lower bowl is darker and matt than the upper
 *   one ("darker and more flat in the thick lateral region"): a bright one mirrored the pale ground it
 *   stood on and read as sunk into it.
 *
 * Run with: node --import tsx scripts/build-trans-en-provence-craft.ts
 */
import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial, Part } from "./GltfWriter.js"

/** The machine, in metres, resting on its two feet at y = 0. */
class TransEnProvenceCraft {
  static readonly FOOT_LENGTH_M = 0.2
  static readonly FOOT_RADIUS_M = 0.12
  static readonly POD_RADIUS_M = 0.14
  static readonly POD_PROUD_M = 0.03
  static readonly UNDERSIDE_RADIUS_M = 0.45

  /** The outline of the body, [radius, height] from the underside up the axis; 2.5 m across at the ledge, 1.8 m tall with the feet. */
  static readonly BODY: ReadonlyArray<[number, number]> = [
    [0, 0.2], [0.55, 0.2], [0.8, 0.32], [1.0, 0.7], [1.02, 0.8],
    [1.25, 0.82], [1.25, 0.9], [1.02, 0.92],
    [1.0, 1.05], [0.8, 1.4], [0.45, 1.7], [0, 1.8]
  ]

  readonly materials: GltfMaterial[] = [
    GltfWriter.material("hull", "#666a6f", 0.2, 0.55),
    // The ledge a little lighter than the bowls, so that from above it reads as a rim round the machine, not as its shadow.
    GltfWriter.material("ledge", "#8d9196", 0.25, 0.7),
    GltfWriter.material("underside", "#4f5358", 0.3, 0.8),
    // The lower bowl: darker and flatter than the upper (GEPAN: "darker and more flat in the thick lateral region"). Matt, so that
    // it does not mirror the pale ground it stands on, which made the machine look sunk into it.
    GltfWriter.material("lower", "#3b3e42", 0.1, 0.95)
  ]

  write(writer: GltfWriter): void {
    // The three parts of the body under one node, "hull", which is what the drawn outlines are measured against.
    const hull = writer.addGroup("hull")
    writer.addMesh({ name: "upper", geometry: this.lathe(TransEnProvenceCraft.BODY.slice(7)), material: 0 }, hull)
    writer.addMesh({ name: "ledge", geometry: this.lathe(TransEnProvenceCraft.BODY.slice(4, 8)), material: 1 }, hull)
    writer.addMesh({ name: "lower", geometry: this.lathe(TransEnProvenceCraft.BODY.slice(0, 5)), material: 3 }, hull)
    for (const part of this.underside()) writer.addMesh(part)
  }

  private lathe(points: ReadonlyArray<[number, number]>): BufferGeometry {
    const geometry = new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), 64)
    geometry.computeVertexNormals()
    return geometry
  }

  /** Four pods flush on the underside, two feet between them. */
  private underside(): Part[] {
    const parts: Part[] = []
    const ring = TransEnProvenceCraft.UNDERSIDE_RADIUS_M
    for (let index = 0; index < 4; index++) {
      const around = (index * Math.PI) / 2
      const pod = new CylinderGeometry(TransEnProvenceCraft.POD_RADIUS_M, TransEnProvenceCraft.POD_RADIUS_M, TransEnProvenceCraft.POD_PROUD_M * 2, 24)
      pod.translate(Math.cos(around) * ring, 0.2, Math.sin(around) * ring)
      pod.computeVertexNormals()
      parts.push({ name: `pod-${index + 1}`, geometry: pod, material: 2 })
    }
    for (let index = 0; index < 2; index++) {
      const around = Math.PI / 4 + index * Math.PI
      const foot = new CylinderGeometry(TransEnProvenceCraft.FOOT_RADIUS_M, TransEnProvenceCraft.FOOT_RADIUS_M, TransEnProvenceCraft.FOOT_LENGTH_M + 0.05, 20)
      foot.translate(Math.cos(around) * ring, (TransEnProvenceCraft.FOOT_LENGTH_M - 0.05) / 2 + 0.05, Math.sin(around) * ring)
      foot.computeVertexNormals()
      parts.push({ name: `foot-${index + 1}`, geometry: foot, material: 1 })
    }
    return parts
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-trans-en-provence-craft")
mkdirSync(directory, { recursive: true })
const craft = new TransEnProvenceCraft()
const writer = new GltfWriter(craft.materials)
craft.write(writer)
const file = path.join(directory, "craft.gltf")
const gltf = writer.toJSON("UFO@home scripts/build-trans-en-provence-craft.ts")
writeFileSync(file, JSON.stringify(gltf) + "\n")
console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
