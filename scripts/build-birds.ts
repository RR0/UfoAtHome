/**
 * Builds the birds an interpretation can claim an account saw (see src/modules/interpretations/birds), and writes them to
 * public/models/ufoathome-bird-*\/bird.gltf: one model per build of bird, which the species of that build share, each stretched to its own
 * length and wingspan by the body that draws it and coloured by its model settings (see BirdSpecies).
 *
 * - "gull": long narrow wings bent at the wrist, pointed hand, short neck, square tail.
 * - "pelican": the neck folded back so that the head rests on the shoulders, a long bill with its pouch, long broad wings whose outer
 *   flight feathers stand apart as fingers, a short tail.
 * - "goose": the long neck held straight out, a heavy body, broad wings with a pointed hand.
 * - "duck": a short neck held out, a flat bill, short pointed wings beaten fast.
 * - "plover": a small wader, its pointed wings swept back, short bill.
 *
 * Each is in its flight pose, in metres for a typical bird of its build, the nose towards -Z, up +Y, its right wing towards +X (the axes of
 * BodySystem). Its wings are each two parts, the arm from the shoulder to the wrist and the hand from the wrist to the tip, hung from a
 * shoulder and a wrist that move, so that the hand folds back and down on the upstroke as a bird's does, and the body rises and falls
 * against the wings.
 *
 * One movement, "flap": one wingbeat over its one second, starting from the gliding pose, wings out and level but for a slight dihedral,
 * going down first. A recording plays it as BodyKeyframe.motions says: 3.2 beats a second is a "flap" that grows by 3.2 a second, and a bird
 * gliding is one whose "flap" stays at a whole number, where the wings are back in that pose (see BirdFlock).
 *
 * Its surfaces are named for what can be coloured on them (see the catalogue's bindings): "upper" (the back, the upper side of the wings and
 * of the tail), "under" (the belly, the under side), "tip-upper" and "tip-under" (the outer hand, black on a gull, the flight feathers of a
 * pelican), "head", "neck", "bill". The shapes are this project's, from field guides' descriptions of these birds' outlines in flight; the
 * motion is the textbook wingbeat (upstroke with the hand flexed, downstroke with the wing spread), not a measured one.
 *
 * Run with: node --import tsx scripts/build-birds.ts
 */
import { BufferGeometry, ConeGeometry, Float32BufferAttribute, SphereGeometry, Vector3, Quaternion, Euler } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { GltfWriter } from "./GltfWriter.js"
import type { GltfChannel, GltfMaterial } from "./GltfWriter.js"

/** How the outer end of the hand is shaped. */
type WingTip = "pointed" | "rounded" | "fingered"

/** What sets the outline of a build of bird, metres for a typical one, and how it beats its wings. */
interface BirdBuild {
  id: string
  name: string
  lengthM: number
  wingspanM: number
  /** Half the width of the body at its widest, and half its depth. */
  bodyHalfWidthM: number
  bodyHalfDepthM: number
  /** How far forward of the body's middle the shoulder is, as a share of the length. */
  shoulderForward: number
  /** The neck: how far it reaches out in front of the body, its radius; "folded" puts the head back on the shoulders. */
  neckM: number
  neckRadiusM: number
  neckFolded?: boolean
  headRadiusM: number
  billM: number
  /** How deep the bill is at its base, as a share of its length; a pelican's pouch hangs below it. */
  billDepth: number
  pouch?: boolean
  /** How long the tail is behind the body, and how wide at its end. */
  tailM: number
  tailWidthM: number
  /** The chord of the wing at the body, and the share of the wing (shoulder to tip) that is the arm. */
  rootChordM: number
  armShare: number
  /** How far back the hand's leading edge is swept at rest, degrees. */
  handSweepDeg: number
  tip: WingTip
  /** The share of the hand, from its tip, coloured as the tip. */
  tipShare: number
  /** How far the shoulder lifts and lowers the wing about its glide, degrees, and how far the hand folds on the upstroke. */
  strokeDeg: number
  foldDeg: number
  /** The dihedral of the gliding pose, degrees. */
  glideDeg: number
  colours: { upper: string, under: string, tip: string, head: string, neck: string, bill: string }
}

const BUILDS: BirdBuild[] = [
  {
    id: "gull", name: "Gull in flight (herring gull build)", lengthM: 0.6, wingspanM: 1.4, bodyHalfWidthM: 0.065, bodyHalfDepthM: 0.07,
    shoulderForward: 0.12, neckM: 0.06, neckRadiusM: 0.035, headRadiusM: 0.042, billM: 0.055, billDepth: 0.32, tailM: 0.15, tailWidthM: 0.13,
    rootChordM: 0.2, armShare: 0.45, handSweepDeg: 22, tip: "pointed", tipShare: 0.3, strokeDeg: 32, foldDeg: 42, glideDeg: 5,
    colours: { upper: "#a9b1b9", under: "#f3f2ec", tip: "#1b1c1f", head: "#f3f2ec", neck: "#f3f2ec", bill: "#e6bd35" }
  },
  {
    id: "pelican", name: "Pelican in flight (brown pelican build)", lengthM: 1.2, wingspanM: 2.1, bodyHalfWidthM: 0.13, bodyHalfDepthM: 0.13,
    shoulderForward: 0.05, neckM: 0.12, neckRadiusM: 0.06, neckFolded: true, headRadiusM: 0.06, billM: 0.32, billDepth: 0.2, pouch: true,
    tailM: 0.13, tailWidthM: 0.2, rootChordM: 0.34, armShare: 0.55, handSweepDeg: 8, tip: "fingered", tipShare: 0.45, strokeDeg: 26,
    foldDeg: 26, glideDeg: 2,
    colours: { upper: "#7d7468", under: "#4f4840", tip: "#3b3631", head: "#e9dfb5", neck: "#5a3a2a", bill: "#8d8778" }
  },
  {
    id: "goose", name: "Goose in flight (Canada goose build)", lengthM: 0.95, wingspanM: 1.6, bodyHalfWidthM: 0.12, bodyHalfDepthM: 0.11,
    shoulderForward: 0.1, neckM: 0.3, neckRadiusM: 0.032, headRadiusM: 0.048, billM: 0.055, billDepth: 0.45, tailM: 0.12, tailWidthM: 0.13,
    rootChordM: 0.26, armShare: 0.5, handSweepDeg: 14, tip: "pointed", tipShare: 0.4, strokeDeg: 30, foldDeg: 30, glideDeg: 3,
    colours: { upper: "#6b5d4f", under: "#cfc6b8", tip: "#3a332c", head: "#1d1c1b", neck: "#1d1c1b", bill: "#1d1c1b" }
  },
  {
    id: "duck", name: "Duck in flight (mallard build)", lengthM: 0.58, wingspanM: 0.9, bodyHalfWidthM: 0.085, bodyHalfDepthM: 0.075,
    shoulderForward: 0.1, neckM: 0.12, neckRadiusM: 0.03, headRadiusM: 0.04, billM: 0.055, billDepth: 0.3, tailM: 0.08, tailWidthM: 0.08,
    rootChordM: 0.15, armShare: 0.45, handSweepDeg: 20, tip: "pointed", tipShare: 0.3, strokeDeg: 34, foldDeg: 36, glideDeg: 4,
    colours: { upper: "#6d6457", under: "#b9b2a6", tip: "#4d463d", head: "#1f5a35", neck: "#ece9e1", bill: "#d9b23a" }
  },
  {
    id: "plover", name: "Plover in flight (golden plover build)", lengthM: 0.27, wingspanM: 0.68, bodyHalfWidthM: 0.035, bodyHalfDepthM: 0.035,
    shoulderForward: 0.12, neckM: 0.02, neckRadiusM: 0.02, headRadiusM: 0.022, billM: 0.022, billDepth: 0.35, tailM: 0.07, tailWidthM: 0.06,
    rootChordM: 0.085, armShare: 0.4, handSweepDeg: 28, tip: "pointed", tipShare: 0.35, strokeDeg: 36, foldDeg: 46, glideDeg: 4,
    colours: { upper: "#6f6650", under: "#e8e4da", tip: "#3b362c", head: "#6f6650", neck: "#e8e4da", bill: "#1d1c1b" }
  }
]

/** Surfaces from rings of points, each ring the same length: a strip between each two, optionally closed round. */
class Loft {
  static of(rings: Vector3[][], closed: boolean): BufferGeometry {
    const positions: number[] = []
    const indices: number[] = []
    const across = rings[0].length
    for (const ring of rings) for (const point of ring) positions.push(point.x, point.y, point.z)
    const columns = closed ? across : across - 1
    for (let r = 0; r < rings.length - 1; r++) {
      for (let c = 0; c < columns; c++) {
        const a = r * across + c
        const b = r * across + ((c + 1) % across)
        const d = (r + 1) * across + c
        const e = (r + 1) * across + ((c + 1) % across)
        indices.push(a, d, b, b, d, e)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  /** A geometry with every point's X turned over: the other wing. */
  static mirrored(geometry: BufferGeometry): BufferGeometry {
    const copy = geometry.clone()
    const position = copy.getAttribute("position")
    for (let i = 0; i < position.count; i++) position.setX(i, -position.getX(i))
    const index = copy.index!
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
    copy.computeVertexNormals()
    return copy
  }

  /** Only what three's glTF loader reads: positions, normals and indices. */
  static plain(geometry: BufferGeometry): BufferGeometry {
    const indexed = geometry.index ? geometry : geometry
    if (!indexed.index) {
      const count = indexed.getAttribute("position").count
      indexed.setIndex([...Array(count).keys()])
    }
    for (const name of Object.keys(indexed.attributes)) if (name !== "position" && name !== "normal") indexed.deleteAttribute(name)
    return indexed
  }
}

/** One station of a wing across its span: where its leading edge is and how long its chord, in the frame of the joint it hangs from. */
interface Station {
  leading: Vector3
  chordM: number
}

/**
 * The meshes of one node, merged by material as they are added: every mesh is a drawing of its own for every bird and every pass, and a
 * flock of eighty birds of twenty-seven meshes each cost more than the rest of the scene.
 */
class NodeMeshes {
  private readonly byMaterial = new Map<number, { name: string, geometries: BufferGeometry[] }>()

  add(name: string, geometry: BufferGeometry, material: number): void {
    const entry = this.byMaterial.get(material)
    if (entry) entry.geometries.push(Loft.plain(geometry))
    else this.byMaterial.set(material, { name, geometries: [Loft.plain(geometry)] })
  }

  write(writer: GltfWriter, node: number, nameOf: (material: number) => string): void {
    for (const [material, { geometries }] of this.byMaterial) {
      const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries)!
      writer.addMesh({ name: nameOf(material), geometry, material }, node)
    }
  }
}

class BirdModel {
  private readonly materials: GltfMaterial[]
  private static readonly MATERIALS = ["upper", "under", "tip-upper", "tip-under", "head", "neck", "bill"] as const

  constructor(private readonly build: BirdBuild) {
    const colour = (name: typeof BirdModel.MATERIALS[number]) => {
      switch (name) {
        case "upper": return build.colours.upper
        case "under": return build.colours.under
        case "tip-upper": case "tip-under": return build.colours.tip
        case "head": return build.colours.head
        case "neck": return build.colours.neck
        case "bill": return build.colours.bill
      }
    }
    // Feathers are matt; the wings are thin sheets, seen from above and from below.
    this.materials = BirdModel.MATERIALS.map(name => GltfWriter.material(name, colour(name), 0, 0.9, { doubleSided: true }))
  }

  private material(name: typeof BirdModel.MATERIALS[number]): number {
    return BirdModel.MATERIALS.indexOf(name)
  }

  /** Where the body is at `z` (nose at -L/2): its half width and half depth, a spindle that is widest a little forward of its middle. */
  private bodyAt(z: number): { halfWidth: number, halfDepth: number, centreY: number } {
    const { lengthM, bodyHalfWidthM, bodyHalfDepthM, neckM, tailM } = this.build
    const front = -lengthM / 2 + neckM + this.build.headRadiusM
    const back = lengthM / 2 - tailM * 0.85
    const along = (z - front) / (back - front)
    const shape = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, along)) ** 0.8))
    return { halfWidth: bodyHalfWidthM * shape, halfDepth: bodyHalfDepthM * shape, centreY: 0 }
  }

  write(target: GltfWriter): { shoulders: number[], wrists: number[], root: number } {
    const { lengthM } = this.build
    const pending = new Map<number, NodeMeshes>()
    // Meshes are gathered per node and merged by material (see NodeMeshes), then written once the bird is whole.
    const writer = {
      addGroup: (name: string, translation?: [number, number, number], parent?: number) => target.addGroup(name, translation, parent),
      addMesh: (part: { name: string, geometry: BufferGeometry, material: number }, parent?: number) => {
        const node = parent!
        let meshes = pending.get(node)
        if (!meshes) pending.set(node, meshes = new NodeMeshes())
        meshes.add(part.name, part.geometry, part.material)
      }
    }
    const root = writer.addGroup("bird")
    this.writeBody(writer as unknown as GltfWriter, root)
    this.writeHead(writer as unknown as GltfWriter, root)
    this.writeTail(writer as unknown as GltfWriter, root)
    const shoulderZ = -lengthM * this.build.shoulderForward
    const { halfWidth, halfDepth } = this.bodyAt(shoulderZ)
    const shoulders: number[] = []
    const wrists: number[] = []
    for (const side of [1, -1]) {
      const shoulder = writer.addGroup(side > 0 ? "shoulder-right" : "shoulder-left", [side * halfWidth * 0.8, halfDepth * 0.45, shoulderZ], root)
      const [arm, hand, wristAt] = this.wing(halfWidth * 0.8)
      for (const [name, geometry] of arm) writer.addMesh({ name, geometry: side > 0 ? geometry : Loft.mirrored(geometry), material: this.material(name) }, shoulder)
      const wrist = writer.addGroup(side > 0 ? "wrist-right" : "wrist-left", [side * wristAt.x, wristAt.y, wristAt.z], shoulder)
      for (const [name, geometry] of hand) writer.addMesh({ name, geometry: side > 0 ? geometry : Loft.mirrored(geometry), material: this.material(name) }, wrist)
      shoulders.push(shoulder)
      wrists.push(wrist)
    }
    for (const [node, meshes] of pending) meshes.write(target, node, material => BirdModel.MATERIALS[material])
    return { shoulders, wrists, root }
  }

  /** The body and the neck, split along their sides into the back ("upper") and the belly ("under"). */
  private writeBody(writer: GltfWriter, root: number): void {
    const { lengthM, neckM, neckRadiusM, headRadiusM, neckFolded } = this.build
    const around = 12
    const rows = 22
    const nose = -lengthM / 2 + (neckFolded ? 0 : neckM) + headRadiusM
    const tail = lengthM / 2 - this.build.tailM * 0.6
    const rings: { z: number, halfWidth: number, halfDepth: number, y: number }[] = []
    for (let r = 0; r <= rows; r++) {
      const z = nose + (tail - nose) * (r / rows)
      const body = this.bodyAt(z)
      // The neck: as thick as it is, wherever the body is thinner.
      const neckWeight = Math.max(0, 1 - (z - nose) / Math.max(neckM * 1.6, 0.02))
      const halfWidth = Math.max(body.halfWidth, neckRadiusM * neckWeight, 0.002)
      const halfDepth = Math.max(body.halfDepth, neckRadiusM * neckWeight, 0.002)
      rings.push({ z, halfWidth, halfDepth, y: neckWeight * this.build.bodyHalfDepthM * (neckFolded ? 0.6 : 0.15) })
    }
    const half = (upper: boolean) => rings.map(ring => {
      const points: Vector3[] = []
      for (let a = 0; a <= around; a++) {
        const angle = Math.PI * (a / around) * (upper ? 1 : -1)
        points.push(new Vector3(Math.cos(angle) * ring.halfWidth, ring.y + Math.sin(angle) * ring.halfDepth, ring.z))
      }
      return points
    })
    writer.addMesh({ name: "upper-body", geometry: Loft.of(half(true), false), material: this.material("upper") }, root)
    writer.addMesh({ name: "under-body", geometry: Loft.of(half(false), false), material: this.material("under") }, root)
    if (!neckFolded && neckM > 0.05) {
      // A long neck held out shows its own colour: a goose's black stocking, a mallard's white collar below its green head.
      const neckRings: Vector3[][] = []
      for (let r = 0; r <= 8; r++) {
        const z = -lengthM / 2 + headRadiusM + neckM * 1.25 * (r / 8)
        const radius = neckRadiusM * (1.02 + 0.25 * (r / 8))
        const ring: Vector3[] = []
        for (let a = 0; a < around; a++) {
          const angle = 2 * Math.PI * (a / around)
          ring.push(new Vector3(Math.cos(angle) * radius, this.build.bodyHalfDepthM * 0.15 * (1 - r / 8) + Math.sin(angle) * radius, z))
        }
        neckRings.push(ring)
      }
      writer.addMesh({ name: "neck", geometry: Loft.of(neckRings, true), material: this.material("neck") }, root)
    }
  }

  private writeHead(writer: GltfWriter, root: number): void {
    const { lengthM, neckM, headRadiusM, neckFolded, billM, billDepth, pouch, bodyHalfDepthM } = this.build
    const headZ = -lengthM / 2 + headRadiusM + (neckFolded ? billM * 0.62 : 0)
    const headY = neckFolded ? bodyHalfDepthM * 0.75 : bodyHalfDepthM * 0.15
    const headZOnNeck = neckFolded ? headZ : -lengthM / 2 + headRadiusM
    const head = Loft.plain(new SphereGeometry(headRadiusM, 14, 10))
    head.scale(0.9, 0.9, 1.25)
    head.translate(0, headY, headZOnNeck)
    writer.addMesh({ name: "head", geometry: head, material: this.material("head") }, root)
    // The bill points forward from the front of the head: a cone along -Z, flattened for a duck's, deep for a goose's.
    const bill = Loft.plain(new ConeGeometry(billM * billDepth * 0.5, billM, 10, 1))
    bill.rotateX(-Math.PI / 2)
    bill.scale(pouch ? 0.8 : 1.1, pouch ? 0.6 : 0.85, 1)
    bill.translate(0, headY - headRadiusM * 0.15, headZOnNeck - headRadiusM * 1.05 - billM / 2 + billM * 0.08)
    writer.addMesh({ name: "bill", geometry: bill, material: this.material("bill") }, root)
    if (pouch) {
      // The pouch: a deep, narrow sack under the length of the bill.
      const sack = Loft.plain(new SphereGeometry(1, 12, 8))
      sack.scale(billM * 0.08, billM * 0.1, billM * 0.42)
      sack.translate(0, headY - headRadiusM * 0.15 - billM * 0.09, headZOnNeck - headRadiusM - billM * 0.5)
      writer.addMesh({ name: "bill-pouch", geometry: sack, material: this.material("bill") }, root)
    }
  }

  /** The tail: a fan, flat, as wide at its end as the build says, its two faces "upper" and "under". */
  private writeTail(writer: GltfWriter, root: number): void {
    const { lengthM, tailM, tailWidthM, bodyHalfWidthM } = this.build
    const startZ = lengthM / 2 - tailM * 1.1
    const rows: Vector3[][] = []
    for (let r = 0; r <= 4; r++) {
      const share = r / 4
      const halfWidth = bodyHalfWidthM * 0.5 + (tailWidthM / 2 - bodyHalfWidthM * 0.5) * share
      const z = startZ + tailM * 1.1 * share
      const row: Vector3[] = []
      for (let c = 0; c <= 6; c++) row.push(new Vector3(-halfWidth + 2 * halfWidth * (c / 6), 0.004 * (1 - share), z))
      rows.push(row)
    }
    writer.addMesh({ name: "upper-tail", geometry: Loft.of(rows, false), material: this.material("upper") }, root)
    const under = rows.map(row => row.map(point => point.clone().setY(point.y - 0.003)))
    writer.addMesh({ name: "under-tail", geometry: Loft.of(under, false), material: this.material("under") }, root)
  }

  /**
   * One wing, the right one: its arm in the shoulder's frame, its hand in the wrist's, and where the wrist is from the shoulder. A thin
   * cambered sheet with an upper and an under face, thickest a third of the way back from its leading edge.
   */
  private wing(rootX: number): [[typeof BirdModel.MATERIALS[number], BufferGeometry][], [typeof BirdModel.MATERIALS[number], BufferGeometry][], Vector3] {
    const { wingspanM, rootChordM, armShare, handSweepDeg, tip, tipShare } = this.build
    const reach = wingspanM / 2 - rootX
    const armM = reach * armShare
    const handM = reach - armM
    // The arm: from the body to the wrist, its chord a little narrower at the wrist, its leading edge straight across.
    const arm: Station[] = []
    for (let s = 0; s <= 6; s++) {
      const x = armM * (s / 6)
      arm.push({ leading: new Vector3(x, 0, -rootChordM * 0.3), chordM: rootChordM * (1 - 0.12 * (s / 6)) })
    }
    const wristChord = rootChordM * 0.88
    // The hand: swept back from the wrist, narrowing to its tip as the build says.
    const sweep = Math.tan(handSweepDeg * Math.PI / 180)
    const hand: Station[] = []
    const fingered = tip === "fingered"
    const solidShare = fingered ? 0.62 : 1
    const steps = 10
    for (let s = 0; s <= steps; s++) {
      const share = (s / steps) * solidShare
      const x = handM * share
      let chord: number
      switch (tip) {
        case "pointed": chord = wristChord * (1 - 0.88 * share ** 1.3); break
        case "rounded": chord = wristChord * Math.sqrt(Math.max(0, 1 - share ** 2.2)) * 0.95 + 0.002; break
        case "fingered": chord = wristChord * (1 - 0.25 * share); break
      }
      // A pointed hand's trailing edge comes forward to its tip: its leading edge sweeps back, its chord shortens behind it.
      hand.push({ leading: new Vector3(x, 0, -wristChord * 0.3 + x * sweep), chordM: chord })
    }
    const tipFrom = 1 - tipShare
    const armSurfaces: [typeof BirdModel.MATERIALS[number], BufferGeometry][] = [
      ["upper", this.sheet(arm, true)], ["under", this.sheet(arm, false)]
    ]
    const inner = hand.filter((_, s) => s / steps * solidShare <= tipFrom + 1e-9)
    const outer = hand.filter((_, s) => s / steps * solidShare >= tipFrom - 1e-9 - 1 / steps)
    const handSurfaces: [typeof BirdModel.MATERIALS[number], BufferGeometry][] = []
    if (inner.length > 1) handSurfaces.push(["upper", this.sheet(inner, true)], ["under", this.sheet(inner, false)])
    if (outer.length > 1) handSurfaces.push(["tip-upper", this.sheet(outer, true)], ["tip-under", this.sheet(outer, false)])
    if (fingered) {
      // The outer primaries, standing apart: five narrow feathers fanning from the end of the solid hand, the front one longest.
      const base = hand[hand.length - 1]
      const fingerM = handM * (1 - solidShare)
      for (let f = 0; f < 5; f++) {
        const fan = (-6 + f * 7) * Math.PI / 180
        const length = fingerM * (1.15 - 0.09 * f)
        const rootZ = base.leading.z + base.chordM * (0.08 + 0.17 * f)
        const width = base.chordM * 0.14
        const feather: Station[] = []
        for (let s = 0; s <= 4; s++) {
          const along = length * (s / 4)
          feather.push({
            leading: new Vector3(base.leading.x + along * Math.cos(fan), 0, rootZ + along * Math.sin(fan) - width / 2),
            chordM: width * (1 - 0.6 * (s / 4) ** 2)
          })
        }
        handSurfaces.push(["tip-upper", this.sheet(feather, true)], ["tip-under", this.sheet(feather, false)])
      }
    }
    return [armSurfaces, handSurfaces, new Vector3(armM, 0, 0)]
  }

  /** The upper or under face of a wing through `stations`, cambered: the upper face bulges, the under face is nearly flat. */
  private sheet(stations: Station[], upper: boolean): BufferGeometry {
    const chordPoints = 7
    const rings = stations.map(station => {
      const points: Vector3[] = []
      for (let c = 0; c <= chordPoints; c++) {
        const u = c / chordPoints
        const thickness = station.chordM * (upper ? 0.07 : 0.02) * 4 * u * (1 - u) * (1 - 0.3 * u)
        points.push(new Vector3(station.leading.x, (upper ? 1 : -1) * thickness + station.chordM * 0.035 * Math.sin(Math.PI * u), station.leading.z + station.chordM * u))
      }
      return points
    })
    return Loft.of(rings, false)
  }

  /**
   * One wingbeat over one second, from the gliding pose and down first: the shoulder lowers the wing and raises it again past level, the
   * hand stays spread on the downstroke and folds back and down on the upstroke, and the body rises while the wings push down.
   */
  flap(nodes: { shoulders: number[], wrists: number[], root: number }): GltfChannel[] {
    const { strokeDeg, foldDeg, glideDeg, lengthM } = this.build
    const keys = 24
    const times: number[] = []
    for (let k = 0; k <= keys; k++) times.push(k / keys)
    const elevation = (p: number) => glideDeg + strokeDeg * (-Math.sin(2 * Math.PI * p) + 0.35 * (1 - Math.cos(2 * Math.PI * p)))
    const fold = (p: number) => foldDeg * Math.max(0, -Math.cos(2 * Math.PI * p)) ** 1.5
    const quaternion = (x: number, y: number, z: number) => {
      const q = new Quaternion().setFromEuler(new Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180, "YZX"))
      return [q.x, q.y, q.z, q.w]
    }
    const channels: GltfChannel[] = []
    nodes.shoulders.forEach((node, index) => {
      const side = index === 0 ? 1 : -1
      // The leading edge turns down a little on the downstroke (the wing's pitch), up on the upstroke.
      channels.push({ node, path: "rotation", times, values: times.flatMap(p => quaternion(-6 * Math.sin(2 * Math.PI * p) * -1, -side * fold(p) * 0.25, side * elevation(p))) })
    })
    nodes.wrists.forEach((node, index) => {
      const side = index === 0 ? 1 : -1
      // The hand: swept back and lowered against the arm on the upstroke, and lagging a little behind it on the downstroke.
      channels.push({ node, path: "rotation", times, values: times.flatMap(p => quaternion(0, -side * fold(p), side * (-0.45 * fold(p) - 6 * Math.sin(2 * Math.PI * p - 0.6)))) })
    })
    channels.push({ node: nodes.root, path: "translation", times, values: times.flatMap(p => [0, lengthM * 0.025 * Math.sin(2 * Math.PI * p - 0.4), 0]) })
    return channels
  }

  /**
   * The size of the model at rest along each axis, metres: its meshes where their joints put them, which GltfBounds (each mesh in its own
   * frame) does not do. What the catalogue states, and what a body stretches to its own size (see BodySystem.fit).
   */
  static restSizeOf(gltf: object): number[] {
    const file = gltf as { scenes: { nodes: number[] }[], nodes: { translation?: number[], mesh?: number, children?: number[] }[],
      meshes: { primitives: { attributes: { POSITION: number } }[] }[], accessors: { min: number[], max: number[] }[] }
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    const visit = (index: number, at: number[]) => {
      const node = file.nodes[index]
      const here = at.map((value, axis) => value + (node.translation?.[axis] ?? 0))
      if (node.mesh !== undefined) {
        for (const primitive of file.meshes[node.mesh].primitives) {
          const accessor = file.accessors[primitive.attributes.POSITION]
          for (let axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis], accessor.min[axis] + here[axis])
            max[axis] = Math.max(max[axis], accessor.max[axis] + here[axis])
          }
        }
      }
      for (const child of node.children ?? []) visit(child, here)
    }
    for (const root of file.scenes[0].nodes) visit(root, [0, 0, 0])
    return [0, 1, 2].map(axis => max[axis] - min[axis])
  }

  get materialList(): GltfMaterial[] {
    return this.materials
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
for (const build of BUILDS) {
  const model = new BirdModel(build)
  const writer = new GltfWriter(model.materialList)
  const nodes = model.write(writer)
  writer.addAnimation("flap", model.flap(nodes))
  const gltf = writer.toJSON("UFO@home scripts/build-birds.ts")
  const directory = path.join(here, "..", "public", "models", `ufoathome-bird-${build.id}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "bird.gltf"), JSON.stringify(gltf))
  const [x, y, z] = BirdModel.restSizeOf(gltf)
  console.log(`${build.id}: ${x.toFixed(3)} × ${y.toFixed(3)} × ${z.toFixed(3)} m (width × height × length)`)
}
