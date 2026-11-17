import { ShaderChunk } from "three"

/**
 * Keeps what a material writes within what the picture can hold: no more than BRIGHTEST, never less than nothing, never "not a number".
 *
 * The picture is drawn into half floats, whose largest value is 65 504. A material lit far past it (a smooth surface catching the Sun's own
 * glint) wrote infinity; the passes after it (the ghosts, the glow, the probe's blur) took that infinity into sums and differences and made
 * "not a number" of it, which shows black and spreads, and the probe, a photograph of the scene that the water then reflects, carried it
 * into the next photograph: on an iPhone, the gulls of Lorient went white at the bottom of the frame, then black, all of it, for good, even
 * paused or played back from the start (2026-11-17).
 *
 * Done in three's own chunk, once for the page, as the air is (see AerialFog.install): every lit material ends there. A GPU's clamp gives
 * a finite answer for "not a number" (it takes the other operand), which a test `x != x` would not do once a compiler assumed it never is.
 */
export class FiniteLight {
  /** The most a material writes, relative: under a half float's largest, as SceneRenderer.BRIGHTEST_RELATIVE. */
  static readonly BRIGHTEST = 60000

  private static installed = false

  static install(): void {
    if (FiniteLight.installed) return
    FiniteLight.installed = true
    ShaderChunk.opaque_fragment = `
      outgoingLight = clamp( outgoingLight, 0.0, ${FiniteLight.BRIGHTEST.toFixed(1)} );
      ${ShaderChunk.opaque_fragment}`
  }
}
