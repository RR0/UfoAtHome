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
}
