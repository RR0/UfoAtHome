/**
 * Writes public/models/ufoathome-arnold-craft/craft.gltf: one of the nine objects Kenneth Arnold saw on 1947-06-24, as he drew and said it.
 *
 * Its plan is his drawing kept by the FBI (FBIShape.jpg in rr0.org's dossier): a round front and a "convex triangle in the rear" (his
 * radio interview of 1947-06-25, "something like a pie plate that was cut in half with a sort of a convex triangle in the rear"), some
 * 1.26 times as long as it is wide; "They seemed longer than wide" (his letter to the Air Force, July 1947). Its side view is that letter's
 * and the "Side view" of the case's sketches: flat under, domed over, "their thickness was about 1/20th of their width".
 *
 * Made 1 m wide, the nose towards -Z, up +Y; a body stretches it to its own size (see BodySystem.fit). Two materials, "upper" and "under",
 * which the catalogue's colour settings paint.
 *
 *     npx tsx scripts/build-arnold-craft.ts
 */
import { BufferGeometry, Float32BufferAttribute } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfWriter } from "./GltfWriter.js"

/** Its length over its width, measured on the FBI drawing (145 by 115 pixels). */
const LENGTH = 1.26
/** "their thickness was about 1/20th of their width". */
const THICKNESS = 1 / 20
/** Where the round front gives way to the straight sides, and where those turn in to the rear point, along its length (0 nose, 1 tail),
 * and how far in the sides have come there: measured on the FBI drawing. */
const ARC_ENDS = 0.4, SIDES_END = 0.72, SIDES_IN = 0.05

class ArnoldCraft {
  /** Its outline, seen from above, as points (x across, z along, nose at -LENGTH/2), anticlockwise from the nose. */
  static outline(segments = 96): [number, number][] {
    const radius = 0.5
    const arcCentreZ = -LENGTH / 2 + ARC_ENDS * LENGTH
    const nose = -LENGTH / 2
    const points: [number, number][] = []
    // The rim as a closed path: the arc over the front, a side down to the turn, in to the rear point, and back up the other side.
    const path: [number, number][] = []
    const arc = segments / 2
    for (let i = 0; i <= arc; i++) {
      const a = Math.PI * i / arc
      path.push([radius * Math.cos(a), arcCentreZ - (arcCentreZ - nose) * Math.sin(a)])
    }
    const sideZ = -LENGTH / 2 + SIDES_END * LENGTH
    path.push([-(radius - SIDES_IN), sideZ], [0, LENGTH / 2], [radius - SIDES_IN, sideZ])
    // Resampled evenly along its length, so that the rings of the dome keep an even step.
    const lengths = path.map((p, i) => i === 0 ? 0 : Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]))
    const total = lengths.reduce((a, b) => a + b, 0) + Math.hypot(path[0][0] - path[path.length - 1][0], path[0][1] - path[path.length - 1][1])
    const closed = [...path, path[0]]
    let walked = 0, j = 1
    for (let k = 0; k < segments; k++) {
      const at = total * k / segments
      while (j < closed.length - 1 && walked + Math.hypot(closed[j][0] - closed[j - 1][0], closed[j][1] - closed[j - 1][1]) < at) {
        walked += Math.hypot(closed[j][0] - closed[j - 1][0], closed[j][1] - closed[j - 1][1])
        j++
      }
      const step = Math.hypot(closed[j][0] - closed[j - 1][0], closed[j][1] - closed[j - 1][1]) || 1
      const f = (at - walked) / step
      points.push([closed[j - 1][0] + (closed[j][0] - closed[j - 1][0]) * f, closed[j - 1][1] + (closed[j][1] - closed[j - 1][1]) * f])
    }
    return points
  }

  /** The dome: rings drawn in from the rim to its middle, as high as a sphere's cap is over its base at each. */
  static upper(outline: [number, number][], rings = 12): BufferGeometry {
    const centre = ArnoldCraft.centre(outline)
    const positions: number[] = []
    const ring = (f: number) => outline.map(([x, z]) => [centre[0] + (x - centre[0]) * f, THICKNESS * Math.sqrt(Math.max(0, 1 - f * f)), centre[1] + (z - centre[1]) * f])
    for (let r = 0; r < rings; r++) {
      const outer = ring(1 - r / rings), inner = ring(1 - (r + 1) / rings)
      for (let i = 0; i < outline.length; i++) {
        const n = (i + 1) % outline.length
        // Outward faces up: wound anticlockwise seen from above.
        positions.push(...outer[i], ...inner[n], ...outer[n], ...outer[i], ...inner[i], ...inner[n])
      }
    }
    return ArnoldCraft.geometry(positions)
  }

  /** The flat underside. */
  static under(outline: [number, number][]): BufferGeometry {
    const centre = ArnoldCraft.centre(outline)
    const positions: number[] = []
    for (let i = 0; i < outline.length; i++) {
      const n = (i + 1) % outline.length
      positions.push(centre[0], 0, centre[1], outline[i][0], 0, outline[i][1], outline[n][0], 0, outline[n][1])
    }
    return ArnoldCraft.geometry(positions)
  }

  private static centre(outline: [number, number][]): [number, number] {
    return [outline.reduce((s, p) => s + p[0], 0) / outline.length, outline.reduce((s, p) => s + p[1], 0) / outline.length]
  }

  private static geometry(positions: number[]): BufferGeometry {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setIndex(Array.from({ length: positions.length / 3 }, (_, i) => i))
    geometry.computeVertexNormals()
    return geometry
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
const writer = new GltfWriter([
  GltfWriter.material("upper", "#2a2c30", 0.6, 0.35, { doubleSided: true }),
  GltfWriter.material("under", "#2a2c30", 0.6, 0.35, { doubleSided: true })
])
const outline = ArnoldCraft.outline()
const root = writer.addGroup("craft")
writer.addMesh({ name: "upper", geometry: ArnoldCraft.upper(outline), material: 0 }, root)
writer.addMesh({ name: "under", geometry: ArnoldCraft.under(outline), material: 1 }, root)
const directory = path.join(here, "..", "public", "models", "ufoathome-arnold-craft")
mkdirSync(directory, { recursive: true })
writeFileSync(path.join(directory, "craft.gltf"), JSON.stringify(writer.toJSON("UFO@home scripts/build-arnold-craft.ts")))
console.log(`craft: 1 × ${THICKNESS} × ${LENGTH} m (width × height × length), ${outline.length} points round`)
