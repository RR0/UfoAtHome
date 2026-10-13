import { BufferGeometry, Float32BufferAttribute } from "three"
import type { DecorRoof } from "../engine/model/Decor.js"

/**
 * The roof of a building, from its eaves up, at its own size: x across the width of the building, z along its depth, y up from the top of the
 * walls. Never stretched afterwards (a pitch that the walls' height changed would no longer be the pitch the laser measured).
 *
 * - "gable": two slopes meeting at a ridge along the width, and a triangle at each end;
 * - "hip": four slopes, the ridge as long as the building is wider than it is deep (a pyramid for a square one);
 * - "flat": a thin slab, which is where a colour goes on a box.
 *
 * The roof overhangs the walls a little, as a roof does: a roof exactly the size of its walls shows a seam of wall colour at the eaves.
 */
export class RoofGeometry {
  /** How far a roof stands out from the wall on every side. */
  static readonly OVERHANG_M = 0.25
  /** The slab of a flat roof. */
  static readonly SLAB_M = 0.2
  /** A hip roof's ridge is never shorter than this, so that its two end slopes are not degenerate. */
  private static readonly MIN_RIDGE_M = 0.1

  static build(roof: DecorRoof, widthM: number, lengthM: number): BufferGeometry {
    // A ridge along the depth is the same roof turned a quarter, built on the building with its two sides swapped.
    const turned = roof.shape === "gable" && roof.ridge === "depth"
    const halfWidth = (turned ? lengthM : widthM) / 2 + RoofGeometry.OVERHANG_M
    const halfDepth = (turned ? widthM : lengthM) / 2 + RoofGeometry.OVERHANG_M
    const geometry = roof.shape === "flat" || roof.riseM <= 0
      ? RoofGeometry.slab(halfWidth, halfDepth)
      : RoofGeometry.pitched(roof.shape, halfWidth, halfDepth, roof.riseM)
    if (turned) geometry.rotateY(Math.PI / 2)
    geometry.computeVertexNormals()
    return geometry
  }

  private static slab(halfWidth: number, halfDepth: number): BufferGeometry {
    const top = RoofGeometry.SLAB_M
    const corners: [number, number, number][] = [[-halfWidth, 0, -halfDepth], [halfWidth, 0, -halfDepth], [halfWidth, 0, halfDepth], [-halfWidth, 0, halfDepth]]
    const upper = corners.map(([x, , z]) => [x, top, z] as [number, number, number])
    const triangles: [number, number, number][] = []
    const quad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]): void => {
      triangles.push(a, b, c, a, c, d)
    }
    quad(upper[0], upper[3], upper[2], upper[1])
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      quad(corners[i], corners[j], upper[j], upper[i])
    }
    return RoofGeometry.of(triangles)
  }

  private static pitched(shape: "gable" | "hip", halfWidth: number, halfDepth: number, rise: number): BufferGeometry {
    const eave = (x: number, z: number): [number, number, number] => [x, 0, z]
    const ridgeHalf = shape === "gable" ? halfWidth : Math.max(RoofGeometry.MIN_RIDGE_M / 2, halfWidth - halfDepth)
    const west = [-ridgeHalf, rise, 0] as [number, number, number]
    const east = [ridgeHalf, rise, 0] as [number, number, number]
    const triangles: [number, number, number][] = []
    // The two long slopes, the front one facing -z.
    triangles.push(eave(-halfWidth, -halfDepth), eave(halfWidth, -halfDepth), east, eave(-halfWidth, -halfDepth), east, west)
    triangles.push(eave(halfWidth, halfDepth), eave(-halfWidth, halfDepth), west, eave(halfWidth, halfDepth), west, east)
    // The two ends: a triangle for a gable, a slope for a hip.
    if (shape === "gable") {
      triangles.push(eave(-halfWidth, halfDepth), eave(-halfWidth, -halfDepth), west)
      triangles.push(eave(halfWidth, -halfDepth), eave(halfWidth, halfDepth), east)
    } else {
      triangles.push(eave(-halfWidth, halfDepth), eave(-halfWidth, -halfDepth), west)
      triangles.push(eave(halfWidth, -halfDepth), eave(halfWidth, halfDepth), east)
    }
    // Underneath, so that a roof is not open from below (an observer on a hill never sees it, a low sun's shadow does).
    triangles.push(eave(-halfWidth, -halfDepth), eave(-halfWidth, halfDepth), eave(halfWidth, halfDepth), eave(-halfWidth, -halfDepth), eave(halfWidth, halfDepth), eave(halfWidth, -halfDepth))
    return RoofGeometry.of(triangles)
  }

  private static of(vertices: [number, number, number][]): BufferGeometry {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(vertices.flat(), 3))
    return geometry
  }
}
