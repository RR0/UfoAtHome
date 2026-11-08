/** One speck of dust on a frame: where, as a share of the picture from its bottom left; how wide, as a share of its height; how much light it lets by. */
export interface FilmSpeck {
  u: number
  v: number
  radius: number
  kept: number
}

/** What a frame of a print looks like beside the picture it holds: how it sits in the gate, what is on it. */
export interface FilmFrame {
  /** How far the frame sits off in the gate, as shares of the picture's width and height. */
  weave: [number, number]
  specks: FilmSpeck[]
  /** What the grain of this frame is drawn from, 0 to 1. */
  seed: number
}

/**
 * What a film becomes on its way to a reader: not the negative, but a print of it, often copied, sometimes through television. All of it
 * is a fact about the copy and none about the scene, which is why it belongs to the medium: an orb on this picture is one thing and a speck on
 * its print another, and telling them apart is what laying a film over a reconstruction is for.
 *
 * Each frame is its own: a speck is there for one frame and the gate holds each frame a little differently. So each is drawn from the number of
 * the frame alone, and a frame comes out the same played, paused or sought to.
 */
export interface FilmPrint {
  /** Frames a second it was shot at. */
  framesPerSecond: number
  /** How much the print stretches the tones about a middle grey, in the picture as shown: 1 leaves them. */
  contrast: number
  /** The colour it leaves, per channel, in the picture as shown. */
  tint: [number, number, number]
  /** How soft it is: the spread of what was a sharp edge, as a share of the picture's height. */
  softness: number
  /** How many specks of dust a frame carries, on average. */
  specksPerFrame: number
  /** How wide a typical one is, and the widest, as shares of the picture's height. */
  speckRadius: number
  speckRadiusMax: number
  /** How far a frame sits off in the gate, root mean square, as shares of the picture's width and height. */
  weave: [number, number]
  /** How strong the grain is, root mean square, on the picture as shown, 0 to 1. */
  grain: number
}

export class FilmPrints {
  /** The most specks a frame is drawn with: past this they would be for a much dirtier print than any measured. */
  static readonly MAX_SPECKS = 4

  /**
   * A 35 mm film of the 1970s as television shows it. MEASURED on the British Airways Concorde film of the 1970s as TLC broadcast it, at 480
   * lines: a sharp edge rises over 4 lines (a spread of 1.6), 1.15 dark specks a frame of some 8 pixels (half of them), up to 63, and a frame
   * jumps 0.6 lines and 0.25 columns. Contrast and tint fitted on the same film against a sunny-day exposure.
   * ASSUMED: the grain. That copy's own was lost on the way (the compression leaves 0.5 of 255), and a print shows about this much.
   */
  static readonly BROADCAST_35MM: FilmPrint = {
    framesPerSecond: 24,
    contrast: 1.6,
    tint: [0.99, 0.98, 0.92],
    softness: 1.6 / 480,
    specksPerFrame: 1.15,
    speckRadius: 1.6 / 480,
    speckRadiusMax: 4.5 / 480,
    weave: [0.25 / 640, 0.6 / 480],
    grain: 0.008
  }

  /** A number from 0 to 1 that depends on nothing but its two arguments. */
  private static hash(a: number, b: number): number {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return x - Math.floor(x)
  }

  /** The number of the frame at `t` milliseconds of the timeline. */
  static frameAt(print: FilmPrint, t: number): number {
    return Math.floor(t * print.framesPerSecond / 1000)
  }

  /** The frame numbered `frame` of this print. */
  static frame(print: FilmPrint, frame: number): FilmFrame {
    const hash = (slot: number) => FilmPrints.hash(frame, slot)
    // A sum of uniforms, nearly a normal law: 3 of them give a spread of 1/2, so that doubled it has the spread stated.
    const normal = (slot: number) => (hash(slot) + hash(slot + 1) + hash(slot + 2) - 1.5) * 2
    const share = Math.min(1, print.specksPerFrame / FilmPrints.MAX_SPECKS)
    const specks: FilmSpeck[] = []
    for (let i = 0; i < FilmPrints.MAX_SPECKS; i++) {
      const slot = 10 + i * 6
      if (hash(slot) >= share) continue
      // Most are small, a few a good deal wider, as measured.
      const wide = hash(slot + 3) ** 3
      specks.push({
        u: hash(slot + 1),
        v: hash(slot + 2),
        radius: print.speckRadius * 0.6 + wide * (print.speckRadiusMax - print.speckRadius * 0.6),
        kept: 0.25 + 0.4 * hash(slot + 4)
      })
    }
    return { weave: [normal(1) * print.weave[0], normal(4) * print.weave[1]], specks, seed: hash(7) }
  }
}
