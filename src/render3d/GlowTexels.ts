import { DataUtils } from "three"
import { NightSkyBrightness } from "../engine/atmosphere/NightSkyBrightness.js"
import type { SkyBrightnessMap } from "../engine/astronomy/SurfaceBrightness.js"

/**
 * Turns a finished Milky Way or zodiacal light map into the texels the shader reads, in the sky's own
 * unit — nanolamberts rather than S10, so that the shader divides one brightness by another of the
 * same kind and gets a plain ratio, the contrast, with no conversion left in it. Half-float rather
 * than byte because the zodiacal cone spans two orders of magnitude between its foot and the
 * anti-solar sky, and a byte would band the faint end into steps.
 *
 * Its own class because the walk that produces the maps now runs in a worker (see TraceWorker), which
 * hands back finished texels, and the page's own thread still does it where there is no worker.
 */
export class GlowTexels {

  /** The largest finite half float. The brightest texels of the Milky Way map come out above it in
   * nanolamberts, and DataUtils.toHalfFloat clamps them itself — after a console warning per texel,
   * which is what a reader's console filled with on every night sky. Clamped here, to the same value,
   * silently. */
  private static readonly HALF_FLOAT_MAX = 65504

  static fromMap(map: SkyBrightnessMap, into: Uint16Array): void {
    const opaque = DataUtils.toHalfFloat(1)
    for (let at = 0; at < map.data.length; at++) {
      into[at * 4] = DataUtils.toHalfFloat(Math.min(GlowTexels.HALF_FLOAT_MAX, NightSkyBrightness.nanolambertsOfS10(map.data[at])))
      into[at * 4 + 3] = opaque
    }
  }
}
