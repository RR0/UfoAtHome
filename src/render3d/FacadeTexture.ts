import { ClampToEdgeWrapping, DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from "three"

/**
 * The picture the walls of a surveyed building are drawn with: one bay of a facade, three metres wide and one floor high, in six variants side
 * by side. It is drawn in the code and not taken from a photograph, so that it weighs nothing and belongs to nobody: a pale wall, a window with its frame, a
 * mullion and a sill, and a door; the tall French window of an old building, with its railing and the stone band of its storey; the tall narrow bay of a
 * church, pointed at the top.
 *
 * It is pale on purpose. The colour of a wall is the colour of the material it multiplies (see DecorFacade.color), so the window stays dark
 * and the wall takes the brick, the stone or the plaster it is; one picture serves every building of the scene, and one texture is one upload.
 */
export class FacadeTexture {
  /** The variants, left to right. */
  static readonly UPPER = 0
  static readonly GROUND_WINDOW = 1
  static readonly GROUND_DOOR = 2
  static readonly PLAIN = 3
  /** An old building's storey (see DecorFacade.openings): drawn for one of about three and a half metres, which it is stretched to. */
  static readonly TALL = 4
  /** A church's bay: drawn for one of six metres by ten, which it is stretched to. */
  static readonly LANCET = 5
  static readonly TILES = 6

  /** Where the glass of the tall window starts and ends, in the metres of the picture (a storey of three, stretched). */
  private static readonly TALL_SILL = 0.5
  private static readonly TALL_HEAD = 2.62

  /** One bay: a window every three metres, which is what a street of houses has. */
  static readonly BAY_M = 3
  static readonly FLOOR_M = 3

  private static readonly PIXELS = 96
  private static shared?: DataTexture
  private static sharedEmissive?: DataTexture

  /** The one texture of the page, made the first time it is asked for. */
  static texture(): DataTexture {
    if (!FacadeTexture.shared) {
      const texture = new DataTexture(FacadeTexture.pixels(), FacadeTexture.PIXELS * FacadeTexture.TILES, FacadeTexture.PIXELS, RGBAFormat, UnsignedByteType)
      texture.colorSpace = SRGBColorSpace
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = ClampToEdgeWrapping
      texture.magFilter = LinearFilter
      texture.minFilter = LinearMipmapLinearFilter
      texture.generateMipmaps = true
      texture.needsUpdate = true
      FacadeTexture.shared = texture
    }
    return FacadeTexture.shared
  }

  /**
   * What glows: the glass of the lit variants, the room behind it (see roomLight), and nothing else (black). The picture is read as sRGB, so a warm white is nearly white in it: a picture of the orange a lit window is called would be read as a deeper orange still, and look like a brown wall. Multiplied in the facade's shader by the luminance of a lit window
   * and the share of those lit, so a scene turns every lit window of every building on at once by raising one number (see DecorSystem.setLitWindowShare, setWindowLuminance).
   */
  static emissive(): DataTexture {
    if (!FacadeTexture.sharedEmissive) {
      const texture = new DataTexture(FacadeTexture.glow(), FacadeTexture.PIXELS * FacadeTexture.TILES, FacadeTexture.PIXELS, RGBAFormat, UnsignedByteType)
      texture.colorSpace = SRGBColorSpace
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = ClampToEdgeWrapping
      texture.magFilter = LinearFilter
      texture.minFilter = LinearMipmapLinearFilter
      texture.generateMipmaps = true
      texture.needsUpdate = true
      FacadeTexture.sharedEmissive = texture
    }
    return FacadeTexture.sharedEmissive
  }

  /** The glow as bytes: black, with the glass of each window tile (which of them glow is decided by the facade's own ranks: see FacadeGeometry). Exposed for tests. */
  static glow(): Uint8Array {
    const size = FacadeTexture.PIXELS
    const width = size * FacadeTexture.TILES
    const data = new Uint8Array(width * size * 4)
    for (let i = 3; i < data.length; i += 4) data[i] = 255
    const metre = size / FacadeTexture.BAY_M
    const glass = [[FacadeTexture.UPPER, 0.9, 2.3], [FacadeTexture.GROUND_WINDOW, 0.9, 2.3], [FacadeTexture.TALL, FacadeTexture.TALL_SILL, FacadeTexture.TALL_HEAD]]
    for (const [tile, bottom, top] of glass) {
      for (let y = Math.round(bottom * metre); y < Math.round(top * metre); y++) {
        for (let x = Math.round(0.9 * metre); x < Math.round(2.1 * metre); x++) {
          // The mullion stays dark: a lit window is two panes.
          if (Math.abs(x - 1.5 * metre) < 0.03 * metre) continue
          const at = (y * width + tile * size + x) * 4
          const [r, g, b] = FacadeTexture.roomLight((x / metre - 0.9) / 1.2, (y / metre - bottom) / (top - bottom))
          data[at] = r; data[at + 1] = g; data[at + 2] = b
        }
      }
    }
    return data
  }

  /**
   * What the glass of a lit window shows of the room behind it, at (u, v) across and up the glass from its bottom left (0 to 1): not a flat
   * rectangle of light but a room, its ceiling lit by the lamp and brightest, its light falling off towards the sill and the jambs, and a curtain
   * drawn a little on each side, through which it comes dimmer and warmer. Bytes of the sRGB picture, about grey: the colour is the shader's.
   */
  static roomLight(u: number, v: number): [number, number, number] {
    // The ceiling and the upper wall, lit from the lamp; the lower part of the room is in the shade of the sill and the furniture.
    const height = 0.35 + 0.65 * Math.pow(Math.max(0, Math.min(1, v)), 0.8)
    // The jambs: the room is seen at an angle there, and less of it.
    const across = 1 - 0.45 * Math.pow(Math.abs(2 * u - 1), 3)
    // The curtains, a sixth of the width on each side, the light through them a third and warmer.
    const curtain = Math.min(u, 1 - u) < 0.16
    const level = height * across * (curtain ? 0.35 : 1)
    // The colour is the room's lamp's, given by the facade's shader (see DecorSystem.ROOM_LIGHT_K): a curtain only warms it a little.
    const warm: [number, number, number] = curtain ? [255, 225, 195] : [255, 255, 255]
    // The picture is sRGB: its bytes are the light raised to the inverse of its gamma, about.
    const k = Math.pow(level, 1 / 2.2)
    return [Math.round(warm[0] * k), Math.round(warm[1] * k), Math.round(warm[2] * k)]
  }

  /** The picture as bytes, row after row from the bottom (so that the bottom of a tile is the floor). Exposed for tests. */
  static pixels(): Uint8Array {
    const size = FacadeTexture.PIXELS
    const width = size * FacadeTexture.TILES
    const data = new Uint8Array(width * size * 4).fill(255)
    const metre = size / FacadeTexture.BAY_M
    /** Fills a rectangle of one tile, given in metres from the tile's bottom left. */
    const fill = (tile: number, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]): void => {
      for (let y = Math.round(y0 * metre); y < Math.round(y1 * metre); y++) {
        for (let x = Math.round(x0 * metre); x < Math.round(x1 * metre); x++) {
          const at = (y * width + tile * size + x) * 4
          data[at] = rgb[0]; data[at + 1] = rgb[1]; data[at + 2] = rgb[2]; data[at + 3] = 255
        }
      }
    }
    const FRAME: [number, number, number] = [225, 225, 222]
    const GLASS: [number, number, number] = [34, 42, 54]
    const SILL: [number, number, number] = [200, 198, 192]
    for (const tile of [FacadeTexture.UPPER, FacadeTexture.GROUND_WINDOW]) {
      // A window 1.2 m wide and 1.4 m high, its sill a metre above the floor, in a frame of six centimetres, with a mullion down the middle.
      fill(tile, 0.9 - 0.06, 0.9 - 0.06, 2.1 + 0.06, 2.3 + 0.06, FRAME)
      fill(tile, 0.9, 0.9, 2.1, 2.3, GLASS)
      fill(tile, 1.5 - 0.02, 0.9, 1.5 + 0.02, 2.3, FRAME)
      fill(tile, 0.8, 0.84, 2.2, 0.9 - 0.06, SILL)
    }
    // A door a metre wide and two ten high, in a frame, in a dark paint.
    fill(FacadeTexture.GROUND_DOOR, 1 - 0.06, 0, 2 + 0.06, 2.1 + 0.06, FRAME)
    fill(FacadeTexture.GROUND_DOOR, 1, 0, 2, 2.1, [58, 62, 56])
    // The tall window of an old building: as high as two of a house's, from the floor of its storey nearly to its ceiling, its railing of iron across the
    // bottom, and the band of stone that marks each storey on the facade. Seen at a distance, it is what tells a street of 1870 from one of 1970.
    const IRON: [number, number, number] = [44, 44, 46]
    const tall = FacadeTexture.TALL
    fill(tall, 0, 0, 3, 0.09, [214, 210, 202])
    fill(tall, 0.9 - 0.08, FacadeTexture.TALL_SILL - 0.04, 2.1 + 0.08, FacadeTexture.TALL_HEAD + 0.1, FRAME)
    fill(tall, 0.9, FacadeTexture.TALL_SILL, 2.1, FacadeTexture.TALL_HEAD, GLASS)
    fill(tall, 1.5 - 0.02, FacadeTexture.TALL_SILL, 1.5 + 0.02, FacadeTexture.TALL_HEAD, FRAME)
    fill(tall, 0.82, FacadeTexture.TALL_SILL, 2.18, FacadeTexture.TALL_SILL + 0.05, IRON)
    fill(tall, 0.82, FacadeTexture.TALL_SILL + 0.38, 2.18, FacadeTexture.TALL_SILL + 0.43, IRON)
    for (let x = 0.86; x < 2.15; x += 0.13) fill(tall, x, FacadeTexture.TALL_SILL, x + 0.03, FacadeTexture.TALL_SILL + 0.4, IRON)
    // A church's bay, a fifth of its width and more than half its height, pointed at the top: stained glass is dark from outside by day.
    const lancet = FacadeTexture.LANCET
    const springing = 2.0
    const apex = 2.34
    fill(lancet, 1.2, 0.66, 1.8, springing, [40, 44, 54])
    for (let y = springing; y < apex; y += 1 / metre) {
      const half = 0.3 * Math.sqrt(1 - ((y - springing) / (apex - springing)) ** 2)
      fill(lancet, 1.5 - half, y, 1.5 + half, y + 1 / metre, [40, 44, 54])
    }
    return data
  }
}
