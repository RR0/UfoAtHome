/**
 * Builds the two stand-in models of the object Clarence Chiles and John Whitted met over
 * Montgomery on 24 July 1948, and writes them to public/models/ufoathome-chiles-whitted-craft/.
 *
 * Two, because the two men drew two different things. Both gave Project Sign a sketch (Blue Book,
 * report no. 14, case 5), and the whole interest of the case is that the captain and his first
 * officer, sitting a metre apart, did not draw the same craft: a model that averaged them would
 * erase the one fact the file most firmly holds. So each man's drawing is built as its own model,
 * and each recording places the one its own witness drew.
 *
 * What is shared: a fuselage about 30 m long — the length both accounts report — and, at the rear,
 * the flame Whitted annotated "ORANGE & RED FLAME 40' LONG" beside "100' LENGTH". The flame itself
 * is not in these files: it is stated by the recording (see BodyFlame), and comes out of the node
 * named "exhaust", which is turned so that it trails ASTERN rather than downwards.
 *
 * Chiles's craft ("chiles.gltf"): a slim cigar tapered at both ends, with no porthole at all, and
 * round the front the light area he annotated "cockpit windshield?". Its proportions are his drawing
 * read through witness-chiles.json's own angles: 9.388° by 0.992° broadside, which at the 30 m of
 * the account is 30 m by 3.17, and a windshield 3 m long at the nose. The cross ribs of his sketch
 * are not reproduced: this format draws shapes, not a surface finish.
 *
 * Whitted's craft ("whitted.gltf"): a distinctly thicker cylinder with blunt ends — 9.388° by
 * 1.691°, so 30 m by 5.40 — carrying two rows of three openings he annotated "windows with white
 * light", each 1.9 m across and 8.5 m apart, the rows 2.6 m one above the other, over an underside
 * he marked "black". He drew one side; the other is ASSUMED to match, as a thing seen from one
 * side always is.
 *
 * Both men describe a thing lit from within against a night sky, and what each model says about
 * that is only WHICH of its parts glow and in what colour: the windows pale, the hull the deep blue
 * the recordings themselves draw it in, the underside not at all. How BRIGHT they are is not in
 * here, because it is not a property of the shape: the recording states it (see
 * BodyAppearance.luminanceCdM2) and the scene's own photometry draws it, so the same model is a
 * lamp at 02:45 and would be nothing at noon. The figures here are therefore ratios, not candela:
 * the windows at one, the hull glow at a third of them.
 *
 * Run with: node --import tsx scripts/build-chiles-whitted-craft.ts
 */
import { BufferGeometry, CircleGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial, Part } from "./GltfWriter.js"

/** Both men's figures, metres: what their two drawings make of the 30 m the account reports. */
class Reported {
  static readonly LENGTH_M = 30
  static readonly CHILES_DIAMETER_M = 3.17
  static readonly WHITTED_DIAMETER_M = 5.4
  /** How far a lit patch stands off the surface it is laid on, so the two never fight for pixels. */
  static readonly LIFT_M = 0.03
}

/**
 * A patch of a body of revolution about the Z axis: a piece of its own surface, lifted clear of it,
 * to be worn as a lit window. `radiusAt` is the body's half-width at a station along Z.
 */
class SurfacePatch {
  constructor(private readonly radiusAt: (z: number) => number) {
  }

  /**
   * @param fromZ,toZ The station it spans, metres, the nose towards -Z.
   * @param aroundRad Where its middle is around the axis, from straight up.
   * @param spanRad How far round it reaches, in all.
   */
  build(fromZ: number, toZ: number, aroundRad: number, spanRad: number): BufferGeometry {
    const steps = 16
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= steps; i++) {
      const z = fromZ + ((toZ - fromZ) * i) / steps
      const radius = this.radiusAt(z) + Reported.LIFT_M
      for (let j = 0; j <= steps; j++) {
        const angle = aroundRad - spanRad / 2 + (spanRad * j) / steps
        // Straight up is +Y; the angle turns towards +X.
        const x = Math.sin(angle) * radius
        const y = Math.cos(angle) * radius
        positions.push(x, y, z)
        const length = Math.hypot(x, y) || 1
        normals.push(x / length, y / length, 0)
      }
    }
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const a = i * (steps + 1) + j
        const b = a + steps + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    geometry.setIndex(indices)
    return geometry
  }
}

/** Chiles's drawing: a slim cigar tapered at both ends, one light area at the nose, no porthole. */
class ChilesCraft {
  static readonly HALF_WIDTH_M = Reported.CHILES_DIAMETER_M / 2
  static readonly HALF_LENGTH_M = Reported.LENGTH_M / 2
  /** The light area he annotated "cockpit windshield?", drawn 3 m long at the nose. It goes right
   * round the nose rather than sitting on one side of it: he drew it from one side and said
   * nothing about the other, and a lit patch put on the top alone is invisible from an aeroplane
   * flying level beside it, which is the one place it has to be seen from. */
  static readonly WINDSHIELD_Z_M: [number, number] = [-14.4, -11.4]

  readonly materials: GltfMaterial[] = [
    { ...GltfWriter.material("hull", "#1a2340", 0.1, 0.45), emissiveFactor: GltfWriter.linear("#1c3f9c").map(c => c * 0.35) },
    { ...GltfWriter.material("windshield", "#fff6d0", 0, 0.3), emissiveFactor: GltfWriter.linear("#fff6d0").map(c => c * 0.9) }
  ]

  parts(): Part[] {
    const patch = new SurfacePatch(z => ChilesCraft.HALF_WIDTH_M * Math.sqrt(Math.max(1 - (z / ChilesCraft.HALF_LENGTH_M) ** 2, 0)))
    return [
      { name: "hull", geometry: this.hull(), material: 0 },
      { name: "windshield", geometry: patch.build(...ChilesCraft.WINDSHIELD_Z_M, 0, Math.PI * 2), material: 1 }
    ]
  }

  /** A sphere stretched into a prolate spheroid lying along Z: tapered at both ends by being one. */
  private hull(): BufferGeometry {
    const geometry = new SphereGeometry(1, 64, 32)
    geometry.scale(ChilesCraft.HALF_WIDTH_M, ChilesCraft.HALF_WIDTH_M, ChilesCraft.HALF_LENGTH_M)
    geometry.computeVertexNormals()
    return geometry
  }

  /** Where the flame leaves it: the tail. */
  get exhaust(): [number, number, number] {
    return [0, 0, ChilesCraft.HALF_LENGTH_M]
  }
}

/** Whitted's drawing: a thicker cylinder with blunt ends, two rows of three lit windows, and a
 * black underside. */
class WhittedCraft {
  static readonly RADIUS_M = Reported.WHITTED_DIAMETER_M / 2
  static readonly HALF_LENGTH_M = Reported.LENGTH_M / 2
  static readonly WINDOW_WIDTH_M = 1.9
  static readonly WINDOW_SPACING_M = 8.5
  /** How far apart the two rows are, one above the other, from his own drawing. */
  static readonly ROW_SPACING_M = 2.6

  readonly materials: GltfMaterial[] = [
    { ...GltfWriter.material("hull", "#1a2340", 0.1, 0.45), emissiveFactor: GltfWriter.linear("#1c3f9c").map(c => c * 0.35) },
    { ...GltfWriter.material("window", "#fff6d0", 0, 0.3), emissiveFactor: GltfWriter.linear("#fff6d0").map(c => c * 0.9) },
    // "Black", and nothing of the glow: what he wrote under the row of windows.
    GltfWriter.material("underside", "#0a0b0d", 0, 0.9)
  ]

  parts(): Part[] {
    return [
      { name: "hull", geometry: this.hull(), material: 0 },
      { name: "nose", geometry: this.cap(-WhittedCraft.HALF_LENGTH_M), material: 0 },
      { name: "tail", geometry: this.cap(WhittedCraft.HALF_LENGTH_M), material: 0 },
      { name: "underside", geometry: this.underside(), material: 2 },
      ...this.windows()
    ]
  }

  private hull(): BufferGeometry {
    const geometry = new CylinderGeometry(WhittedCraft.RADIUS_M, WhittedCraft.RADIUS_M, Reported.LENGTH_M, 48, 1, true)
    // A cylinder stands along +Y; this one lies along Z.
    geometry.rotateX(Math.PI / 2)
    geometry.computeVertexNormals()
    return geometry
  }

  /** One blunt end. */
  private cap(z: number): BufferGeometry {
    const geometry = new CircleGeometry(WhittedCraft.RADIUS_M, 48)
    geometry.rotateY(z > 0 ? 0 : Math.PI)
    geometry.translate(0, 0, z)
    geometry.computeVertexNormals()
    return geometry
  }

  /** The black he marked below the windows: a shell over the lower third of the hull. */
  private underside(): BufferGeometry {
    const patch = new SurfacePatch(() => WhittedCraft.RADIUS_M)
    return patch.build(-WhittedCraft.HALF_LENGTH_M + 0.01, WhittedCraft.HALF_LENGTH_M - 0.01, Math.PI, (150 * Math.PI) / 180)
  }

  /** Two rows of three, on each side. */
  private windows(): Part[] {
    const patch = new SurfacePatch(() => WhittedCraft.RADIUS_M)
    const half = WhittedCraft.WINDOW_WIDTH_M / 2
    const span = (WhittedCraft.WINDOW_WIDTH_M / WhittedCraft.RADIUS_M) * 0.5
    const parts: Part[] = []
    let index = 0
    for (const side of [1, -1]) {
      for (const row of [1, -1]) {
        // Where the row sits round the hull: its height above or below the axis, as an angle.
        const around = side * (Math.PI / 2 - row * Math.asin(Math.min(1, WhittedCraft.ROW_SPACING_M / 2 / WhittedCraft.RADIUS_M)))
        for (const station of [-1, 0, 1]) {
          const z = station * WhittedCraft.WINDOW_SPACING_M
          parts.push({ name: `window-${++index}`, geometry: patch.build(z - half, z + half, around, span), material: 1 })
        }
      }
    }
    return parts
  }

  get exhaust(): [number, number, number] {
    return [0, 0, WhittedCraft.HALF_LENGTH_M]
  }
}

/** Turns the flame from the model's own -Y onto its +Z: a quarter turn backwards about X. */
const ASTERN: [number, number, number, number] = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-chiles-whitted-craft")
mkdirSync(directory, { recursive: true })
for (const [name, craft] of [["chiles.gltf", new ChilesCraft()], ["whitted.gltf", new WhittedCraft()]] as [string, ChilesCraft | WhittedCraft][]) {
  const writer = new GltfWriter(craft.materials)
  for (const part of craft.parts()) writer.addMesh(part)
  writer.addNode("exhaust", craft.exhaust, ASTERN)
  const file = path.join(directory, name)
  const gltf = writer.toJSON("UFO@home scripts/build-chiles-whitted-craft.ts")
  writeFileSync(file, JSON.stringify(gltf) + "\n")
  console.log(`Wrote ${path.relative(root, file)}: ${GltfBounds.sizeOf(gltf).map(m => m.toFixed(2)).join(" × ")} m (x, y, z)`)
}
