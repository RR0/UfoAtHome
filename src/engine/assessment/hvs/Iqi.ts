import type { IqiGroup, IqiLevel } from "./HvsJson.js"
import type { SightingRecordingJson } from "../../persistence/sightingJson.js"
import { Provenance } from "../../persistence/Provenance.js"

/** One IQI group: how fully the file answers it, and whether the analyst said so or it is only suggested from the file. */
export interface IqiRating {
  group: IqiGroup
  level?: IqiLevel
  /** True when the level is read from the file rather than given by the analyst: a suggestion, to be confirmed. */
  suggested?: boolean
}

/**
 * The information quality index of Stéphane Baron's HVS protocol (after the CNEGU's): how fully a case's file answers five groups, the
 * date and time, the place, who the witnesses are, how many they are, and whether there was an enquiry.
 *
 * The analyst's rating is what counts. Where they give none, the date and time, the place and the enquiry are suggested from the
 * accounts, marked as suggested; who the witnesses are and how many are not, because a file says what it publishes, not what the
 * investigators knew (initials in a recording may stand for a witness well identified).
 */
export class Iqi {

  static readonly GROUPS: readonly IqiGroup[] = ["dateTime", "place", "identification", "witnesses", "enquiry"]

  /** What a level counts for in the sum: a complete answer one, a partial one half. */
  static readonly WEIGHT: Readonly<Record<IqiLevel, number>> = { complete: 1, partial: 0.5, absent: 0 }

  /**
   * @param declared The analyst's levels (see HvsJson.iqi).
   * @param accounts The case's accounts, as written.
   * @param interviewed Whether the case holds an interview of a witness.
   */
  static of(declared: Partial<Record<IqiGroup, IqiLevel>> | undefined, accounts: readonly SightingRecordingJson[], interviewed: boolean): IqiRating[] {
    const suggestions: Partial<Record<IqiGroup, IqiLevel>> = {
      dateTime: Iqi.dateTime(accounts),
      place: Iqi.place(accounts),
      enquiry: Iqi.enquiry(accounts, interviewed)
    }
    return Iqi.GROUPS.map(group => {
      const level = declared?.[group]
      if (level) return { group, level }
      const suggested = suggestions[group]
      return suggested ? { group, level: suggested, suggested: true } : { group }
    })
  }

  /** The sum of the levels rated, out of how many groups are. */
  static total(ratings: readonly IqiRating[]): { sum: number, of: number } {
    const rated = ratings.filter(rating => rating.level !== undefined)
    return { sum: rated.reduce((sum, rating) => sum + Iqi.WEIGHT[rating.level!], 0), of: rated.length }
  }

  /** Complete for a time to the minute that is not supposed, partial for a day or a supposed time, absent with no time. */
  private static dateTime(accounts: readonly SightingRecordingJson[]): IqiLevel | undefined {
    if (accounts.length === 0) return undefined
    const levels = accounts.map(json => {
      const { recording, provenance } = Provenance.strip(json)
      const time = recording.time
      if (typeof time !== "string" || time === "") return "absent"
      const toTheMinute = /T\d{2}:\d{2}/.test(time) && !/[?~%]/.test(time)
      return toTheMinute && !Provenance.free(provenance.at("time")) ? "complete" : "partial"
    })
    return Iqi.weakest(levels)
  }

  /** Complete for a position that is not supposed, partial for a supposed one or a name alone, absent with neither. */
  private static place(accounts: readonly SightingRecordingJson[]): IqiLevel | undefined {
    if (accounts.length === 0) return undefined
    const levels = accounts.map(json => {
      const { recording, provenance } = Provenance.strip(json)
      const location = recording.place?.locations?.[0]
      if (location && typeof location.lat === "number" && typeof location.lng === "number") {
        const free = Provenance.free(provenance.at("place.locations.0.lat")) || Provenance.free(provenance.at("place.locations.0.lng"))
        return free ? "partial" : "complete"
      }
      return recording.place?.name ? "partial" : "absent"
    })
    return Iqi.weakest(levels)
  }

  /**
   * Complete when a witness was interviewed, gone back to, or met for a time said; partial for an account taken first-hand once (on the
   * spot, in person, by telephone, by questionnaire or letter); absent for one known only from the press or online. Unsaid, no suggestion.
   */
  private static enquiry(accounts: readonly SightingRecordingJson[], interviewed: boolean): IqiLevel | undefined {
    if (interviewed) return "complete"
    const levels = accounts.map(json => {
      const account = Provenance.strip(json).recording.account
      if (!account) return undefined
      if (account.followedUp === true || (account.enquiryMinutes ?? 0) > 0) return "complete"
      if (account.source === "press" || account.source === "social-media") return "absent"
      return account.source ? "partial" : undefined
    }).filter((level): level is IqiLevel => level !== undefined)
    if (levels.length === 0) return undefined
    // The enquiry of a case is the best of its accounts': one witness questioned at length is an enquiry.
    return levels.includes("complete") ? "complete" : levels.includes("partial") ? "partial" : "absent"
  }

  private static weakest(levels: readonly IqiLevel[]): IqiLevel {
    return levels.includes("absent") ? "absent" : levels.includes("partial") ? "partial" : "complete"
  }
}
