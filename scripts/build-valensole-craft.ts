/**
 * Builds the stand-in model of the Valensole craft, as Maurice Masse described it to the gendarmes
 * on 1 July 1965 and afterwards, and writes it to public/models/ufoathome-valensole-craft/.
 *
 * UFO@home does not design models (see public/models/README.md): it references and places them.
 * This is the same lack of anything to reference that build-socorro-craft.ts answers — every
 * published model of this machine follows an illustrator rather than the account — and it is built
 * the same way, by a script, from figures anyone can check.
 *
 * - An ovoid "the size of a Renault Dauphine", 3.5 m across and 2.5 m high overall. The hull is
 *   drawn in observer-valensole.json at 2.223° by 1.139° from 90 m, which is 3.49 by 1.79 m, its
 *   centre 1.25 m above the ground: those are the numbers used here, so that the model and the
 *   drawing say one thing.
 * - A transparent cupola on top, through which he saw two seated beings. The recording draws it
 *   1.47 m across and 0.72 m high, overlapping the hull's crown: what stands proud of the hull is
 *   therefore a shallow cap, 0.32 m of it, and that is what is built. Its glass is ASSUMED to be
 *   glass, thin and clear, of index 1.5: he said he saw through it, not what it was made of.
 * - Six legs slanting outwards from under the hull, and a central pivot — the one that bored the
 *   hole found in the field. The pivot is 0.18 m across, the width of that hole; where the six feet
 *   stood was never surveyed, so they are set on a circle 3.2 m across, inside the hull's own width,
 *   which is ASSUMED.
 * - Two MOVEMENTS, as he told the departure: the central tube drawn up into the machine first
 *   ("pivot-retract", from the ground to inside the hull), then the six legs turning
 *   ("legs-turn", one full turn of the six together about the machine's upright axis) before it
 *   rose. That the legs turn as one set about that axis, and which way, is ASSUMED: he said they
 *   turned, not about what. The recording says when each happens and how far (see
 *   BodyKeyframe.motions); the model only says what moves.
 * - "A neutral matte colour, never described as luminous": no emission, a rough surface, the grey
 *   the recording itself draws it in.
 * - The hull is a node named "hull", which is what the oval he drew is measured against (see
 *   BodyJson.outlineNode) — not the legs, which he drew separately.
 *
 * Run with: node --import tsx scripts/build-valensole-craft.ts
 */
import { BufferGeometry, CircleGeometry, CylinderGeometry, Quaternion, SphereGeometry, Vector3 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial, Part } from "./GltfWriter.js"

/** The machine, in metres, standing on the ground at y = 0, its front towards -Z. */
class ValensoleCraft {
  static readonly HULL_RADIUS_M = 1.745
  static readonly HULL_HALF_HEIGHT_M = 0.895
  static readonly HULL_CENTRE_M = 1.25
  /** The cupola's own radius, half the 1.47 m the recording draws it at. */
  static readonly DOME_RADIUS_M = 0.736
  /** How far it stands above the hull it sits on: the drawn oval's top, 2.38 m, less the hull's
   * surface at that radius. */
  static readonly DOME_TOP_M = 2.38
  static readonly LEGS = 6
  static readonly FOOT_RADIUS_M = 1.6
  static readonly LEG_TOP_RADIUS_M = 0.85
  static readonly LEG_THICKNESS_M = 0.055
  static readonly PAD_RADIUS_M = 0.08
  static readonly PIVOT_RADIUS_M = 0.09

  readonly materials: GltfMaterial[] = [
    // Matte and neutral, the colour the recording draws it: nothing here reflects a landscape.
    GltfWriter.material("hull", "#b8b3a6", 0.05, 0.85),
    // Glass: seen through, so it is said to BE glass, in glTF's own terms — it transmits all it does
    // not reflect, at the index of window glass — and the renderer draws it as glass: a mirror of the
    // sky towards its rim, nearly clear where it faces the eye (see GlassMaterial).
    {
      ...GltfWriter.material("cupola", "#f4f7f8", 0, 0.02),
      doubleSided: true,
      extensions: { KHR_materials_transmission: { transmissionFactor: 1 }, KHR_materials_ior: { ior: 1.5 } }
    },
    GltfWriter.material("legs", "#8d8779", 0.1, 0.7)
  ]

  /** How far the pivot is drawn up: its own length, from the ground to the hull's underside. */
  static readonly PIVOT_LENGTH_M = ValensoleCraft.HULL_CENTRE_M - ValensoleCraft.HULL_HALF_HEIGHT_M

  /** Writes the machine: the hull and cupola, the pivot, and the legs under one node that turns. */
  write(writer: GltfWriter): void {
    writer.addMesh({ name: "hull", geometry: this.hull(), material: 0 })
    writer.addMesh({ name: "cupola", geometry: this.cupola(), material: 1 })
    const pivot = writer.addMesh({ name: "pivot", geometry: this.pivot(), material: 2 })
    const legs = writer.addGroup("legs")
    for (const part of this.legs()) writer.addMesh(part, legs)
    writer.addAnimation("pivot-retract", [
      { node: pivot, path: "translation", times: [0, 1], values: [0, 0, 0, 0, ValensoleCraft.PIVOT_LENGTH_M, 0] }
    ])
    // A quarter turn a sample, so that no step between two is ever the long way round.
    const turn = [0, 0.25, 0.5, 0.75, 1]
    writer.addAnimation("legs-turn", [
      { node: legs, path: "rotation", times: turn, values: turn.flatMap(share => [0, Math.sin(share * Math.PI), 0, Math.cos(share * Math.PI)]) }
    ])
  }

  private hull(): BufferGeometry {
    const geometry = new SphereGeometry(1, 64, 32)
    geometry.scale(ValensoleCraft.HULL_RADIUS_M, ValensoleCraft.HULL_HALF_HEIGHT_M, ValensoleCraft.HULL_RADIUS_M)
    geometry.translate(0, ValensoleCraft.HULL_CENTRE_M, 0)
    geometry.computeVertexNormals()
    return geometry
  }

  /** Where the hull's surface stands at a distance from its axis. */
  private hullTopAt(radiusM: number): number {
    const inside = 1 - (radiusM / ValensoleCraft.HULL_RADIUS_M) ** 2
    return ValensoleCraft.HULL_CENTRE_M + ValensoleCraft.HULL_HALF_HEIGHT_M * Math.sqrt(Math.max(inside, 0))
  }

  /** The upper half of a flattened ellipsoid, its base on the hull's crown. */
  private cupola(): BufferGeometry {
    const base = this.hullTopAt(ValensoleCraft.DOME_RADIUS_M)
    const geometry = new SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
    geometry.scale(ValensoleCraft.DOME_RADIUS_M, ValensoleCraft.DOME_TOP_M - base, ValensoleCraft.DOME_RADIUS_M)
    geometry.translate(0, base, 0)
    geometry.computeVertexNormals()
    return geometry
  }

  /** The pivot that bored the hole, from the hull's underside into the ground. */
  private pivot(): BufferGeometry {
    const underside = ValensoleCraft.HULL_CENTRE_M - ValensoleCraft.HULL_HALF_HEIGHT_M
    const geometry = new CylinderGeometry(ValensoleCraft.PIVOT_RADIUS_M, ValensoleCraft.PIVOT_RADIUS_M, underside, 16)
    geometry.translate(0, underside / 2, 0)
    geometry.computeVertexNormals()
    return geometry
  }

  /** Six legs slanting outwards from under the hull, each on the small pad its mark implies. */
  private legs(): Part[] {
    const parts: Part[] = []
    for (let index = 0; index < ValensoleCraft.LEGS; index++) {
      const around = (index / ValensoleCraft.LEGS) * Math.PI * 2
      const top = new Vector3(
        Math.cos(around) * ValensoleCraft.LEG_TOP_RADIUS_M,
        this.hullTopAt(ValensoleCraft.LEG_TOP_RADIUS_M) - 2 * ValensoleCraft.HULL_HALF_HEIGHT_M * Math.sqrt(Math.max(1 - (ValensoleCraft.LEG_TOP_RADIUS_M / ValensoleCraft.HULL_RADIUS_M) ** 2, 0)),
        Math.sin(around) * ValensoleCraft.LEG_TOP_RADIUS_M)
      const foot = new Vector3(Math.cos(around) * ValensoleCraft.FOOT_RADIUS_M, 0.01, Math.sin(around) * ValensoleCraft.FOOT_RADIUS_M)
      const leg = new CylinderGeometry(ValensoleCraft.LEG_THICKNESS_M, ValensoleCraft.LEG_THICKNESS_M, top.distanceTo(foot), 12)
      // A cylinder stands along +Y: turned onto the line from foot to top, then set between them.
      leg.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3().subVectors(top, foot).normalize()))
      leg.translate((top.x + foot.x) / 2, (top.y + foot.y) / 2, (top.z + foot.z) / 2)
      leg.computeVertexNormals()
      parts.push({ name: `leg-${index + 1}`, geometry: leg, material: 2 })
      const pad = new CircleGeometry(ValensoleCraft.PAD_RADIUS_M, 16)
      pad.rotateX(-Math.PI / 2)
      pad.translate(foot.x, 0.005, foot.z)
      pad.computeVertexNormals()
      parts.push({ name: `pad-${index + 1}`, geometry: pad, material: 2 })
    }
    return parts
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-valensole-craft")
mkdirSync(directory, { recursive: true })
const craft = new ValensoleCraft()
const writer = new GltfWriter(craft.materials)
craft.write(writer)
const file = path.join(directory, "craft.gltf")
const gltf = writer.toJSON("UFO@home scripts/build-valensole-craft.ts")
writeFileSync(file, JSON.stringify(gltf) + "\n")
console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
