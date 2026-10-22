import type { InputFileMessages } from "../InputFileElement.js"
/** What an interview of a case says — see InterviewEditorElement. */
export interface InterviewMessages extends InputFileMessages {
  title: string
  time: string
  /** Who put the questions. */
  by: string
  /** What the interview was held through: face to face, by phone, in a video call… (see InterviewMedia for what each is called). */
  medium: string
  /** The witness it was held with: one of the case's observers. */
  witness: string
  witnessNone: string
  /** What the interview established. */
  summary: string
  /** The interview's transcript file, when the case gives one. */
  transcript: string
  transcriptHint: string
  /** The two groups of an interview, as the editor of a recording has its own: what it established, and the file of its transcript. */
  summaryTab: string
  fileTab: string
  /** The third group: the interview read as a dialogue, who said what. */
  exchangesTab: string
  exchangesEmpty: string
  /** What stands in the place of a passage taken out of the published transcript. */
  redacted: string
  proofreadAll: string
  /** `{names}` is the speakers who have not approved the transcript yet. */
  proofreadPending: string
  /** How a speaker the transcript does not name is called, by role. */
  /** The editor's player: playing, the recordings it plays (their window, each one's fields), and what is said when there is none. */
  play: string
  pause: string
  recordings: string
  recordingsTitle: string
  recordingKind: string
  recordingAudio: string
  recordingVideo: string
  recordingFile: string
  recordingOffset: string
  recordingRemove: string
  recordingAdd: string
  /** The ✕ of the recordings' window. */
  close: string
  noRecording: string
  /** The editor's exchanges: taking passages out and back, editing and deleting a turn, who has proofread, and links to moments. */
  redactSelection: string
  redactedWords: string
  redactAll: string
  restoreAll: string
  editTurn: string
  deleteTurn: string
  saveTurn: string
  cancelTurn: string
  turnEditHint: string
  selectionOnePassage: string
  selectionNone: string
  reviewedBy: string
  linkMoment: string
  momentLabel: string
  unlinkMoment: string
  noMoments: string
  /** Why a passage taken out in the editor was: the reason it is given. */
  redactReason: string
  roles: { interviewer: string, interviewee: string, witness: string }
  importFile: string
  saveButton: string
  loading: string
  /** Said while the text of the transcript is not JSON the editor can read: the interview keeps the last text it understood. */
  invalid: string
  notATranscript: string
  loadFailed: string
  editorLabel: string
  /** What `by` may be filled with: the ids of people, separated by commas. */
  byHint: string
}
