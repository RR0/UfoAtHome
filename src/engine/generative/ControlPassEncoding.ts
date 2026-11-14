/**
 * How the control passes of a reconstruction (see ControlPasses) are written for a video generator: the depth as grey levels, the
 * phenomenon's mask grown by a margin. One encoding, for the kit a reader downloads (see GenerativeKit) and for the script that exports
 * the same material (scripts/generative-assets), so that both say the same thing.
 */
export class ControlPassEncoding {
  /**
   * The range of distances the depth's grey levels span, metres, the same for every frame and every recording: a range fitted to each frame
   * would make the depth flicker as something comes near, and one fitted to each film would make two films disagree.
   */
  static readonly DEPTH_NEAR_M = 1
  static readonly DEPTH_FAR_M = 20000
  /** How far the phenomenon's mask is grown, pixels: the slack a generated phenomenon is checked against, its edge blurred or grained a little. */
  static readonly MASK_MARGIN_PX = 4

  /**
   * The grey level (0 to 1) of a pixel `distanceM` away: 1 at DEPTH_NEAR_M or nearer, 0 at DEPTH_FAR_M or further and for the sky (0 or less).
   * On a logarithmic scale, not the inverse distance most depth estimators give: the inverse put a wood's edge 500 m away at 1 % of the
   * range, black, where a generator has to see it to keep the horizon where it is.
   */
  static depthLevel(distanceM: number): number {
    if (!(distanceM > 0)) return 0
    const level = 1 - Math.log(distanceM / ControlPassEncoding.DEPTH_NEAR_M) / Math.log(ControlPassEncoding.DEPTH_FAR_M / ControlPassEncoding.DEPTH_NEAR_M)
    return Math.min(1, Math.max(0, level))
  }

  /** `from` (non-zero = in the mask) grown by `radius` pixels (a square), into `into` as 0 or 255. */
  static dilate(from: Uint8Array, into: Uint8Array, width: number, height: number, radius = ControlPassEncoding.MASK_MARGIN_PX): void {
    const rows = new Uint8Array(from.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let on = 0
        for (let dx = -radius; dx <= radius && !on; dx++) {
          const column = x + dx
          if (column >= 0 && column < width && from[y * width + column]) on = 255
        }
        rows[y * width + x] = on
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let on = 0
        for (let dy = -radius; dy <= radius && !on; dy++) {
          const row = y + dy
          if (row >= 0 && row < height && rows[row * width + x]) on = 255
        }
        into[y * width + x] = on
      }
    }
  }
}
