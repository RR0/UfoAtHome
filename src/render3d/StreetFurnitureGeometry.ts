import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshLambertMaterial, Shape, ShapeGeometry, Vector2 } from "three"
import type { Object3D } from "three"
import type { RoadSignFace } from "../engine/model/Decor.js"
import { TrafficSignals } from "../engine/model/LightRig.js"
import type { PedestrianFigure } from "../engine/model/LightRig.js"
import type { RgbColor } from "./skyColors.js"

/** One part of a piece of street furniture: a stock geometry, where it goes, and its colour. */
interface Part {
  geometry: BufferGeometry
  color: RgbColor
  matrix: Matrix4
}

/**
 * The furniture of a street at its real size, each piece ONE mesh: a traffic light's post, head and visors, a crossing's bands, a sign's post and
 * plates. A town surveyed brings a hundred and more of them (see OsmStreetFurniture), and a mesh per part was a thousand draws of a frame for
 * things a few centimetres across; the parts of one are merged here, each keeping its colour as the colour of its vertices.
 *
 * The lamps of a traffic light are not here: they are its `lights` (see TrafficSignals), drawn and switched as every declared lamp is (see
 * DecorSystem.addLights). The head is built around where they are, its lenses looking toward −z, the object's front, where its heading points.
 */
export class StreetFurnitureGeometry {
  /** How wide and deep a head is, metres, and how much taller than its lenses. */
  private static readonly HEAD_WIDTH_M = 0.34
  private static readonly HEAD_DEPTH_M = 0.24
  private static readonly HEAD_MARGIN_M = 0.18
  private static readonly POLE_RADIUS_M = 0.055
  private static readonly HOUSING: RgbColor = [0.05, 0.05, 0.05]
  private static readonly POLE: RgbColor = [0.16, 0.17, 0.17]
  /** A crossing's bands, as the French road code has them: half a metre wide, half a metre apart, a quarter of a metre clear of each kerb. */
  static readonly BAND_M = 0.5
  static readonly BAND_GAP_M = 0.5
  private static readonly KERB_CLEAR_M = 0.25
  /** Over the carriageway's ribbon and its paint (RoadSystem.LIFT_M and RoadMarkings.LIFT_M), which the bands are part of. */
  static readonly CROSSING_LIFT_M = 0.08
  private static readonly PAINT: RgbColor = [0.8, 0.8, 0.78]
  /** A sign: its post, the height of the centre of its plate (clear of a pedestrian's head), its metal back and the paint of its faces. */
  private static readonly SIGN_POLE_RADIUS_M = 0.03
  private static readonly SIGN_CENTRE_Y_M = 2.55
  private static readonly SIGN_METAL: RgbColor = [0.48, 0.49, 0.5]
  private static readonly SIGN_RED: RgbColor = [0.62, 0.05, 0.05]
  private static readonly SIGN_WHITE: RgbColor = [0.82, 0.82, 0.8]

  /** A traffic light: a post at the kerb and a dark head on it, a visor over each lens. A pedestrian's head holds two lenses, the traffic's three. */
  static trafficLight(pedestrian: boolean): Group {
    const lenses = pedestrian ? 2 : 3
    const centreY = pedestrian ? TrafficSignals.PEDESTRIAN_HEAD_Y_M : TrafficSignals.VEHICLE_HEAD_Y_M
    const spacing = TrafficSignals.LENS_SPACING_M
    const height = (lenses - 1) * spacing + 2 * StreetFurnitureGeometry.HEAD_MARGIN_M
    const poleHeight = centreY - height / 2 + 0.05
    const parts: Part[] = [
      StreetFurnitureGeometry.part(new CylinderGeometry(StreetFurnitureGeometry.POLE_RADIUS_M, StreetFurnitureGeometry.POLE_RADIUS_M, poleHeight, 8), StreetFurnitureGeometry.POLE, 0, poleHeight / 2, 0),
      StreetFurnitureGeometry.part(new BoxGeometry(StreetFurnitureGeometry.HEAD_WIDTH_M, height, StreetFurnitureGeometry.HEAD_DEPTH_M), StreetFurnitureGeometry.HOUSING, 0, centreY, 0)
    ]
    for (let k = 0; k < lenses; k++) {
      const y = centreY + ((lenses - 1) / 2 - k) * spacing
      parts.push(StreetFurnitureGeometry.part(new BoxGeometry(0.26, 0.02, 0.16), StreetFurnitureGeometry.HOUSING, 0, y + 0.12, -(StreetFurnitureGeometry.HEAD_DEPTH_M / 2 + 0.08)))
    }
    return StreetFurnitureGeometry.group(parts)
  }

  /** A crossing's bands across a road `widthM` wide, each `lengthM` long along it (z), laid flat a few centimetres over the ground. */
  static crossing(widthM: number, lengthM: number): Group {
    const band = StreetFurnitureGeometry.BAND_M
    const pitch = band + StreetFurnitureGeometry.BAND_GAP_M
    const usable = Math.max(band, widthM - 2 * StreetFurnitureGeometry.KERB_CLEAR_M)
    const count = Math.max(1, Math.floor((usable + StreetFurnitureGeometry.BAND_GAP_M) / pitch))
    const first = -((count - 1) * pitch) / 2
    const positions: number[] = []
    const normals: number[] = []
    const y = StreetFurnitureGeometry.CROSSING_LIFT_M
    const half = lengthM / 2
    for (let k = 0; k < count; k++) {
      const x0 = first + k * pitch - band / 2
      const x1 = x0 + band
      // Two triangles facing up, counter-clockwise seen from above.
      positions.push(x0, y, half, x1, y, half, x1, y, -half, x0, y, half, x1, y, -half, x0, y, -half)
      for (let v = 0; v < 6; v++) normals.push(0, 1, 0)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    const material = new MeshLambertMaterial({ color: 0xffffff })
    material.color.setRGB(...StreetFurnitureGeometry.PAINT)
    // Drawn over the carriageway it is painted on, as the road's own lines are (see RoadSystem.paint).
    material.polygonOffset = true
    material.polygonOffsetFactor = -4
    material.polygonOffsetUnits = -4
    const mesh = new Mesh(geometry, material)
    mesh.userData = { emissive: false }
    mesh.receiveShadow = true
    mesh.castShadow = false
    const group = new Group()
    group.add(mesh)
    return group
  }

  /**
   * Lays a crossing on the ground under it: each corner of each band at the ground there and the lift, `ground` reading the ground at a point of
   * the crossing's own frame (x across the road, z along it) as a height in the frame the group stands in.
   */
  static drape(group: Object3D, ground: (x: number, z: number) => number): void {
    group.traverse(child => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const positions = mesh.geometry.getAttribute("position")
      const rest = (mesh.userData.crossingRest ??= Float32Array.from(positions.array as ArrayLike<number>)) as Float32Array
      for (let i = 0; i < positions.count; i++) positions.setY(i, rest[i * 3 + 1] + ground(rest[i * 3], rest[i * 3 + 2]))
      positions.needsUpdate = true
      mesh.geometry.computeBoundingSphere()
      mesh.geometry.computeBoundingBox()
    })
  }

  /**
   * A road sign: a post and a plate looking toward −z (the object's front), its metal back behind its painted face so that from behind it is the grey of a sign's back.
   * Its face is the shape and the colours a driver reads it by; what is written on it (a number, a word) is not drawn, being unreadable but close up.
   */
  static roadSign(sign: RoadSignFace | undefined): Group {
    const y = StreetFurnitureGeometry.SIGN_CENTRE_Y_M
    const face = sign?.face ?? "other"
    const [outer, segments, thetaStart] = face === "stop" ? [0.38, 8, Math.PI / 8] : face === "give-way" ? [0.52, 3, 0] : face === "speed-limit" ? [0.325, 24, 0] : [0, 0, 0]
    const top = y + (face === "other" ? 0.3 : outer)
    const r = StreetFurnitureGeometry.SIGN_POLE_RADIUS_M
    const parts: Part[] = [StreetFurnitureGeometry.part(new CylinderGeometry(r, r, top, 6), StreetFurnitureGeometry.SIGN_METAL, 0, top / 2, 0)]
    // A plate of the sign's shape, its axis turned to z: `z` is how far in front of the post (toward −z) its middle is.
    const plate = (radius: number, thickness: number, z: number, color: RgbColor) => {
      const geometry = new CylinderGeometry(radius, radius, thickness, segments, 1, false, thetaStart)
      geometry.rotateX(Math.PI / 2)
      parts.push(StreetFurnitureGeometry.part(geometry, color, 0, y, -z))
    }
    if (face === "other") {
      parts.push(StreetFurnitureGeometry.part(new BoxGeometry(0.6, 0.6, 0.012), StreetFurnitureGeometry.SIGN_METAL, 0, y, -(r + 0.008)))
      parts.push(StreetFurnitureGeometry.part(new BoxGeometry(0.58, 0.58, 0.004), StreetFurnitureGeometry.SIGN_WHITE, 0, y, -(r + 0.017)))
    } else {
      plate(outer, 0.012, r + 0.008, StreetFurnitureGeometry.SIGN_METAL)
      // A stop is red within a thin white rim; a give way and a limit are white within a broad red one.
      const [rim, inner, inside] = face === "stop" ? [StreetFurnitureGeometry.SIGN_WHITE, StreetFurnitureGeometry.SIGN_RED, 0.92] : [StreetFurnitureGeometry.SIGN_RED, StreetFurnitureGeometry.SIGN_WHITE, face === "give-way" ? 0.68 : 0.77]
      plate(outer * 0.99, 0.004, r + 0.017, rim)
      plate(outer * inside, 0.003, r + 0.0205, inner)
    }
    return StreetFurnitureGeometry.group(parts)
  }

  /**
   * What a lens of a pedestrian's head shows lit, `heightM` tall: a figure standing face on, or one walking seen from the side, as the R12 signal
   * of the French road code has them. Flat, looking toward −z as the head does; each one outline and a head apart, never overlapping, as a lamp
   * adds its light and a part drawn twice would shine twice.
   */
  static pedestrianFigure(figure: PedestrianFigure, heightM: number): BufferGeometry {
    // In a figure one unit tall, centred on the lens.
    const outline: [number, number][] = figure === "standing"
      ? [[-0.17, 0.25], [0.17, 0.25], [0.17, -0.08], [0.1, -0.08], [0.1, -0.5], [0.02, -0.5], [0.02, -0.12], [-0.02, -0.12], [-0.02, -0.5], [-0.1, -0.5], [-0.1, -0.08], [-0.17, -0.08]]
      : [[-0.05, 0.26], [-0.09, 0.22], [-0.24, 0.05], [-0.19, 0.01], [-0.07, 0.13], [-0.07, 0], [-0.18, -0.22], [-0.29, -0.47], [-0.22, -0.5], [-0.1, -0.25],
        [-0.01, -0.07], [0.09, -0.27], [0.13, -0.5], [0.21, -0.48], [0.16, -0.24], [0.07, 0], [0.07, 0.11], [0.2, 0], [0.24, 0.05], [0.08, 0.22], [0.05, 0.26]]
    const body = new Shape(outline.map(([x, y]) => new Vector2(x, y)))
    const head = new Shape()
    head.absarc(figure === "standing" ? 0 : -0.02, 0.38, 0.1, 0, 2 * Math.PI, false)
    const geometry = new ShapeGeometry([body, head], 6)
    geometry.scale(heightM, heightM, heightM)
    // A shape faces +z: turned to face the front.
    geometry.rotateY(Math.PI)
    return geometry
  }

  /** A part at (x, y, z) of the piece. */
  private static part(geometry: BufferGeometry, color: RgbColor, x: number, y: number, z: number): Part {
    return { geometry, color, matrix: new Matrix4().makeTranslation(x, y, z) }
  }

  /** The parts as one mesh, coloured by vertex, casting and taking shadows as a solid thing does. */
  private static group(parts: Part[]): Group {
    const positions: number[] = []
    const normals: number[] = []
    const colors: number[] = []
    for (const { geometry, color, matrix } of parts) {
      const flat = geometry.index ? geometry.toNonIndexed() : geometry
      flat.applyMatrix4(matrix)
      const position = flat.getAttribute("position")
      const normal = flat.getAttribute("normal")
      for (let i = 0; i < position.count; i++) {
        positions.push(position.getX(i), position.getY(i), position.getZ(i))
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
        colors.push(...color)
      }
      if (flat !== geometry) flat.dispose()
      geometry.dispose()
    }
    const merged = new BufferGeometry()
    merged.setAttribute("position", new Float32BufferAttribute(positions, 3))
    merged.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    merged.setAttribute("color", new Float32BufferAttribute(colors, 3))
    const mesh = new Mesh(merged, new MeshLambertMaterial({ color: 0xffffff, vertexColors: true }))
    mesh.userData = { emissive: false }
    mesh.castShadow = true
    mesh.receiveShadow = true
    const group = new Group()
    group.add(mesh)
    return group
  }
}
