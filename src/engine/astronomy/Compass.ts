/**
 * A bearing said the way a witness would say it.
 *
 * "206 degrees" is a number nobody pictures; "to the south-south-west" is where they were looking.
 * Sixteen points rather than eight, because a shower's radiant lands between the cardinals as often
 * as on them, and rounding 206 to "south-west" moves it by a fifth of a right angle.
 */
const POINTS: Record<"en" | "fr", readonly string[]> = {
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  // O for ouest, not W — the compass sprites in the scene already use it (see SceneRenderer's own
  // COMPASS_LABELS), and a French page mixing the two would be worse than either.
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"]
}

export class Compass {
  /** How wide one of the sixteen points is. */
  static readonly POINT_DEG = 360 / 16

  /** The point `azimuthDeg` falls in, degrees clockwise from true north — the same convention as
   * ObserverPose.headingDeg and every other bearing in this project. Any angle is accepted,
   * negative or past a full turn, so a caller never has to normalise first. */
  static point(azimuthDeg: number, language: "en" | "fr"): string {
    const normalised = ((azimuthDeg % 360) + 360) % 360
    const index = Math.round(normalised / Compass.POINT_DEG) % 16
    return POINTS[language][index]
  }

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
   * decides: est and ouest elide, nord and sud do not. English has no such worry.
   */
  static towards(azimuthDeg: number, language: "en" | "fr"): string {
    const point = Compass.point(azimuthDeg, language)
    if (language === "en") return `to the ${point}`
    return ELIDING_POINTS.test(point) ? `à l'${point}` : `au ${point}`
  }
}

/** The French points whose spelled-out name begins with a vowel — those starting with E (est) or
 * O (ouest). Deliberately not a list of the four: it is the first letter that carries the rule, and
 * writing it that way keeps ENE and OSO right for the same reason E and O are. */
const ELIDING_POINTS = /^[EO]/
