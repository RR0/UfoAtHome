import type { Basis } from "../../engine/persistence/Provenance.js"
import type { LeadStatus, WitnessLawNote, WitnessParameter, WitnessParameterNote } from "../../engine/witness/WitnessError.js"
import type { WitnessExposure, WitnessWord } from "../../engine/model/Account.js"

/**
 * What the editor says of the errors an observer's values may hold (see WitnessError and docs/witness-error-model.md): each value's
 * basis and how it was obtained, the law of its error with its status, and the observer's conditions, Moon gauge and error parameters.
 * Figures in braces are filled in: `{low}`, `{high}` in the value's unit, and each law's own (`{minutes}`, `{factor}`…).
 */
export interface WitnessErrorMessages {
  basisTitle: string
  basisField: string
  howField: string
  rationaleField: string
  basisReset: string
  lawSources: string
  extrapolation: string
  sectionAccountConditions: string
  sectionViewing: string
  sectionMoon: string
  sectionErrorParameters: string
  errorModelField: string
  delayField: string
  delayUnit: string
  versionField: string
  wordField: string
  exposureField: string
  independenceField: string
  independentYes: string
  independentNo: string
  unknownChoice: string
  darkAdapted: string
  correctedVision: string
  glare: string
  viewingNote: string
  moonIntro: string
  moonField: string
  moonHint: string
  moonNone: string
  moonFactor: string
  moonReal: string
  parametersIntro: string
  showMore: string
  basis: Record<Basis, string>
  how: Record<string, string>
  status: Record<LeadStatus, string>
  laws: Record<WitnessLawNote, string>
  parameterNames: Record<WitnessParameter["id"], string>
  parameterScopes: Record<WitnessParameter["id"], string>
  parameters: Record<WitnessParameterNote, string>
  words: Record<WitnessWord, string>
  exposures: Record<WitnessExposure, string>
  models: Record<string, string>
  /** The candidate explanations of the Summary section and the variant on show (see CandidatesView). */
  candidates: {
    title: string
    verdicts: Record<"consolidated" | "contested" | "incompatible", string>
    cost: string
    seeVariant: string
    variantLabel: string
    backToAccount: string
    costNote: string
    scopeNote: string
    fields: Record<"time" | "heading" | "elevation" | "size", string>
    biases: Record<"clock" | "heading" | "elevation" | "size", string>
    reasons: Record<"never-seen" | "direction" | "size" | "motion" | "growth", string>
    /** A structural reading a variant uses (see CandidateSearch's StructuralReading), and what heads its line. */
    readingTitle: string
    readings: Record<"grouped" | "still-seen-moving" | "moving-seen-still" | "brightening-as-approach", string>
    notAgainst: string
    noDirection: string
    noSky: string
    bodies: Record<string, string>
    /** The Poher matrix (1977) as the source of the candidates: loading, its verdicts, and the answers drawn from the recording. */
    /** What a computed candidate is called: an aircraft of the traffic record, a re-entry, a recorded fireball ({name}: what is known of it). */
    aircraft: string
    /** An interpretation as a candidate ({name}: its title), and the variants kept in the recording. */
    interpretation: string
    keepVariant: string
    keptTitle: string
    seeKept: string
    removeVariant: string
    keptRecomputed: string
    keptModel: string
    reentry: string
    fireball: string
    /** A bright star as a candidate ({name}: its name in the reader's language). */
    star: string
    poherLoading: string
    poherFailed: string
    poherTitle: string
    poherIntro: string
    poherPossible: string
    poherExcluded: string
    poherExcludedBy: string
    poherDoubted: string
    poherScore: string
    poherTag: string
    poherStatePossible: string
    poherStateExcluded: string
    answersTitle: string
    firm: string
    soft: string
  }
}
