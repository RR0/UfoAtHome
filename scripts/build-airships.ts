/**
 * Builds the airships an interpretation can claim an account saw (see src/modules/interpretations/airships), and writes them to
 * public/models/ufoathome-airship-*\/airship.gltf, one per type (see AirshipType):
 *
 * - "blimp": a GZ-20A-class blimp, its envelope of revolution, four fins in a cross, its gondola under its front half, an engine and its
 *   propeller beside the gondola on each side, and its sign of lamps along each flank ("light-sign-left", "light-sign-right").
 * - "zeppelin-nt": a Zeppelin NT, longer and slimmer, its three fins in an inverted Y, its gondola well forward, two side propellers and one
 *   at its stern.
 * - "lightship": an A-60-class lightship, its white envelope lit from inside (see LitFromWithin), a small gondola under it.
 * - "aerostat": a tethered aerostat, fat, its three large fins in an inverted Y, the dome of its radar under it.
 * - "rigid": a great rigid airship of the Graf Zeppelin's size, its control car under its bow and its engine cars along its flanks.
 *
 * Each is in metres, its nose towards -Z, up +Y, its right towards +X (the axes of BodySystem), its middle on its envelope's axis. Its
 * lights are where the type says (AirshipType.lights), each LED its own material, as a drone's are (see DroneAirframes.materialOf). A
 * propeller is drawn as the faintly see-through disc its blades sweep. The shapes are this project's, from photographs and makers' figures.
 *
 * Run with: node --import tsx scripts/build-airships.ts
 */
import { BoxGeometry, BufferGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, Vector2 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { GltfMaterial } from "./GltfWriter.js"
import { AirshipTypes } from "../src/modules/interpretations/airships/AirshipType.js"
import type { AirshipType, AirshipTypeId } from "../src/modules/interpretations/airships/AirshipType.js"
import { DroneAirframes } from "../src/modules/interpretations/drones/DroneAirframe.js"

class AirshipModel {
  readonly materials: GltfMaterial[] = []
  private readonly parts = new Map<string, BufferGeometry[]>()

  constructor(type: AirshipType, glowing: boolean) {
    this.materials.push(
      glowing
        ? GltfWriter.material("envelope", "#ffffff", 0, 0.6, { emissiveFactor: GltfWriter.linear("#fff2dc"), doubleSided: true })
        : GltfWriter.material("envelope", "#ffffff", 0.1, 0.45),
      GltfWriter.material("fin", "#ffffff", 0.1, 0.5),
      GltfWriter.material("gondola", "#3a3d42", 0.3, 0.45),
      GltfWriter.material("window", "#0b0f14", 0.4, 0.1),
      { ...GltfWriter.material("rotor", "#2a2c2e", 0, 0.7), alphaMode: "BLEND", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [...GltfWriter.linear("#2a2c2e"), 0.18], metallicFactor: 0, roughnessFactor: 0.7 } }
    )
    if (type.sign) for (const side of ["left", "right"]) this.materials.push(GltfWriter.material(`light-sign-${side}`, "#ffffff", 0, 0.5, { emissiveFactor: [1, 1, 1] }))
    for (const [name, light] of Object.entries(type.lights)) {
      light.leds.forEach((led, i) => {
        const material = DroneAirframes.materialOf(name, i, light.leds.length)
        this.materials.push(GltfWriter.material(material, "#ffffff", 0, 0.4, { emissiveFactor: [1, 1, 1] }))
        this.add(material, new SphereGeometry(led.radiusM, 12, 8).translate(...led.at))
      })
    }
  }

  add(material: string, geometry: BufferGeometry): void {
    const list = this.parts.get(material) ?? []
    const indexed = geometry.index ? geometry : AirshipModel.indexed(geometry)
    if (indexed.getAttribute("uv")) indexed.deleteAttribute("uv")
    indexed.computeVertexNormals()
    list.push(indexed)
    this.parts.set(material, list)
  }

  /** Lights `material` from a point inside, `at` (see LitFromWithin). */
  litFrom(material: string, at: [number, number, number]): void {
    const geometry = mergeGeometries(this.parts.get(material)!, false)!
    this.materials.find(m => m.name === material)!.extras = { litFromWithin: { at, mean: AirshipModel.meanLight(geometry, at) } }
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

/** The envelope's radius at `s`, from its nose (0) to its tail (1): an ellipse to its widest at `widest`, then tapering to a point. */
const radiusAt = (s: number, radiusM: number, widest: number): number => s <= widest
  ? radiusM * Math.sqrt(Math.max(0, 1 - ((widest - s) / widest) ** 2))
  : radiusM * Math.max(0, 1 - ((s - widest) / (1 - widest)) ** 2) ** 0.6

/** Its envelope: a surface of revolution about Z, nose at -length/2. */
const envelope = (lengthM: number, radiusM: number, widest: number): BufferGeometry => {
  const profile: Vector2[] = []
  for (let i = 0; i <= 60; i++) {
    const s = i / 60
    profile.push(new Vector2(Math.max(radiusAt(s, radiusM, widest), i === 0 || i === 60 ? 0 : 0.01), -lengthM / 2 + s * lengthM))
  }
  // About Y, then laid along Z: y becomes z, so the nose is at -Z.
  return new LatheGeometry(profile, 48).rotateX(Math.PI / 2)
}

/** A fin at the tail, `angleDeg` round from the top (clockwise seen from behind), its root on the envelope. */
const fin = (lengthM: number, radiusM: number, widest: number, chordM: number, spanM: number, angleDeg: number): BufferGeometry => {
  const middleZ = lengthM / 2 - chordM * 0.75
  const root = radiusAt((middleZ + lengthM / 2) / lengthM, radiusM, widest)
  const geometry = new BoxGeometry(Math.max(0.15, chordM / 60), spanM + root * 0.3, chordM)
  geometry.translate(0, root * 0.85 + spanM / 2, middleZ)
  return geometry.rotateZ(-angleDeg * Math.PI / 180)
}

/** A cylinder lying along Z, its middle at (x, y, z). */
const axial = (radius: number, length: number, x: number, y: number, z: number, segments = 20): BufferGeometry =>
  new CylinderGeometry(radius, radius, length, segments).rotateX(Math.PI / 2).translate(x, y, z)

interface Build {
  lengthM: number
  radiusM: number
  widest: number
  fins: { chordM: number, spanM: number, angles: number[] }
  more(model: AirshipModel): void
}

const BUILDS: Record<AirshipTypeId, Build> = {
  blimp: {
    lengthM: 59.4, radiusM: 7.15, widest: 0.4, fins: { chordM: 9, spanM: 3.6, angles: [0, 90, 180, 270] },
    more: model => {
      model.add("gondola", new BoxGeometry(2.4, 3, 7).translate(0, -8.6, -9))
      model.add("window", new BoxGeometry(2.42, 0.9, 5).translate(0, -8.1, -9.4))
      for (const x of [-2.4, 2.4]) {
        model.add("gondola", axial(0.45, 2.2, x, -8.4, -7.5))
        model.add("rotor", axial(1.0, 0.03, x, -8.4, -6.3, 40))
      }
      for (const [side, x] of [["left", -7.2], ["right", 7.2]] as const) model.add(`light-sign-${side}`, new BoxGeometry(0.1, 6.5, 28).translate(x, -0.2, -1))
    }
  },
  "zeppelin-nt": {
    lengthM: 75.1, radiusM: 7.1, widest: 0.38, fins: { chordM: 10, spanM: 6.4, angles: [0, 120, 240] },
    more: model => {
      model.add("gondola", new BoxGeometry(2.6, 2.4, 10).translate(0, -8.4, -14))
      model.add("window", new BoxGeometry(2.62, 0.8, 7).translate(0, -8.1, -14.5))
      for (const x of [-7.6, 7.6]) {
        model.add("gondola", new BoxGeometry(Math.abs(x) - 5, 0.3, 0.6).translate(x / 2 + Math.sign(x) * 2.5, -3, -2))
        model.add("rotor", axial(1.5, 0.03, x, -3, -2, 40))
      }
      model.add("rotor", axial(1.5, 0.03, 0, 0, 37.3, 40))
      for (const [side, x] of [["left", -7.12], ["right", 7.12]] as const) model.add(`light-sign-${side}`, new BoxGeometry(0.1, 6, 30).translate(x, -0.2, -2))
    }
  },
  lightship: {
    lengthM: 39.6, radiusM: 4.9, widest: 0.4, fins: { chordM: 6, spanM: 2.5, angles: [0, 90, 180, 270] },
    more: model => {
      model.add("gondola", new BoxGeometry(1.6, 2, 4.5).translate(0, -5.9, -6))
      model.add("window", new BoxGeometry(1.62, 0.6, 3).translate(0, -5.6, -6.3))
      for (const x of [-1.6, 1.6]) model.add("rotor", axial(0.7, 0.03, x, -5.7, -3.5, 40))
    }
  },
  aerostat: {
    lengthM: 63.6, radiusM: 10.5, widest: 0.35, fins: { chordM: 14, spanM: 8, angles: [0, 120, 240] },
    more: model => {
      // The dome of its radar under its middle, and the fittings its line is held by.
      model.add("gondola", new SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -10.2, -4))
      model.add("gondola", new BoxGeometry(1.2, 1.2, 4).translate(0, -10.6, 4))
    }
  },
  rigid: {
    lengthM: 236.6, radiusM: 15.25, widest: 0.3, fins: { chordM: 30, spanM: 10, angles: [0, 90, 180, 270] },
    more: model => {
      model.add("gondola", new BoxGeometry(6, 3, 30).translate(0, -16.5, -80))
      model.add("window", new BoxGeometry(6.02, 1, 22).translate(0, -16.2, -81))
      // Its engine cars, each with its propeller behind it.
      for (const [x, z] of [[-13, 10], [13, 10], [-13, 45], [13, 45], [0, 70]]) {
        const y = x === 0 ? -16.5 : -10
        model.add("gondola", axial(1.5, 6, x, y, z))
        model.add("rotor", axial(2.6, 0.05, x, y, z + 3.2, 40))
      }
    }
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
for (const type of AirshipTypes.ALL) {
  const build = BUILDS[type.id]
  const glowing = type.glowCdM2 !== undefined
  const model = new AirshipModel(type, glowing)
  model.add("envelope", envelope(build.lengthM, build.radiusM, build.widest))
  for (const angle of build.fins.angles) model.add("fin", fin(build.lengthM, build.radiusM, build.widest, build.fins.chordM, build.fins.spanM, angle))
  build.more(model)
  if (glowing) model.litFrom("envelope", [0, 0, 0])
  const writer = new GltfWriter(model.materials)
  model.write(writer)
  const gltf = writer.toJSON("UFO@home scripts/build-airships.ts")
  const directory = path.join(here, "..", "public", "models", type.modelId)
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "airship.gltf"), JSON.stringify(gltf) + "\n")
  const [x, y, z] = GltfBounds.sizeOf(gltf)
  console.log(`${type.id}: ${x.toFixed(2)} × ${y.toFixed(2)} × ${z.toFixed(2)} m (width × height × length), stated ${type.sizeM.widthM} × ${type.sizeM.heightM} × ${type.sizeM.lengthM}`)
}
