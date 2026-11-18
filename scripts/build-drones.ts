/**
 * Builds the drones an interpretation can claim an account saw (see src/modules/interpretations/drones), and writes them to
 * public/models/ufoathome-drone-*\/drone.gltf, one per airframe (see DroneAirframe):
 *
 * - "quadcopter": a folding consumer quadcopter of a DJI Mavic's size, its body between four arms, a motor and a rotor at the end of each,
 *   a camera on a gimbal under its nose.
 * - "saucer": a "drufo", a disc 0.8 m across, its two shells meeting at a recessed band where a ring of LEDs shines, the grilles of its
 *   rotors in its upper shell, a light under it.
 * - "fixed-wing": a small military drone with a high wing, a tail, and a pusher propeller at its end.
 *
 * Each is in metres, the nose towards -Z, up +Y, its right towards +X (the axes of BodySystem). A rotor or a propeller is drawn as the disc
 * its blades sweep, faintly see-through: what a camera's shutter and an eye make of blades turning a hundred times a second.
 *
 * Its surfaces are named for what can be coloured on them (see the catalogue's bindings): "hull", and each LED its own material,
 * `light-<name>` or `light-<name>-<n>` (see DroneAirframes.materialOf), white and glowing, coloured by its model setting (`frontColor`,
 * `rimColor`…), and lit as bright as the recording says (see BodyKeyframe.lights). Where each LED is, and how big, is the airframe's
 * (DroneAirframe.lights), so that the model and the flight that lights it agree. The shapes are this project's, from photographs of such
 * drones.
 *
 * Run with: node --import tsx scripts/build-drones.ts
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, Vector2 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial } from "./GltfWriter.js"
import { DroneAirframes } from "../src/modules/interpretations/drones/DroneAirframe.js"
import type { DroneAirframe } from "../src/modules/interpretations/drones/DroneAirframe.js"

class DroneModel {
  readonly materials: GltfMaterial[] = []
  private readonly parts = new Map<string, BufferGeometry[]>()

  constructor(private readonly airframe: DroneAirframe) {
    this.materials.push(
      GltfWriter.material("hull", airframe.bodyColor, 0.1, 0.55),
      GltfWriter.material("dark", "#1d1f21", 0.1, 0.6),
      GltfWriter.material("lens", "#05070a", 0.3, 0.15),
      // The disc its blades sweep: mostly what is behind it.
      { ...GltfWriter.material("rotor", "#2a2c2e", 0, 0.7), alphaMode: "BLEND", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [...GltfWriter.linear("#2a2c2e"), 0.18], metallicFactor: 0, roughnessFactor: 0.7 } }
    )
    for (const [name, light] of Object.entries(airframe.lights)) {
      light.leds.forEach((led, i) => {
        const material = DroneAirframes.materialOf(name, i, light.leds.length)
        this.materials.push(GltfWriter.material(material, "#ffffff", 0, 0.4, { emissiveFactor: [1, 1, 1] }))
        const bulb = new SphereGeometry(led.radiusM, 12, 8)
        // A light under a hull is a lens flush with it, not a ball hanging from it.
        if (name === "under") bulb.scale(1, 0.3, 1)
        bulb.translate(...led.at)
        this.add(material, bulb)
      })
    }
  }

  add(material: string, geometry: BufferGeometry): void {
    const list = this.parts.get(material) ?? []
    // Every part indexed and with normals, as GltfWriter wants.
    const indexed = geometry.index ? geometry : DroneModel.indexed(geometry)
    indexed.computeVertexNormals()
    list.push(indexed.deleteAttribute("uv") ?? indexed)
    this.parts.set(material, list)
  }

  write(writer: GltfWriter): void {
    for (const [material, geometries] of this.parts) {
      writer.addMesh({ name: material, geometry: mergeGeometries(geometries, false)!, material: this.materials.findIndex(m => m.name === material) })
    }
  }

  /** Its extent, metres: width (x), height (y), length (z). */
  size(): [number, number, number] {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (const geometries of this.parts.values()) for (const geometry of geometries) {
      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      min[0] = Math.min(min[0], box.min.x); min[1] = Math.min(min[1], box.min.y); min[2] = Math.min(min[2], box.min.z)
      max[0] = Math.max(max[0], box.max.x); max[1] = Math.max(max[1], box.max.y); max[2] = Math.max(max[2], box.max.z)
    }
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  }

  private static indexed(geometry: BufferGeometry): BufferGeometry {
    const count = geometry.getAttribute("position").count
    geometry.setIndex(Array.from({ length: count }, (_, i) => i))
    return geometry
  }
}

/** A cylinder standing on Y, its middle at (x, y, z). */
const cylinder = (radius: number, height: number, x: number, y: number, z: number, segments = 20): BufferGeometry =>
  new CylinderGeometry(radius, radius, height, segments).translate(x, y, z)

/** A cylinder lying along Z, its middle at (x, y, z): a lens, a hub, a propeller's disc. */
const axial = (radius: number, length: number, x: number, y: number, z: number, segments = 20): BufferGeometry =>
  new CylinderGeometry(radius, radius, length, segments).rotateX(Math.PI / 2).translate(x, y, z)

const box = (w: number, h: number, l: number, x: number, y: number, z: number): BufferGeometry => new BoxGeometry(w, h, l).translate(x, y, z)

/** A rounded body: a sphere stretched to these half-extents. */
const pod = (hx: number, hy: number, hz: number, x: number, y: number, z: number): BufferGeometry =>
  new SphereGeometry(1, 24, 14).scale(hx, hy, hz).translate(x, y, z)

/** A bar from (x1, z1) to (x2, z2) at height y, of this width and thickness. */
const bar = (x1: number, z1: number, x2: number, z2: number, y: number, width: number, thickness: number): BufferGeometry => {
  const length = Math.hypot(x2 - x1, z2 - z1)
  const geometry = new BoxGeometry(width, thickness, length)
  geometry.rotateY(Math.atan2(x2 - x1, z2 - z1))
  return geometry.translate((x1 + x2) / 2, y, (z1 + z2) / 2)
}

function quadcopter(model: DroneModel): void {
  // Motors at the corners of a 380 mm diagonal, the front pair a little wider; 9.4-inch rotors over them.
  const motors: [number, number][] = [[-0.135, -0.13], [0.135, -0.13], [-0.13, 0.125], [0.13, 0.125]]
  model.add("hull", pod(0.05, 0.034, 0.11, 0, 0.005, 0))
  model.add("hull", box(0.075, 0.03, 0.12, 0, 0.012, 0.02))
  for (const [x, z] of motors) {
    model.add("hull", bar(Math.sign(x) * 0.03, Math.sign(z) * 0.05, x, z, 0.01, 0.018, 0.014))
    model.add("dark", cylinder(0.014, 0.022, x, 0.026, z))
    model.add("rotor", cylinder(0.119, 0.002, x, 0.042, z, 40))
    // The folding legs under the motors, what it stands on.
    model.add("dark", cylinder(0.005, 0.05, x, -0.025, z, 8))
  }
  // The camera on its gimbal, under the nose.
  model.add("dark", box(0.04, 0.03, 0.03, 0, -0.022, -0.1))
  model.add("lens", axial(0.012, 0.006, 0, -0.022, -0.116, 16))
}

function saucer(model: DroneModel): void {
  // Two shells meeting at a recessed band at the equator, where the ring of LEDs is; a dome on top.
  const profile = [
    [0.0, -0.094], [0.12, -0.094], [0.3, -0.06], [0.4, -0.02], [0.4, -0.014], [0.378, -0.012], [0.378, 0.012], [0.4, 0.014],
    [0.4, 0.02], [0.3, 0.05], [0.16, 0.07], [0.12, 0.1], [0.0, 0.1]
  ].map(([r, y]) => new Vector2(r, y))
  model.add("hull", new LatheGeometry(profile, 64))
  // The grilles over its four rotors, inside the upper shell.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2
    model.add("dark", cylinder(0.075, 0.004, 0.22 * Math.sin(a), 0.055, -0.22 * Math.cos(a), 28))
  }
}

function fixedWing(model: DroneModel): void {
  // A fuselage, a high wing, a horizontal tail and a fin; the pusher propeller at its end.
  model.add("hull", pod(0.09, 0.1, 0.78, 0, 0, -0.12))
  model.add("hull", box(3.58, 0.03, 0.32, 0, 0.09, -0.1))
  model.add("hull", bar(0, 0.2, 0, 0.78, 0.05, 0.04, 0.04))
  model.add("hull", box(0.9, 0.02, 0.18, 0, 0.05, 0.75))
  model.add("hull", box(0.02, 0.28, 0.2, 0, 0.19, 0.76))
  model.add("dark", axial(0.03, 0.06, 0, 0, 0.88))
  model.add("rotor", axial(0.2, 0.004, 0, 0, 0.92, 40))
  model.add("lens", pod(0.05, 0.05, 0.05, 0, -0.09, -0.6))
}

const here = path.dirname(fileURLToPath(import.meta.url))
const BUILDERS: Record<string, (model: DroneModel) => void> = { quadcopter, saucer, "fixed-wing": fixedWing }
for (const airframe of DroneAirframes.ALL) {
  const model = new DroneModel(airframe)
  BUILDERS[airframe.id](model)
  const writer = new GltfWriter(model.materials)
  model.write(writer)
  const gltf = writer.toJSON("UFO@home scripts/build-drones.ts")
  const directory = path.join(here, "..", "public", "models", `ufoathome-drone-${airframe.id}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "drone.gltf"), JSON.stringify(gltf))
  const [x, y, z] = model.size()
  console.log(`${airframe.id}: ${x.toFixed(3)} × ${y.toFixed(3)} × ${z.toFixed(3)} m (width × height × length), stated ${airframe.sizeM.widthM} × ${airframe.sizeM.heightM} × ${airframe.sizeM.lengthM}`)
}
