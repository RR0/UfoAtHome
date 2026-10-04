/**
 * Builds the stand-in model of the object Paul Trent photographed at McMinnville on 11 May 1950, and
 * writes it to public/models/ufoathome-mcminnville-object/object.gltf.
 *
 * Its shape is what the two prints show and the 2013 IPACO study measures on them (Cousyn, Louange
 * and Quick): a flat circular base, dark, whose underside is seen from below on the first photograph
 * (eccentricity 0.362) and no longer on the second; a low shouldered dome above it, "like the canopy
 * of a parachute without its lines" (Evelyn Trent, in Condon's case 46); and, on top and a little
 * off the middle, the small stub plate 26 shows, which the account calls an antenna.
 *
 * Drawn at 12 cm across because that is the figure of the model hypothesis, and meant to be
 * STRETCHED: the same shape stands for an object of any size at the distance its angular width needs,
 * which is the whole point of the comparison (a model, a hubcap, a disc 25 m wide, all the same
 * 1.6 degrees and the same look). The only shape in it that is not measured is the dome's profile,
 * read off the prints' silhouette.
 *
 * Run with: node --import tsx scripts/build-mcminnville-object.ts
 */
import { BufferGeometry, CircleGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GltfBounds, GltfWriter } from "./GltfWriter.js"
import type { Part } from "./GltfWriter.js"

class McMinnvilleObject {
  /** Metres, for a model 12 cm across. */
  static readonly RADIUS_M = 0.06
  static readonly RIM_HEIGHT_M = 0.006
  static readonly DOME_TOP_M = 0.034
  static readonly ANTENNA_RADIUS_M = 0.003
  static readonly ANTENNA_HEIGHT_M = 0.008
  /** Where the stub stands: 28 px left of the centre on the disc's 470 px (plate 26), a twelfth of its width. */
  static readonly ANTENNA_OFFSET_M = -0.0071

  /** Silver with a touch of bronze on top ("argenté, un peu bronze"), a dark underside. Matt: a
   * metallic material without an environment to reflect draws black, and a dome that is one flat black
   * shape shows nothing of its form. */
  readonly materials = [
    GltfWriter.material("hull", "#c8c2b6", 0.05, 0.55),
    GltfWriter.material("underside", "#1e1e20", 0.1, 0.8)
  ]

  parts(): Part[] {
    return [
      { name: "hull", geometry: this.hull(), material: 0 },
      { name: "underside", geometry: this.underside(), material: 1 },
      { name: "antenna", geometry: this.antenna(), material: 0 }
    ]
  }

  /** A body of revolution: the rim, then the shoulder, then the dome closing at the top. */
  private hull(): BufferGeometry {
    const r = McMinnvilleObject.RADIUS_M
    const profile = [
      new Vector2(r * 0.97, 0),
      new Vector2(r, McMinnvilleObject.RIM_HEIGHT_M * 0.5),
      new Vector2(r * 0.94, McMinnvilleObject.RIM_HEIGHT_M),
      new Vector2(r * 0.78, 0.016),
      new Vector2(r * 0.55, 0.026),
      new Vector2(r * 0.3, 0.032),
      new Vector2(0, McMinnvilleObject.DOME_TOP_M)
    ]
    const geometry = new LatheGeometry(profile, 48)
    geometry.computeVertexNormals()
    return geometry
  }

  /** The flat base, facing down. */
  private underside(): BufferGeometry {
    const geometry = new CircleGeometry(McMinnvilleObject.RADIUS_M * 0.97, 48)
    geometry.rotateX(Math.PI / 2)
    geometry.computeVertexNormals()
    return geometry
  }

  private antenna(): BufferGeometry {
    const geometry = new CylinderGeometry(McMinnvilleObject.ANTENNA_RADIUS_M, McMinnvilleObject.ANTENNA_RADIUS_M, McMinnvilleObject.ANTENNA_HEIGHT_M, 10)
    geometry.translate(McMinnvilleObject.ANTENNA_OFFSET_M, McMinnvilleObject.DOME_TOP_M + McMinnvilleObject.ANTENNA_HEIGHT_M / 2 - 0.001, 0)
    geometry.computeVertexNormals()
    return geometry
  }
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const directory = path.join(root, "public", "models", "ufoathome-mcminnville-object")
mkdirSync(directory, { recursive: true })
const object = new McMinnvilleObject()
const writer = new GltfWriter(object.materials)
for (const part of object.parts()) writer.addMesh(part)
const file = path.join(directory, "object.gltf")
const gltf = writer.toJSON("UFO@home scripts/build-mcminnville-object.ts")
writeFileSync(file, JSON.stringify(gltf) + "\n")
const [width, height, length] = GltfBounds.sizeOf(gltf)
console.log(`Wrote ${path.relative(root, file)}: ${width.toFixed(3)} × ${height.toFixed(3)} × ${length.toFixed(3)} m (x, y, z)`)
