import type { Assessment, Assessor } from "../Assessor.js"
import type { Sighting } from "../../model/Sighting.js"
import { computeBodyPosition, sightingTimeToDate } from "../../astronomy/CelestialPositions.js"
import { ShapeDistance } from "../../shape/ShapeDistance.js"

/** How far the Sun may be below the horizon and the sighting still count as made by daylight.
 * Civil twilight: the Sun is down, and there is still enough light to see a shape as a shape rather
 * than as a glow — which is exactly the distinction Hynek's last two classes turn on. */
const DAYLIGHT_SUN_ALTITUDE_DEG = -6

/** Hynek's own line between a close encounter and a distant sighting: about 500 feet. Under it a
 * witness sees a thing rather than a light, and optical misperception stops being the question. */
const CLOSE_ENCOUNTER_M = 150

/**
 * Classifies a recording the way J. Allen Hynek's own scheme does — as far as a recording can be
 * classified at all, which today is two of his six classes.
 *
 * The six, in the order they outrank each other: CE3 with entities, CE2 with a physical trace, CE1
 * close enough for detail, RV radar-visual, DD a daylight disc, NL a nocturnal light.
 *
 * Four of the six are decided here — CE3, CE1, DD and NL. It reads the DATA, and for the other two
 * the data has nowhere to say it at all:
 *
 * - A physical trace. Nothing in the model records one — there is no trace, no burn, no stalled
 *   engine among Decor, Timeline, Weather and the rest.
 * - Radar. No instrument in the registry is one, so no recording can state a radar-visual.
 *
 * An earlier version read all four off the recording's TAGS, which was wrong twice over: a tag is a
 * non-authoritative note that helps somebody search, never an assertion the file makes, and taking
 * one as a classification's ground would have this scheme conclude from a comment. So those four
 * criteria come back marked unsupported — a statement about the format, and one worth making,
 * rather than a silent absence.
 */
export class HynekAssessor implements Assessor {

  /** What it can decide turns on when and where the sighting happened, so a reader is sent to the
   * moment rather than to the witness — see Assessor.about. */
  readonly about = "temporal"

  async assess(sighting: Sighting): Promise<Assessment> {
    const daylight = HynekAssessor.daylight(sighting)
    // Beings the witness reported, placed in the scene — the account's own statement that there
    // were any, which is exactly what this tier turns on. A decor "witness" is a companion who was
    // there and does not count: same silhouette, opposite claim (see DecorKind's "entity").
    const entities = sighting.decor
      .map((object, index) => ({ object, index }))
      .filter(({ object }) => object.kind === "entity")
    const nearestM = HynekAssessor.nearest(sighting)
    const close = nearestM !== undefined && nearestM <= CLOSE_ENCOUNTER_M
    return {
      verdict: entities.length > 0
        ? "ce3"
        : close
          ? "ce1"
          : daylight === undefined ? undefined : daylight ? "dd" : "nl",
      criteria: [
        {
          id: "entities",
          // Stated: a being placed in the scene is the recording asserting one was seen.
          basis: entities.length > 0 ? "stated" : undefined,
          paths: entities.map(({ index }) => `decor.${index}`)
        },
        // Marked unsupported and not merely unanswered: an author cannot fill these in, because
        // there is nowhere in the format to put them. See the class comment for each.
        { id: "traces", paths: [], unsupported: true },
        {
          id: "proximity",
          // Derived and never stated: no witness measured a distance, and this one comes out of
          // their own walk against the object's growing apparent size (see ShapeDistance), on an
          // assumption about the object holding still that nothing in the file can confirm.
          basis: nearestM === undefined ? undefined : "derived",
          paths: nearestM === undefined ? [] : ["timeline", "witnessTrack"]
        },
        { id: "radar", paths: [], unsupported: true },
        {
          id: "daylight",
          // Worked out, never stated: nobody writes "it was daylight" into a recording. The Sun's
          // altitude comes from the moment and the place the file already carries, through the
          // same astronomy the sky is drawn from — so the class agrees with the render.
          basis: daylight === undefined ? undefined : "derived",
          paths: daylight === undefined ? [] : ["time", "place"]
        }
      ]
    }
  }

  /** How close the nearest shape ever came, metres, or undefined when nothing in the recording
   * establishes a distance at all — which is the common case and the correct answer for it. */
  private static nearest(sighting: Sighting): number | undefined {
    const distances = sighting.timeline.sourceIds
      .map(sourceId => ShapeDistance.of(sighting, sourceId)?.nearestM)
      .filter((m): m is number => m !== undefined)
    return distances.length > 0 ? Math.min(...distances) : undefined
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
    return computeBodyPosition("Sun", date, { lat: place.lat, lng: place.lng, elevationM: 0 })
      .altitudeDeg > DAYLIGHT_SUN_ALTITUDE_DEG
  }
}
