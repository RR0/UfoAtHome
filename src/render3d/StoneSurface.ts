import { DataTexture, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType, type BufferGeometry, Float32BufferAttribute } from "three"

/**
 * A surface paved with stone (see DecorRoof.material): square slabs, each a shade of its own, the grain of the stone in each, and the
 * joints between them. What tells a stone terrace from a painted board at a few metres, and what a lantern's light, grazing it from a
 * metre up, brings out.
 *
 * One tile of the pattern, laid at its real size: so many slabs a side, the texture repeated over the surface in metres (see layOn). Made
 * once, as numbers rather than on a canvas, so that it is the same everywhere it is drawn and needs no page to be made in. It is both the
 * colour, multiplying the surface's own, and the relief (its joints sunk, its grain rough).
 */
export class StoneSurface {
  /** The side of a slab, metres: a common paving stone's. */
  static readonly SLAB_M = 0.6
  /** Slabs a side in one tile of the pattern. */
  static readonly SLABS = 4
  /** Pixels a side of a tile: some five millimetres of stone each. */
  static readonly SIZE = 512
  /** The width of a joint, metres. */
  static readonly JOINT_M = 0.012

  private static made?: DataTexture

  /** The tile, made the first time it is asked for. */
  static texture(): DataTexture {
    if (StoneSurface.made) return StoneSurface.made
    const size = StoneSurface.SIZE
    const data = new Uint8Array(size * size * 4)
    let seed = 0x5a17
    const random = (): number => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const slabs = StoneSurface.SLABS
    const slabPx = size / slabs
    const jointPx = Math.max(1, Math.round(StoneSurface.JOINT_M / StoneSurface.SLAB_M * slabPx))
    // Each slab a shade of its own: quarried stone is never two pieces alike.
    const shades = Array.from({ length: slabs * slabs }, () => 0.9 + 0.1 * random())
    // A coarse mottling, a value noise on a grid of eight to a slab, smoothly interpolated, wrapping round the tile.
    const grid = slabs * 8
    const mottle = Array.from({ length: grid * grid }, () => random())
    const at = (gx: number, gy: number) => mottle[((gy % grid + grid) % grid) * grid + (gx % grid + grid) % grid]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sx = Math.floor(x / slabPx), sy = Math.floor(y / slabPx)
        const inX = x - sx * slabPx, inY = y - sy * slabPx
        const joint = inX < jointPx || inY < jointPx
        const fx = x / slabPx * 8, fy = y / slabPx * 8
        const ix = Math.floor(fx), iy = Math.floor(fy)
        const tx = fx - ix, ty = fy - iy
        const ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty)
        const smooth = (at(ix, iy) * (1 - ux) + at(ix + 1, iy) * ux) * (1 - uy) + (at(ix, iy + 1) * (1 - ux) + at(ix + 1, iy + 1) * ux) * uy
        // The grain: a speck to every pixel, some five millimetres of stone.
        const grain = random()
        const tone = joint ? 0.55 : shades[sy * slabs + sx] * (0.9 + 0.12 * smooth) * (0.88 + 0.12 * grain)
        const value = Math.min(255, Math.round(255 * tone))
        const i = (y * size + x) * 4
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = 255
      }
    }
    const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.minFilter = LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
    StoneSurface.made = texture
    return texture
  }

  /** Lays the pattern on a surface at its real size: each vertex's place seen from above, in tiles. */
  static layOn(geometry: BufferGeometry): void {
    const positions = geometry.getAttribute("position")
    const tileM = StoneSurface.SLAB_M * StoneSurface.SLABS
    const uv = new Float32Array(positions.count * 2)
    for (let i = 0; i < positions.count; i++) {
      uv[i * 2] = positions.getX(i) / tileM
      uv[i * 2 + 1] = positions.getZ(i) / tileM
    }
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2))
  }
}
