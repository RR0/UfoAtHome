/**
 * A bearing said the way a observer would say it.
 *
 * "206 degrees" is a number nobody pictures; "to the south-south-west" is where they were looking.
 * Sixteen points rather than eight, because a shower's radiant lands between the cardinals as often
 * as on them, and rounding 206 to "south-west" moves it by a fifth of a right angle.
 */
const POINTS: readonly string[] = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]

/** What a language other than English needs to say a bearing — see SceneNames, which holds it. */
export interface CompassWording {
  /** The sixteen points, clockwise from north. */
  readonly compassPoints: readonly string[]
  /** A point with its preposition already on it. */
  towards(point: string): string
}

export class Compass {
  /** How wide one of the sixteen points is. */
  static readonly POINT_DEG = 360 / 16

  /** The point `azimuthDeg` falls in, degrees clockwise from true north — the same convention as
   * ObserverPose.headingDeg and every other bearing in this project. Any angle is accepted,
   * negative or past a full turn, so a caller never has to normalise first. `points` are the
   * reader's (O for ouest in French, since the compass sprites in the scene use it too, and a page
   * mixing the two would be worse than either), English when not given. */
  static point(azimuthDeg: number, points: readonly string[] = POINTS): string {
    const normalised = ((azimuthDeg % 360) + 360) % 360
    const index = Math.round(normalised / Compass.POINT_DEG) % 16
    return points[index]
  }

  /** The English points, clockwise from north. */
  static readonly POINTS = POINTS

  /**
   * "to the NW", "au NO", "à l'OSO" — the point with the preposition already on it.
   *
   * The preposition belongs here rather than in the message it lands in, because in French it
   * depends on the ANSWER and not on the sentence: an abbreviation is read as the words it stands
   * for, so NO is "au nord-ouest" and OSO is "à l'ouest-sud-ouest". A message template with a fixed
   * "au " in front of the placeholder cannot know which it is about to get, and produced "au OSO"
   * and "au ESE" — the kind of wart that makes a page read as machine output.
   *
   * The rule is the first word of what the letters stand for, so it is the leading letter that
   * decides: est and ouest elide, nord and sud do not (see SceneNames_fr). English has no such
   * worry, and is what is said without a `wording`.
   */
  static towards(azimuthDeg: number, wording?: CompassWording): string {
    if (!wording) return `to the ${Compass.point(azimuthDeg)}`
    return wording.towards(Compass.point(azimuthDeg, wording.compassPoints))
  }
}
