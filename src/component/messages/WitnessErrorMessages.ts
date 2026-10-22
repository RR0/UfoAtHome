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
}
