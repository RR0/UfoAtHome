/** What the sensitivity of a reading says — see ReadingSensitivityElement. Each `{name}` is filled where it is said. */
export interface ReadingSensitivityMessages {
  /** What it is called, with the punctuation the language puts before what it comes to. */
  heading: string
  /** What it measures and why, in the (?) beside the heading. */
  hint: string
  /** A reading whose bodies say of none what phenomenon it is: nothing of it can be set against the account. */
  nothingToConfront: string
  /** Reproduces none of the `{compared}` comparisons. */
  noneAgrees: string
  /** Reproduces `{agreed}` of the `{compared}` comparisons (one phenomenon at one instant each). */
  agreement: string
  /** Reproduces the only one of the `{compared}` comparisons it reproduces. */
  agreementOne: string
  /** Reproduces all of them. */
  allAgree: string
  /** Nothing of the reading was supposed: there is nothing to turn. */
  noFreeValue: string
  /** The value the likeness is the most tied to: `{knob}`, from `{lower}` to `{upper}`. `{knob}` is followed by the body it is of, in
   * parentheses, only when the reading supposed several. */
  tightest: string
  /** One row per value turned. */
  margin: string
  /** An end the search did not find, because the reading still holds as far as it looks: `{value}` and beyond. */
  atLeast: string
  /** A turn that reproduces more than the reading as written: it was not at its best. */
  better: string
  /** What each value turned is called. */
  knobs: { azimuth: string, altitude: string, distance: string, size: string, time: string }
}
