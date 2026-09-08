import type { Sighting } from "../engine/model/Sighting.js"
import type { Assessment } from "../engine/assessment/Assessor.js"
import { ASSESSMENT_SOURCES } from "../engine/assessment/assessmentSources.js"
import type { SummaryEntry } from "./SightingSummary.js"
import type { SightingLabels } from "./messages/SightingLabels.js"

/** What every registered assessor made of one recording, as the strip shows it. */
export interface AssessmentReading {
  /** One entry per assessor that reached something, in registry order. */
  entries: SummaryEntry[]
  /**
   * The criteria nothing in the recording answers, by their own ids — what an editor marks on the
   * fields that would answer them. A player has no fields and ignores this; it is here because it
   * falls out of the same pass, and running the assessors twice to get it would be absurd.
   */
  unanswered: Set<string>
}

/**
 * Every assessor's reading of a recording, turned into the chips that state it.
 *
 * Shared by the player and the editor because an assessment is a fact about the OBSERVATION, not
 * about the act of editing one: "RR1 — rencontre rapprochée" is as true under a published account
 * as it is in a form. It lived in the editor first, which made it invisible to every reader on
 * rr0.org — the sighting they open is the player, and the player knew nothing of assessors.
 *
 * One chip per assessor and not per criterion: a reader glances at what each SCHEME concluded, and
 * the detail belongs behind it. For a scheme that measures rather than classifies, that headline is
 * its score as a percentage; what a figure cannot say — WHICH questions went unanswered — is said
 * by the marks an editor lays on the fields that would answer them.
 */
export class SightingAssessments {
  /** Named from `labels`, which both components share, for the same reason a tag is: an assessor
   * states ids ("coverage", "ce1") and the reader's own language names them (see SightingTags). */
  constructor(private readonly labels: SightingLabels) {
  }

  async read(sighting: Sighting): Promise<AssessmentReading> {
    const entries: SummaryEntry[] = []
    const unanswered = new Set<string>()
    for (const source of ASSESSMENT_SOURCES) {
      let assessment: Assessment
      try {
        assessment = await source.create().assess(sighting)
      } catch {
        // An assessor that cannot answer says nothing rather than breaking the strip: it is a
        // reading of the recording, and a reading failing is not the recording failing.
        continue
      }
      for (const criterion of assessment.criteria) {
        // Unsupported is not unanswered: there is no field to mark, because the format has nowhere
        // to say it (see AssessmentCriterion.unsupported). Marking one would send a reader to fill
        // in something they cannot.
        if (criterion.basis === undefined && !criterion.unsupported) unanswered.add(criterion.id)
      }
      // A percentage, and nothing else: a chip is one line, and half its value is the shape of it
      // (see the strip's own CSS).
      const value = assessment.score === undefined
        ? assessment.verdict === undefined ? "" : this.verdictName(source.id, assessment.verdict)
        : `${Math.round(assessment.score * 100)}%`
      if (value === "") continue
      entries.push({
        group: "assessment",
        field: source.id,
        label: this.labels.assessmentNames[source.id] ?? source.name,
        value,
        unit: "",
        fromSource: false,
        // What this reading is about, so a chip can lead somewhere for a host that has somewhere
        // to lead to. A player states it and stops there.
        about: source.create().about
      })
    }
    return { entries, unanswered }
  }

  /** A classifying assessor's conclusion in the reader's own words — a class id like "nl" means
   * nothing on a chip. Falls back to the id, which is at least what the file would say. */
  private verdictName(assessorId: string, verdict: string): string {
    return this.labels.assessmentVerdicts[`${assessorId}.${verdict}`] ?? verdict.toUpperCase()
  }
}
