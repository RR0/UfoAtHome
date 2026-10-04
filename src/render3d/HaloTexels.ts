import { DataUtils } from "three"

/**
 * Turns a traced halo radiance into the texels the shader reads. Half-float rather than byte,
 * because a display spans three orders of magnitude between a sundog and the outer ring, and a byte
 * would band the faint end into steps.
 *
 * Its own class because two places do it: the effect itself, when it traces on the page's thread,
 * and the worker that traces for it (see HaloTraceWorker), so that the page is handed a finished
 * texture and has only to copy it.
 */
export class HaloTexels {

  /** RGB radiance, three floats a texel, into RGBA half-floats with an opaque alpha. */
  static fromRadiance(radiance: Float32Array, into: Uint16Array): void {
    const opaque = DataUtils.toHalfFloat(1)
    for (let texel = 0, at = 0; at < radiance.length; texel += 4, at += 3) {
      into[texel] = DataUtils.toHalfFloat(radiance[at])
      into[texel + 1] = DataUtils.toHalfFloat(radiance[at + 1])
      into[texel + 2] = DataUtils.toHalfFloat(radiance[at + 2])
      into[texel + 3] = opaque
    }
  }
}
