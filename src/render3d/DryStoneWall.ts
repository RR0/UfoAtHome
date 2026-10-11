import { BoxGeometry, DataTexture, Group, LinearMipmapLinearFilter, LinearFilter, Mesh, MeshLambertMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace } from "three"
import type { DecorObject } from "../engine/model/Decor.js"

/**
 * A low dry-stone wall: a box at its own measurements, wrapped in stones that fit against one another.
 *
 * The recording says how long, how thick and how high it is, so it is built at that size rather than
 * stretched from a stock shape (see DecorSystem.scaleFor): a stretched shape would stretch its stones
 * too, and a wall of eighty metres read as a road for want of any joint in it. What makes a wall a wall is
 * the pattern, so the stones are a texture laid at their real size, about forty centimetres by twenty-five,
 * in courses whose joints do not line up, with a dark gap between each.
 */
export class DryStoneWall {
  /** The pattern repeats every this many metres, both ways. */
  private static readonly TILE_M = 2.4
  /** Stones across a tile, and courses up it: about 0.4 m wide and 0.24 m high. */
  private static readonly COLUMNS = 6
  private static readonly COURSES = 10
  private static readonly SIZE_PX = 256
  /** How far the wall is sunk below its foot, so that it stands on a sloping or uneven ground instead of hovering over it. */
  private static readonly FOUNDATION_M = 0.8
  private static pattern?: DataTexture

  static build(object: DecorObject): Group {
    const group = new Group()
    const width = object.sizeM?.widthM ?? 0.6
    const height = object.sizeM?.heightM ?? 1
    const length = object.sizeM?.lengthM ?? 10
    const depth = height + DryStoneWall.FOUNDATION_M
    const geometry = new BoxGeometry(width, depth, length)
    DryStoneWall.layStones(geometry, width, depth, length)
    const material = new MeshLambertMaterial({ map: DryStoneWall.texture() })
    const mesh = new Mesh(geometry, material)
    mesh.position.y = (height - DryStoneWall.FOUNDATION_M) / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { emissive: false }
    group.add(mesh)
    return group
  }

  /** Scales each face's texture coordinates to the real size of the face, so that a stone is a stone's size on every side and at every length. */
  private static layStones(geometry: BoxGeometry, width: number, depth: number, length: number): void {
    const uv = geometry.getAttribute("uv")
    // BoxGeometry's faces, four vertices each, in this order: +x, -x (u along the length, v up), +y, -y (u across, v along the length), +z, -z (u across, v up).
    const faces = [[length, depth], [length, depth], [width, length], [width, length], [width, depth], [width, depth]]
    faces.forEach(([u, v], face) => {
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * u / DryStoneWall.TILE_M, uv.getY(i) * v / DryStoneWall.TILE_M)
    })
    uv.needsUpdate = true
  }

  /** The stones, once for every wall. */
  static texture(): DataTexture {
    if (DryStoneWall.pattern) return DryStoneWall.pattern
    const size = DryStoneWall.SIZE_PX
    const data = new Uint8Array(size * size * 4)
    const seeds = DryStoneWall.seeds()
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size
        const v = y / size
        // The two nearest stones' centres: the gap is where they are about equally near.
        let nearest = Infinity
        let second = Infinity
        let stone = seeds[0]
        for (const seed of seeds) {
          for (let wrapX = -1; wrapX <= 1; wrapX++) {
            for (let wrapY = -1; wrapY <= 1; wrapY++) {
              // Stones are wider than they are high: the distance is measured in stone units.
              const dx = (u - (seed.x + wrapX)) * DryStoneWall.COLUMNS
              const dy = (v - (seed.y + wrapY)) * DryStoneWall.COURSES * 0.5
              // Mostly the larger of the two offsets, which makes a block with square corners rather than a round
              // pebble: a drylaid wall is courses of blocks, not a cobbled road.
              const d = 0.8 * Math.max(Math.abs(dx), Math.abs(dy)) + 0.2 * Math.hypot(dx, dy)
              if (d < nearest) {
                second = nearest
                nearest = d
                stone = seed
              } else if (d < second) second = d
            }
          }
        }
        const edge = second - nearest
        const gap = Math.min(edge / 0.1, 1)
        // The stone is rounded: darker towards its joint, a little lighter at its middle, with grain.
        const round = 0.8 + 0.2 * Math.min(edge / 0.5, 1)
        const grain = 0.94 + 0.12 * DryStoneWall.noise(x, y)
        const level = (0.15 + (stone.tone - 0.15) * gap) * (gap > 0.999 ? round * grain : 1)
        const offset = (y * size + x) * 4
        data[offset] = Math.round(255 * level * stone.warm)
        data[offset + 1] = Math.round(255 * level)
        data[offset + 2] = Math.round(255 * level * stone.cool)
        data[offset + 3] = 255
      }
    }
    const texture = new DataTexture(data, size, size, RGBAFormat)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.colorSpace = SRGBColorSpace
    texture.magFilter = LinearFilter
    texture.minFilter = LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    texture.needsUpdate = true
    DryStoneWall.pattern = texture
    return texture
  }

  /** One seed per stone, on a grid of courses whose every other row is shifted by half a stone, each jittered: a wall that is laid, not tiled. */
  private static seeds(): { x: number, y: number, tone: number, warm: number, cool: number }[] {
    let state = 20260831
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 4294967296
    }
    const seeds = []
    for (let course = 0; course < DryStoneWall.COURSES; course++) {
      for (let column = 0; column < DryStoneWall.COLUMNS; column++) {
        // Volcanic stone of the Cantal: grey to dark brown, a few paler.
        const tone = 0.34 + random() * 0.24
        seeds.push({
          x: (column + (course % 2) * 0.5 + 0.5 + (random() - 0.5) * 0.35) / DryStoneWall.COLUMNS,
          y: (course + 0.5 + (random() - 0.5) * 0.3) / DryStoneWall.COURSES,
          tone,
          warm: 1 + random() * 0.1,
          cool: 0.9 + random() * 0.1
        })
      }
    }
    return seeds
  }

  /** A deterministic value in [0, 1) for a pixel, for the grain. */
  private static noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }
}
