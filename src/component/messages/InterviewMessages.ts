/** What an interview of a case says — see InterviewElement. */
export interface InterviewMessages {
  title: string
  time: string
  /** Who put the questions. */
  by: string
  /** The witness it was held with: one of the case's observers. */
  witness: string
  witnessNone: string
  /** What the interview established. */
  summary: string
  /** The interview's transcript file, when the case gives one. */
  transcript: string
  transcriptHint: string
  /** What `by` may be filled with: the ids of people, separated by commas. */
  byHint: string
}
