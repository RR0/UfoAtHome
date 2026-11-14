/** What the case reader says — see CaseElement. The editor has its own words (see CaseEditorMessages): these are read, not written. */
export interface CaseMessages {
  /** Over the case's name, saying what is being read. */
  caseHeading: string
  /** Over the list of what the case holds, in the order of time: its history. */
  eventsHeading: string
  /** What kind of event a card is, on its pill. */
  kindObservation: string
  kindReading: string
  kindInterview: string
  /** What opens the event a card is about. */
  openEvent: string
  /** On a reading's card, before the observations it reads: "Interpretation of X and Y". */
  interpretationOf: string
  /** On an observation's card, before the interviews it was told in. */
  passagesHeading: string
  /** Before the authors a card names: "… by Z". */
  byAuthor: string
  /** Between the last two things a card names. */
  linkAnd: string
  /** What the i opens: what the case says of itself. */
  caseSummary: string
  /** The way from reading this case to editing it, on the event being read. */
  editCase: string
  /** What shares the case itself, as against one of its observations (which its player shares). */
  shareCase: string
}
