/**
 * How a vehicle's lights are set: a state a driver chooses, not a boolean.
 *
 * Not everybody puts their lights on, and not always as they should: a driver at dusk may have only the position lights, one who does not meet anyone has
 * the main beam, a van may be driven in the dark with nothing at all. A recording says which, and when it changes.
 *
 * - `off`: nothing.
 * - `position`: the small lights of the front, which show the vehicle and light nothing.
 * - `dipped`: the dipped beam (feux de croisement): it lights the road for some forty metres and is cut off at the horizon so as not to dazzle.
 * - `main`: the main beam (feux de route): far, wide, and dazzling to whoever faces it.
 * - `fog`: the fog lamps: a low, wide beam that keeps under the horizon.
 */
export type HeadlightMode = "off" | "position" | "dipped" | "main" | "fog"

/** A change of setting at a time, ms from the start of the recording. */
export interface HeadlightKeyframe {
  t: number
  mode: HeadlightMode
}

/** What a beam is, as the scene draws it: the intensity is of both lamps together, as the regulations state it, shared between the two lamps. */
export interface HeadlightBeam {
  /** The intensity along the axis of the beam, candela (both lamps together). */
  candela: number
  /** Half the opening of the cone, degrees. */
  halfAngleDeg: number
  /** How far the axis points under the horizontal, degrees. */
  pitchDeg: number
  /** How soft the edge of the cone is, 0 to 1 (a share of the cone). */
  penumbra: number
  /** The colour of the light, "#rrggbb". */
  color: string
}

export class Headlights {
  static readonly MODES: readonly HeadlightMode[] = ["off", "position", "dipped", "main", "fog"]

  /**
   * What the figures of the beams are multiplied by on their way to the scene. The eye of the scene adapts to the sky above it (see
   * ScatteredSky.adaptToSurroundings), not to the road its own lamps light, as a driver's does: with the dark sky's adaptation, a road lit by a beam of its
   * real intensity is a plain white pool. At this gain the lit road reads as it does to a driver, who is adapted to it. The shape of the beam and the ratios
   * between the settings are the real ones; when the adaptation takes the lit ground into account, this goes to 1.
   */
  static readonly DISPLAY_GAIN = 0.006

  /** How far each lamp's axis is turned in towards the other, degrees: the two beams cross far ahead of the vehicle. */
  static readonly TOE_IN_DEG = 0.6

  /** The Sun's altitude under which the lights of an observer's vehicle are on when the recording says nothing: the dusk, when a driver puts them on. */
  static readonly AUTO_BELOW_SUN_DEG = -1

  /**
   * The beams, from the regulations' figures and the usual ones of cars: a dipped beam peaks about 25 000 cd (a pair), a main beam about 120 000 cd (the
   * legal limit for a pair is 430 000), fog lamps a few thousand, and a position light is a few candela, which lights nothing worth drawing. The pitch of
   * the dipped beam is the 1% under the horizontal its cut-off is set at, and a little more for the middle of the lit area.
   */
  static readonly BEAMS: Readonly<Record<HeadlightMode, HeadlightBeam | undefined>> = {
    off: undefined,
    position: undefined,
    dipped: { candela: 25_000, halfAngleDeg: 24, pitchDeg: 2.5, penumbra: 1, color: "#fff2d8" },
    main: { candela: 120_000, halfAngleDeg: 14, pitchDeg: 0.4, penumbra: 0.85, color: "#fff6e6" },
    fog: { candela: 9_000, halfAngleDeg: 38, pitchDeg: 5, penumbra: 1, color: "#ffe9b0" }
  }

  static isMode(value: unknown): value is HeadlightMode {
    return typeof value === "string" && (Headlights.MODES as readonly string[]).includes(value)
  }

  /**
   * The setting at time t: the latest keyframe at or before t (the first one before any), or the stated one when there are none, hold-last as a lit
   * state is (see resolveDecorLitAt). Undefined where nothing is said.
   */
  static at<M extends string>(stated: M | undefined, keyframes: readonly { t: number, mode: M }[] | undefined, t: number): M | undefined {
    if (!keyframes || keyframes.length === 0) return stated
    let latest = keyframes[0]
    for (const keyframe of keyframes) {
      if (keyframe.t > t) break
      latest = keyframe
    }
    return latest.mode
  }

  /** What an observer's vehicle that is not told has: the dipped beam from the dusk on, none by day. */
  static auto(sunAltitudeDeg: number): HeadlightMode {
    return sunAltitudeDeg < Headlights.AUTO_BELOW_SUN_DEG ? "dipped" : "off"
  }

  /** Whether the lamps of the vehicle are lit at all (the heads show), as opposed to the ground being lit by them. */
  static lamps(mode: HeadlightMode): boolean {
    return mode !== "off"
  }
}
