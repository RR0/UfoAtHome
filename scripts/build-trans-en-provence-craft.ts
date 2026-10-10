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
 *   height ratio of 1.42; the ledge ("a thick ridge") is 10 cm proud of the hull on each side, ASSUMED
 *   ("at least 15 cm" in the account to the private group, which is the same order).
 * - Under it, on take-off: four circles "of smaller diameter, arranged symmetrically", which he
 *   compares to masonry pails (a pail is about 28 cm across: 14 cm radius), and two round pieces
 *   "which could be reactors or feet" that stand 20 cm below the body. The feet's section, and where
 *   the six pieces stand on the underside, are ASSUMED: the four circles on the axes, the two feet
 *   between them, all on a circle of 0.45 m.
 * - The two concentric circles of the mark on the ground (2.20 m and 2.40 m, 10 cm apart) are the size
 *   of this machine's lower bowl and ledge, and are not drawn here: they are the ground's.
 * - Grey "comparable to zinc", "the colour of lead": no emission, a rough surface; the ledge "flat
 *   in colour, darker", and the four pods a little darker than the rest (the account).
 * - The hull is a node named "hull", which is what the shapes drawn from the account are measured
 *   against.
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
    [0, 0.2], [0.7, 0.2], [0.95, 0.32], [1.15, 0.7], [1.15, 0.8],
    [1.25, 0.8], [1.25, 0.9], [1.15, 0.9],
    [1.1, 1.05], [0.85, 1.4], [0.5, 1.7], [0, 1.8]
  ]

  readonly materials: GltfMaterial[] = [
    GltfWriter.material("hull", "#7d8186", 0.35, 0.6),
    GltfWriter.material("ledge", "#5f6368", 0.25, 0.85),
    GltfWriter.material("underside", "#4f5358", 0.3, 0.8)
  ]

  write(writer: GltfWriter): void {
    writer.addMesh({ name: "hull", geometry: this.hull(), material: 0 })
    for (const part of this.underside()) writer.addMesh(part)
  }

  private hull(): BufferGeometry {
    const geometry = new LatheGeometry(TransEnProvenceCraft.BODY.map(([r, y]) => new Vector2(r, y)), 64)
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
