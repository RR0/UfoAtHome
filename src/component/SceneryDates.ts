import type { DecorObject } from "../engine/model/Decor.js"
import type { SightingTime } from "../engine/model/Sighting.js"

/**
 * When the scenery of a recording is from, against when the observation was.
 *
 * A survey is of the day it was made, and what it brings (trees, buildings, lamps) is that day's world: for an observation made before that day, it is a
 * suggestion, not a fact (the tree may be younger than the observer, the house not built). The editor says so, wherever the two dates are known.
 */
export class SceneryDates {
  /** The newest day (YYYY-MM-DD) any object taken from a survey says it was surveyed on, and what that object came from. */
  static newestSurvey(decor: readonly DecorObject[]): string | undefined {
    return decor.filter(object => object.origin !== undefined).map(object => object.surveyedOn).filter((day): day is string => day !== undefined).sort().at(-1)
  }

  /**
   * The latest day the observation can have been made on, as YYYY-MM-DD: the day, if it is stated, else the end of its month or of its year, so that an
   * observation known to the month is never said to be earlier than a survey of that same month. Undefined where no year is given.
   */
  static latestObservationDay(time: SightingTime | undefined): string | undefined {
    if (!time?.year) return undefined
    const month = time.month ?? 12
    const day = time.day ?? new Date(Date.UTC(time.year, month, 0)).getUTCDate()
    return `${String(time.year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  /** The newest survey day if it is later than the latest the observation can be, else nothing: the date to warn of. */
  static anachronism(decor: readonly DecorObject[], time: SightingTime | undefined): { survey: string, observation: string } | undefined {
    const survey = SceneryDates.newestSurvey(decor)
    const observation = SceneryDates.latestObservationDay(time)
    return survey && observation && survey > observation ? { survey, observation } : undefined
  }
}
