/** What the sweep of a case's uncertain conditions says (see ScenarioSweep, ScenarioSweepElement, scripts/scenario-sweep.ts). Each `{name}` is filled where it is said. */
export interface ScenarioSweepMessages {
  /** The panel's heading, and what it does, in the (?) beside it. */
  heading: string
  hint: string
  /** A case that states no uncertain condition: nothing to sweep. */
  noConditions: string
  /** What the case leaves open: `{places}` candidate places, `{dates}` (its interval, from `{from}` to `{to}`). */
  open: string
  /** The button that plays every reading over every scenario. */
  run: string
  /** While it runs: `{done}` steps of `{total}`. */
  running: string
  failed: string
  /** The three verdicts. */
  robustPlausible: string
  robustExclusion: string
  /** Conditional, `{where}` saying where it holds. */
  conditional: string
  /** Where a conditional verdict holds: at `{places}`, on `{dates}`, in `{scenarios}`; what joins two of a list. */
  atPlaces: string
  onDates: string
  inScenarios: string
  or: string
  /** The account's own place, where it is played as written. */
  ownPlace: string
  /** How a verdict moved from the verdict as written. */
  asWrittenPlausible: string
  asWrittenExcluded: string
  /** plausible as written, robust plausible; excluded as written, robust exclusion; plausible → excluded everywhere; excluded → plausible
   * everywhere; plausible → conditional; excluded → conditional. */
  becomesRobust: string
  becomesRobustExclusion: string
  excludedEverywhere: string
  plausibleEverywhere: string
  becomesConditional: string
  plausibleOnlyIf: string
  /** A reading that depends on nothing the scenarios move. */
  independent: string
  /** It holds in `{holds}` scenarios of `{played}`. */
  holdsIn: string
  /** What the reading depends on: the wind. */
  dependsWind: string
  /** The alerts of the sky: a candidate incompatible, compatible, or compatible only `{where}`, in every scenario of an account. */
  alertsHeading: string
  alertExcluded: string
  alertPlausible: string
  alertConditional: string
  noAlert: string
  /** The column heads of the table, and of the scenarios of one reading. */
  account: string
  reading: string
  verdict: string
  scenario: string
  wind: string
  said: string
  drawn: string
  /** The row of a reading as written. */
  asWritten: string
  /** A judge's summary: `{agreed}` of `{compared}` reproduced, median `{median}`. */
  summary: string
  /** The ground wind of a scenario: towards `{toward}`°, `{speed}` m/s. */
  windValue: string
  /** Keeps the scenarios ticked as readings of the case; says how many were added. */
  keep: string
  kept: string
  /** The title of a reading played under a scenario: `{title}`, at `{place}`, on `{date}`. */
  scenarioTitle: string
}
