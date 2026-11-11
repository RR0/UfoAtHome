import type { ReadingFinding } from "./Interpretation.js"

/**
 * What a reading's findings come to, as an editor's group says what its fields come to: red, orange or green.
 *
 * - "incompatible": it fails against an ESTABLISHED element of the observation (see FindingGround). It is in head-on contradiction with
 *   what is known (night where the film shows day, a direction opposite the one measured), and stays listed to say so.
 * - "unsettled": nothing established contradicts it, but it fails against a supposition, or a test it needs could not be made. It can
 *   only be decided by learning what the observation does not hold.
 * - "compatible": every test it was put to holds.
 *
 * A reading with no findings has no verdict: nobody has tested it yet, which is not the same as having found it sound.
 */
export type ReadingVerdict = "incompatible" | "unsettled" | "compatible"

export class ReadingVerdicts {
  static of(findings: readonly ReadingFinding[] | undefined): ReadingVerdict | undefined {
    if (!findings || findings.length === 0) return undefined
    if (findings.some(finding => finding.outcome === "fails" && finding.against !== "supposed")) return "incompatible"
    if (findings.some(finding => finding.outcome !== "holds")) return "unsettled"
    return "compatible"
  }
}
