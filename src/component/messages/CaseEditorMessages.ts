import type { InputFileMessages } from "../InputFileElement.js"
/** What the case editor says — see CaseEditorElement. */
export interface CaseEditorMessages extends InputFileMessages {
  /** What the picker of the case's events is called: its options are the accounts, the readings and the interviews. */
  event: string
  /** Before the name of an observer, in the picker: "Observation of Q. B." */
  accountOf: string
  /** Before the name of the interview, in the link from a moment of the observation to the passage that tells of it: "Reported in Interview of Q. B." */
  passagesHeading: string
  /** Before the name of the witness interviewed: "Interview of Q. B." */
  interviewOf: string
  /** With `{n}`: an interview whose case gives no title. */
  untitledInterview: string
  deleteInterviewQuestion: string
  untitledReading: string
  /** The case's events, listed under its fields: their heading, what opens one, and the way to the one before or after it once open. */
  eventsInTime: string
  /** What the observation shows over it when it was opened from an interview's link to one of its moments, and the way back. */
  citedMoment: string
  backToInterview: string
  openEvent: string
  previousEvent: string
  nextEvent: string
  /** A reading's kind, on its pill; and how many readings an account has. */
  kindReading: string
  readingsCount: string
  /** What the case's header says of it: new, opened from a file ({file}), or saved as a file ({file}); whether it changed, Save says. */
  caseStateNew: string
  caseStateClean: string
  caseStateSaved: string
  untitledObservation: string
  deleteRecording: string
  deleteReadingQuestion: string
  deleteObservationQuestion: string
  deleteRefused: string
  titleField: string
  authorField: string
  /** The dialog of the + button: it adds an event of the case, of the type chosen in it. */
  addTitle: string
  kindField: string
  kindObservation: string
  kindInterview: string
  /** The observer an interview is held with. */
  witnessField: string
  interviewerField: string
  /** What an interview is held through (see InterviewMedia). */
  mediumField: string
  /** The title of an event that is not a reading: the one of a reading is called "Title of the interpretation". */
  plainTitleField: string
  sourceField: string
  sourceBlank: string
  sourceFile: string
  observerField: string
  fileField: string
  loadFailed: string
  isACase: string
  ok: string
  cancel: string
  caseHeading: string
  caseId: string
  recordingId: string
  idTaken: string
  idInvalid: string
  idNeeded: string
  /** With `{id}`. */
  idDuplicated: string
  /** With `{id}`. */
  readingUnresolved: string
  caseTitle: string
  caseTime: string
  /** The case editor's two groups, as the recording's editor has its own: the events, and the file `case.json` as text. */
  eventsTab: string
  fileTab: string
  importFile: string
  fileNotACase: string
  /** Said while the text of the file is not a case the editor can read: the case keeps the last text it understood. */
  fileInvalid: string
  fileLoading: string
  add: string
  addHint: string
  interpretationOf: string
  interpretationOfNone: string
  exportButton: string
  exportTitle: string
  exportAlso: string
  addToCase: string
  unsavedChanges: string
  discardQuestion: string
  discardTitle: string
  discardOk: string
  leaveQuestion: string
  leaveOk: string
}
