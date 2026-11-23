import { QuestionnaireTemplates } from "./QuestionnaireTemplate.js"

/**
 * What a new case holds besides the observation it is made around: the questionnaires its witness is asked to fill in, each an interview of the case
 * held through it (see CaseSession.addQuestionnaire). GEIPAN's technical questionnaire unless a page or a module says otherwise; none when set to an
 * empty list.
 */
export class CaseTemplate {
  /** The ids of the questionnaires (see QuestionnaireTemplates), in the order they are added. */
  static questionnaires: string[] = [QuestionnaireTemplates.DEFAULT]
}
