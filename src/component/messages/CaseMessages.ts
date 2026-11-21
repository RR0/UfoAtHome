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
  /** What opens the event a card is about, alone: what was open beside it is put away. */
  openEvent: string
  /** On the mark of a card, on the rail: what shows its event beside those open, or puts it away. */
  toggleEvent: string
  /** The field at the top of the history that keeps only the events whose words hold what is typed in it: its placeholder. */
  searchEvents: string
  /** Under that field, when no event holds what is typed. */
  noEventFound: string
  /** The option of the history that sets each reading under the observation it reads, rather than in the order of time. */
  groupReadings: string
  /** The grip between the history and what is open beside it: dragged, or moved with the arrows; double-clicked, back to its width. */
  resizeColumns: string
  /** On a reading set under the observation it replays, before the other observations it reads: "Also about Y". */
  alsoAbout: string
  /** On an observation, in that grouping: what folds its readings away, and what unfolds them. */
  foldReadings: string
  unfoldReadings: string
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
