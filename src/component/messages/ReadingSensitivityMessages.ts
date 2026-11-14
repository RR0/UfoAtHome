/** What the sensitivity of a reading says — see ReadingSensitivityElement. Each `{name}` is filled where it is said. */
export interface ReadingSensitivityMessages {
  /** What it is called, with the punctuation the language puts before what it comes to. */
  heading: string
  /** What is compared with what, what counts as a contradiction, and how the margins read, in the (?) beside the heading. */
  hint: string
  /** A reading whose bodies say of none what phenomenon it is: nothing of it can be set against the account. */
  nothingToConfront: string
  /** An account that traces no direction and no size to the witness: there is nothing said to set a reading against. */
  noneSaid: string
  /** An indication is a direction or a size the witness gave at an instant: reproduces none of the `{compared}`. */
  noneAgrees: string
  /** Reproduces one of the `{compared}` indications. */
  agreementOne: string
  /** Reproduces `{agreed}` of the `{compared}` indications. */
  agreement: string
  /** Reproduces all of them. */
  allAgree: string
  /** Reproduces less than half of them: its margins would measure how robust a coincidence is, and are not shown. */
  tooFew: string
  /** Nothing of the reading was supposed: there is nothing to move. */
  noFreeValue: string
  /** The narrowest margin: `{knob}`, from `{lower}` to `{upper}` about the value the reading chose. `{knob}` is followed by the body it is
   * of, in parentheses, only when the reading supposed several. */
  tightest: string
  /** One row per value moved that no law gives an uncertainty for: how far it can be moved and the reading still reproduce as much. */
  margin: string
  /** One row per value moved that a law gives an uncertainty for: its margin, that uncertainty (`{refLower}` to `{refUpper}`), and the
   * share of it the margin covers (`{coverage}`, a percentage). */
  marginJudged: string
  /** Every margin covers at least half of its value's uncertainty. */
  sufficient: string
  /** One does not: `{knob}`, which covers only `{coverage}` % of it. */
  fineTuned: string
  /** An end the search did not find, because the reading still holds as far as it looks: `{value}` and beyond. */
  atLeast: string
  /** A move that reproduces more than the reading as written: `{knob}` moved by `{amount}` reproduces `{agreed}` of `{compared}`. */
  better: string
  /** What each value moved is called. */
  knobs: { azimuth: string, altitude: string, distance: string, size: string, time: string }
}
