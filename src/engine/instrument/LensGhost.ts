import type { Instrument } from "./Instrument.js"

/**
 * One ghost of a lens: the light that bounced between two of its surfaces (or off the sensor and back) on its way through, and lands out of
 * place as a fainter, out-of-focus copy of the picture.
 *
 * Every bright light of the picture has one, and they all obey the same geometry: a ghost lies on the line from the picture's centre through
 * the light, at `scale` times the light's distance from the centre — on the other side when `scale` is negative. That is what tells a ghost
 * from a light in a photograph or a video: the red disc mirrored across the frame from the traffic light, moving the other way when the phone
 * turns, which an observer filming a street at night may take for a second, silent red object.
 *
 * It is not drawn for an eye. The eye's own glare is the scene's veils (see Veil); ghosts are what glass and a sensor add, so they belong to
 * an instrument that records the picture.
 */
export interface LensGhost {
  /** Where it lies, as a multiple of the light's offset from the picture's centre: −1 is mirrored through the centre. */
  scale: number
  /** The share of the light's flux it carries: the two reflections it took, a fraction of a per cent each on coated glass. */
  share: number
  /** How out of focus it is: the radius of the disc a point light becomes, as a share of the picture's height. */
  blur: number
  /** The colour its reflections leave it, per channel, 1 when absent: an anti-reflection coating reflects some wavelengths more than
   * others, which is why a white light's ghosts come out green or magenta. */
  tint?: [number, number, number]
}

export class LensGhosts {

  /**
   * A phone: few elements, but a sensor and its cover glass close behind them, which send back a ghost mirrored through the centre, small
   * and nearly sharp — the familiar dot opposite every streetlight in a phone's night video, in the light's own colour. Two fainter, wider
   * ones from the lens itself. The shares are ASSUMED (no measurement was found): set so that the mirrored ghost of a saturated traffic light
   * shows plainly, as it does in such videos, while that of a moderately bright light does not.
   */
  static readonly PHONE: readonly LensGhost[] = [
    { scale: -1, share: 2e-3, blur: 0.006 },
    { scale: -0.45, share: 2e-4, blur: 0.02, tint: [0.7, 1, 0.8] },
    { scale: 0.55, share: 1.5e-4, blur: 0.035, tint: [1, 0.75, 1] }
  ]

  /**
   * A camera's lens: a dozen coated surfaces, so a string of ghosts along the line through the centre, each fainter and wider than a phone's
   * main one, tinted by the coatings. ASSUMED, after the look of photographs of streetlights through such lenses.
   */
  static readonly CAMERA: readonly LensGhost[] = [
    { scale: -1.4, share: 3e-4, blur: 0.045, tint: [1, 0.8, 1] },
    { scale: -0.8, share: 4e-4, blur: 0.02, tint: [0.75, 1, 0.8] },
    { scale: -0.35, share: 2.5e-4, blur: 0.012, tint: [1, 0.9, 0.7] },
    { scale: 0.3, share: 2e-4, blur: 0.03, tint: [0.8, 0.9, 1] },
    { scale: 0.65, share: 1.5e-4, blur: 0.06, tint: [1, 0.85, 1] }
  ]

  /** The ghosts of an instrument: its own when it states them, else its kind's, and none for what records no picture (an eye, binoculars). */
  static of(instrument: Pick<Instrument, "category" | "medium" | "ghosts">): readonly LensGhost[] {
    if (instrument.ghosts) return instrument.ghosts
    if (!instrument.medium) return []
    return instrument.category === "phone" ? LensGhosts.PHONE : LensGhosts.CAMERA
  }

  /**
   * Where the ghost of a light at `point` lands, in the picture's own coordinates (the centre at 0, as normalised device coordinates are):
   * what the drawing does for every pixel, stated for one.
   */
  static positionOf(ghost: LensGhost, point: { x: number, y: number }): { x: number, y: number } {
    return { x: point.x * ghost.scale, y: point.y * ghost.scale }
  }
}
