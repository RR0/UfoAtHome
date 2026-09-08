import type { Assessment, AssessmentCriterion, Assessor } from "../Assessor.js"
import type { Sighting } from "../../model/Sighting.js"
import type { Basis } from "../../persistence/Provenance.js"
import { plainSightingJson } from "../../persistence/sightingJson.js"

/** One question, and where in a recording an answer to it would be written. `*` matches one step,
 * which is how a pattern reaches through the keyframes and the shapes inside them. */
interface Question {
  id: string
  paths: string[]
}

/**
 * What a reconstruction has to settle before it can be replayed at all.
 *
 * A FIXED list, and that is the whole point of it. Counting a recording's own fields measures how
 * finely they happen to be cut — a moment written as year, month, day, hour and a raw string is
 * five values and one fact — and it moves when nothing about the sighting has changed. These ten
 * questions do not move, so two recordings can be held against each other, and the profile means
 * the same thing next year.
 *
 * They are the format's own questions rather than an institution's: each is here because the
 * renderer, the astronomy or the player cannot proceed without an answer, which is a criterion
 * anyone can check against the code. A scheme published by somebody else is a different assessor,
 * with its own entry in the registry and its own credit.
 */
const QUESTIONS: Question[] = [
  { id: "when", paths: ["time.year", "time.month", "time.day", "time.hour", "time.minute", "time.raw"] },
  { id: "where", paths: ["place.*.lat", "place.*.lng", "witnessTrack.keyframes.*.pose.lat", "witnessTrack.keyframes.*.pose.lng"] },
  { id: "facing", paths: ["witnessTrack.keyframes.*.pose.headingDeg"] },
  { id: "apparent-size", paths: ["timeline.keyframes.*.shapes.*.shape.angular.widthDeg", "timeline.keyframes.*.shapes.*.shape.angular.heightDeg"] },
  { id: "sky-position", paths: ["timeline.keyframes.*.shapes.*.shape.aim.azimuthDeg", "timeline.keyframes.*.shapes.*.shape.aim.altitudeDeg"] },
  { id: "how-long", paths: ["durationSeconds", "endTime.hour", "endTime.minute", "endTime.raw"] },
  { id: "appearance", paths: ["timeline.keyframes.*.shapes.*.shape.kind", "timeline.keyframes.*.shapes.*.shape.title", "timeline.keyframes.*.shapes.*.shape.color", "timeline.keyframes.*.shapes.*.shape.brightness"] },
  { id: "movement", paths: ["timeline.keyframes.1.t", "witnessTrack.keyframes.1.t"] },
  { id: "sound", paths: ["soundTrack.keyframes.*.sound.kind"] },
  { id: "conditions", paths: ["weatherTrack.keyframes.*.weather.*", "weather.*"] }
]

/** Weakest first: an answer is worth no more than the least of what holds it up. */
const WEAKEST_FIRST: Basis[] = ["assumed", "derived", "stated"]

/**
 * Says how much of a reconstruction the account actually settles, and how much of it was worked out
 * or guessed.
 *
 * Not a reliability score, and the distinction is not pedantry: a witness may be impeccable and
 * their account still fail to pin down a single angle. What this measures is the RECORD's power to
 * constrain, which is the axis an investigator is on when they set aside a case for lack of
 * information rather than for lack of an explanation.
 *
 * The figure it reports is the share of those ten the WITNESS themselves answered, which is what
 * the whole exercise was for. It is a share of a fixed denominator and so comparable between
 * recordings — the thing a count of claims could never be, since that moves with how finely the
 * fields happen to be cut. It is still not the finding: a reader who needs to know WHICH questions
 * went unanswered reads the criteria, and the profile "the moment and the place are the witness's
 * own, nothing about the sky is" is not the same recording as its opposite even at the same
 * percentage.
 */
export class CoverageAssessor implements Assessor {

  /** What it measures is how much of the reconstruction came from the person who was there, so the
   * witness is where a reader is sent to act on it — see Assessor.about. */
  readonly about = "witness"

  async assess(sighting: Sighting): Promise<Assessment> {
    // The values without their wrappers, and the provenance separately: this walks paths, and a
    // wrapped value would put a `.value` step in the middle of every one of them.
    const recording = plainSightingJson(sighting) as unknown as Record<string, unknown>
    const criteria = QUESTIONS.map(question => CoverageAssessor.answer(question, recording, sighting))
    return {
      score: criteria.filter(criterion => criterion.basis === "stated").length / criteria.length,
      criteria
    }
  }

  private static answer(
    question: Question, recording: Record<string, unknown>, sighting: Sighting
  ): AssessmentCriterion {
    const paths = question.paths.flatMap(pattern => CoverageAssessor.resolve(pattern, recording))
    if (paths.length === 0) {
      return { id: question.id, paths: [] }
    }
    const bases = paths.map(path => sighting.provenance.at(path)?.basis ?? "stated")
    return {
      id: question.id,
      basis: WEAKEST_FIRST.find(basis => bases.includes(basis)),
      paths
    }
  }

  /** Every concrete path the pattern matches AND the recording actually has a value at. A pattern
   * matching nothing is not a failure: it is the recording saying nothing on that point, which is
   * exactly what this exists to notice. */
  private static resolve(pattern: string, recording: Record<string, unknown>): string[] {
    let found: { path: string[], value: unknown }[] = [{ path: [], value: recording }]
    for (const step of pattern.split(".")) {
      found = found.flatMap(({ path, value }) => {
        if (typeof value !== "object" || value === null) {
          return []
        }
        if (step !== "*") {
          const held = (value as Record<string, unknown>)[step]
          return held === undefined ? [] : [{ path: [...path, step], value: held }]
        }
        return Object.entries(value)
          .filter(([, held]) => held !== undefined)
          .map(([key, held]) => ({ path: [...path, key], value: held }))
      })
    }
    // An empty array or an empty string answers nothing, the same as an absent field: "tags": []
    // is not a recording that stated its tags.
    return found
      .filter(({ value }) => value !== null && value !== "" && !(Array.isArray(value) && value.length === 0))
      .map(({ path }) => path.join("."))
  }
}
