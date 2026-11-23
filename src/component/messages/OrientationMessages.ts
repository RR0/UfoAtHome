import { Messages } from "../../i18n/MessageCatalog.js"

/** What the statistical indicators of a case say (see OrientationsElement), in the reader's language. */
export interface OrientationMessages {
  heading: string
  /** Under the heading, always: what a score is and is not, and that it stands apart from what the simulation finds. */
  caution: string
  /** `{engine}`, `{version}`. */
  engine: string
  /** `{sha256}` of the reference the frequencies were read from. */
  reference: string
  /** `{date}` of the reference. */
  referenceDate: string
  /** `{date}` they were computed. */
  computed: string
  /** Before the episodes a profile gathers. */
  episodes: string
  /** Said of an episode coded on a recording that has changed since. */
  stale: string
  /** Said of an episode with no digest: it cannot be told whether its recording changed. */
  undated: string
  rank: string
  family: string
  score: string
  /** `{population}` past cases a setting holds. */
  population: string
  /** When there is nothing to show. */
  empty: string
}

export const orientationMessages = Messages.catalog<OrientationMessages>({
  en: () => import("./OrientationMessages_en.js").then(module => module.orientationMessages_en),
  fr: () => import("./OrientationMessages_fr.js").then(module => module.orientationMessages_fr),
  es: () => import("./OrientationMessages_es.js").then(module => module.orientationMessages_es),
  it: () => import("./OrientationMessages_it.js").then(module => module.orientationMessages_it)
})
