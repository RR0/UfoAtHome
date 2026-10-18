import { BufferGeometry, Float32BufferAttribute } from "three"
import { FacadeTexture } from "./FacadeTexture.js"

/**
 * The walls of a building at its real size: four faces, each cut into bays of about three metres and into floors of about three, every bay
 * mapped to a variant of the facade picture (see FacadeTexture), so that a house of any size has windows the size of windows. A door is on the
 * ground floor of the front face, in the middle bay; the other faces have windows only. The top is plain: the roof covers it, or it is the flat roof.
 *
 * Each window has a rank, from 0 up to 1, the same every time for the same building: at night it is lit when the share of the windows that are lit
 * exceeds its rank, so that the ones lit at midnight are still lit at nine in the evening, and a building does not change its mind (a door or a plain
 * wall has a rank of 2, which no share reaches).
 *
 * Built at the size it is drawn at and never stretched afterwards (a stretched window is a different window), the way a roof is.
 *
 * The openings are those of its kind (see DecorFacade.openings): a house's, an old building's tall windows on storeys as high as it states, or a church's
 * bays, six metres apart in tiers of about ten, every other tier from the top (a tower is bare stone below its belfry), with no door and nothing lit.
 */
export class FacadeGeometry {
  /** A number from 0 up to 1 that is the same for the same two, and unlike the one beside it: which windows are lit does not change between two looks. */
  private static hash(seed: number, index: number): number {
    const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
    return value - Math.floor(value)
  }

  /** A church's bays and tiers. */
  private static readonly LANCET_BAY_M = 6
  private static readonly LANCET_TIER_M = 10

  static build(widthM: number, lengthM: number, heightM: number, openings = true, seed = 0, kind?: "tall" | "lancet", storeyM: number = FacadeTexture.FLOOR_M): BufferGeometry {
    const positions: number[] = []
    const uvs: number[] = []
    const ranks: number[] = []
    const halfWidth = widthM / 2
    const halfLength = lengthM / 2
    const lancet = kind === "lancet"
    const levels = Math.max(1, Math.round(heightM / (lancet ? FacadeGeometry.LANCET_TIER_M : Math.max(storeyM, 1))))
    const floor = heightM / levels
    const bayM = lancet ? FacadeGeometry.LANCET_BAY_M : FacadeTexture.BAY_M
    /** A face, given by where it starts and which way it runs (both on the ground plane) and its length: front is at -z and faces -z. */
    const face = (start: [number, number], direction: [number, number], length: number, front: boolean): void => {
      const bays = Math.max(1, Math.round(length / bayM))
      const bay = length / bays
      for (let level = 0; level < levels; level++) {
        for (let at = 0; at < bays; at++) {
          const door = front && level === 0 && at === Math.floor((bays - 1) / 2)
          const tile = !openings ? FacadeTexture.PLAIN
            : lancet ? ((levels - 1 - level) % 2 === 0 ? FacadeTexture.LANCET : FacadeTexture.PLAIN)
              : door ? FacadeTexture.GROUND_DOOR
                : kind === "tall" ? FacadeTexture.TALL
                  : level > 0 ? FacadeTexture.UPPER : FacadeTexture.GROUND_WINDOW
          // The window is lit when the share of the lit ones reaches its rank (see DecorSystem): a door, a plain wall, a church's glass are never.
          const rank = tile === FacadeTexture.UPPER || tile === FacadeTexture.GROUND_WINDOW || tile === FacadeTexture.TALL ? FacadeGeometry.hash(seed, positions.length) : 2
          for (let corner = 0; corner < 6; corner++) ranks.push(rank)
          const x0 = start[0] + direction[0] * bay * at
          const z0 = start[1] + direction[1] * bay * at
          const x1 = x0 + direction[0] * bay
          const z1 = z0 + direction[1] * bay
          const y0 = level * floor
          const y1 = y0 + floor
          const u0 = tile / FacadeTexture.TILES + 0.002
          const u1 = (tile + 1) / FacadeTexture.TILES - 0.002
          positions.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0)
          uvs.push(u0, 0.002, u1, 0.002, u1, 0.998, u0, 0.002, u1, 0.998, u0, 0.998)
        }
      }
    }
    // Counter-clockwise seen from outside: the direction along each face is the one that keeps the outside on the left of an eye above it.
    face([halfWidth, -halfLength], [-1, 0], widthM, true)
    face([-halfWidth, halfLength], [1, 0], widthM, false)
    face([-halfWidth, -halfLength], [0, 1], lengthM, false)
    face([halfWidth, halfLength], [0, -1], lengthM, false)
    // The top, at the height of the walls, plain.
    const plain = FacadeTexture.PLAIN / FacadeTexture.TILES + 0.01
    positions.push(-halfWidth, heightM, -halfLength, -halfWidth, heightM, halfLength, halfWidth, heightM, halfLength,
      -halfWidth, heightM, -halfLength, halfWidth, heightM, halfLength, halfWidth, heightM, -halfLength)
    for (let i = 0; i < 6; i++) { uvs.push(plain, 0.5); ranks.push(2) }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
    geometry.setAttribute("litRank", new Float32BufferAttribute(ranks, 1))
    geometry.computeVertexNormals()
    return geometry
  }
}
