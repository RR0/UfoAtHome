import type { Assessment, AssessmentCriterion, Assessor } from "../Assessor.js"
import type { Sighting } from "../../model/Sighting.js"
import { computeBodyPosition, sightingTimeToDate } from "../../astronomy/CelestialPositions.js"

/**
 * The tags that stand for each thing Hynek's close-encounter tiers turn on.
 *
 * Read from tags and NOT from geometry, which is the honest limitation of doing this here. His
 * first tier is drawn at about 150 m, and this format stores no distance at all: a recording holds
 * angles, and metres come back only as inequalities the scene's own crossings imply (see
 * SizeEstimate), which needs a rendered scene rather than a file. So proximity is taken from what
 * the author tagged, an author's judgment rather than a measurement — and every criterion below
 * says which of the two it rested on.
 *
 * Stored in English like every tag (see SightingTags), and matched case-insensitively because the
 * classification codes among them are written as codes.
 */
const TAGS = {
  entities: ["occupants", "rr3", "contact", "paralysis"],
  traces: ["trace", "landing", "electromagnetic effect", "rr2"],
  close: ["close encounter", "rr1"],
  radar: ["radar"]
}

/** How far the Sun may be below the horizon and the sighting still count as made by daylight.
 * Civil twilight: the Sun is down, and there is still enough light to see a shape rather than a
 * light. Hynek's own split is between a thing seen AS a shape and a thing seen as a glow, and this
 * is the standard threshold for where that becomes possible. */
const DAYLIGHT_SUN_ALTITUDE_DEG = -6

/**
 * Classifies a recording the way J. Allen Hynek's own scheme does: what was seen, and how close.
 *
 * Six classes, in the order they take precedence — the close encounters outrank the distant
 * sightings, since a thing seen at fifty metres is not filed by whether it was daylight:
 *
 * - CE3, a close encounter with occupants or entities
 * - CE2, one leaving a physical effect: a trace, a burn, a stalled engine
 * - CE1, one close enough for detail and leaving nothing behind
 * - RV, a radar-visual: instrument and eye agreeing
 * - DD, a daylight disc: a shape, seen by daylight
 * - NL, a nocturnal light: a light, seen at night
 *
 * What this can and cannot do is worth stating plainly, because a classification that hides its
 * grounds is worse than none. Day or night it works out itself, from the Sun's real altitude at the
 * recording's own moment and place — the same astronomy the sky is drawn from, so the class agrees
 * with the render. Everything else it reads off the author's tags, since the format stores no
 * distance and no trace evidence. And with no date or no place it declines to choose between DD and
 * NL rather than guessing, which is the one thing an assessor must never do.
 */
export class HynekAssessor implements Assessor {

  /** The classification turns on what was seen and what it left, so a reader is sent to the
   * phenomenon and its tags rather than to the witness — see Assessor.about. */
  readonly about = "observation"

  async assess(sighting: Sighting): Promise<Assessment> {
    const tags = (sighting.event.tags ?? []).map(tag => tag.toLowerCase())
    const daylight = HynekAssessor.daylight(sighting)
    const criteria: AssessmentCriterion[] = [
      HynekAssessor.tagged("entities", tags, TAGS.entities),
      HynekAssessor.tagged("traces", tags, TAGS.traces),
      HynekAssessor.tagged("proximity", tags, TAGS.close),
      HynekAssessor.tagged("radar", tags, TAGS.radar),
      {
        id: "daylight",
        // Worked out rather than stated: nobody wrote "it was daylight", the Sun's altitude was
        // computed from the moment and the place this recording already carries.
        basis: daylight === undefined ? undefined : "derived",
        paths: daylight === undefined ? [] : ["time", "place"]
      }
    ]
    return { verdict: HynekAssessor.classify(criteria, daylight), criteria }
  }

  private static classify(criteria: AssessmentCriterion[], daylight: boolean | undefined): string | undefined {
    const has = (id: string): boolean => criteria.find(criterion => criterion.id === id)?.basis !== undefined
    if (has("entities")) return "ce3"
    if (has("traces")) return "ce2"
    if (has("proximity")) return "ce1"
    if (has("radar")) return "rv"
    // No date or no place: the scheme's remaining two classes differ by daylight alone, so there
    // is nothing to choose between and saying so is the answer.
    if (daylight === undefined) return undefined
    return daylight ? "dd" : "nl"
  }

  /** A criterion answered by the author's tags — "stated" because a tag is what the recording
   * asserts, whatever the author based it on. */
  private static tagged(id: string, tags: string[], wanted: string[]): AssessmentCriterion {
    const found = tags.filter(tag => wanted.includes(tag))
    return {
      id,
      basis: found.length > 0 ? "stated" : undefined,
      paths: found.map(tag => `tags.${tags.indexOf(tag)}`)
    }
  }

  /** Whether the Sun stood high enough for a shape to be seen as a shape, or undefined when the
   * recording does not say when or where — see DAYLIGHT_SUN_ALTITUDE_DEG. */
  private static daylight(sighting: Sighting): boolean | undefined {
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    if (!place || !time) {
      return undefined
    }
    const date = sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
    if (!date) {
      return undefined
    }
    const sun = computeBodyPosition("Sun", date, { lat: place.lat, lng: place.lng, elevationM: 0 })
    return sun.altitudeDeg > DAYLIGHT_SUN_ALTITUDE_DEG
  }
}
