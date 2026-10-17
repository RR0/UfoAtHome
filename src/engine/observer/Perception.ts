/**
 * How the observer's own vision changes what reaches their mind, as the finish of a picture can
 * apply it: a recolouring of the linear light, and how much of the scene's contrast survives.
 *
 * Only what a finish can do from a pixel's own colour is here. Blur, double vision and a narrowed
 * field would each need a pass of their own, and none has been put on the page by a source that
 * gives their size (see the providers): this holds what the literature quantifies and the picture
 * can show, and no more.
 */
export interface Perception {
  /** A 3x3 matrix, row-major, on LINEAR RGB (so before any display encoding): identity for a
   * typical trichromat. */
  colorMatrix: readonly number[]
  /** The share of the picture's contrast the observer keeps, 1 for everyone, below 1 for a vision
   * that lowers contrast sensitivity. Applied to lightness about its middle. */
  contrastGain: number
}

export class Perceptions {
  static readonly IDENTITY: readonly number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1]

  /** What nobody's vision is bent by. */
  static readonly NONE: Perception = { colorMatrix: Perceptions.IDENTITY, contrastGain: 1 }

  /** Both effects at once: the recolourings are multiplied (the second acts on the first's
   * result), the contrasts too. */
  static combine(a: Perception, b: Perception): Perception {
    const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a.colorMatrix
    const [b0, b1, b2, b3, b4, b5, b6, b7, b8] = b.colorMatrix
    // b · a, since `a` is applied first.
    const colorMatrix = [
      b0 * a0 + b1 * a3 + b2 * a6, b0 * a1 + b1 * a4 + b2 * a7, b0 * a2 + b1 * a5 + b2 * a8,
      b3 * a0 + b4 * a3 + b5 * a6, b3 * a1 + b4 * a4 + b5 * a7, b3 * a2 + b4 * a5 + b5 * a8,
      b6 * a0 + b7 * a3 + b8 * a6, b6 * a1 + b7 * a4 + b8 * a7, b6 * a2 + b7 * a5 + b8 * a8
    ]
    return { colorMatrix, contrastGain: a.contrastGain * b.contrastGain }
  }

  /** Whether this changes nothing, which lets the renderer keep its plain path. */
  static isNone(perception: Perception): boolean {
    return perception.contrastGain === 1 && perception.colorMatrix.every((value, i) => value === Perceptions.IDENTITY[i])
  }
}
