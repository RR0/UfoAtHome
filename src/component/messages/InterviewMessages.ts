import type { InputFileMessages } from "../InputFileElement.js"
import type { QuestionnaireFormMessages } from "../QuestionnaireForm.js"
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
  /** A colon as the language writes one between a heading and what follows it (French puts a no-break space before it). */
  colon: string
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
  /** Why another cannot be added yet: the last one has no file. */
  recordingAddFirst: string
  /** The ✕ of the recordings' window. */
  close: string
  noRecording: string
  /** The editor's exchanges: taking passages out and back, editing and deleting a turn, who has proofread, and links to moments. */
  redactSelection: string
  redactedWords: string
  /**
   * On a confidential answer sealed for a recipient whose module is installed (see SealOpener): what opens it, `{name}` the module; what is said of
   * the answer opened, kept in the page only; and when the key given is not the one it was sealed for.
   */
  sealOpen: string
  sealOpened: string
  sealFailed: string
  redactAll: string
  redactRestore: string
  restoreAll: string
  editTurn: string
  deleteTurn: string
  saveTurn: string
  cancelTurn: string
  turnEditHint: string
  selectionOnePassage: string
  reviewedBy: string
  linkMoment: string
  momentLabel: string
  unlinkMoment: string
  noMoments: string
  /** Why a passage taken out in the editor was: the reason it is given. */
  redactReasonLabel: string
  redactReasonHint: string
  /** What passages are most often taken out for, offered beside the reason. */
  redactReasons: string[]
  redactReason: string
  /** `unattributed`: a voice a transcription found, whose it is not said yet. */
  roles: { interviewer: string, interviewee: string, witness: string, unattributed: string }
  /** The button that transcribes the interview's recording (see TranscriptionProvider). */
  transcribe: string
  /** The picker of what transcribes it. */
  transcribeWith: string
  /** What `transcribe` does, in its (?). */
  transcribeHint: string
  /** Said of a transcription run in the reader's browser: `{mb}`, what its first use downloads. */
  transcribeLocal: string
  /** Said of a service the recording is sent to: `{name}`. */
  transcribeSends: string
  /** Said when the interview already has a transcript, which a transcription replaces. */
  transcribeReplaces: string
  /** Said when there is no recording to transcribe. */
  transcribeNoRecording: string
  transcribeKey: string
  transcribeKeyGet: string
  /** That a key typed is kept in memory only. */
  transcribeKeyHint: string
  /** While the recording is decoded. */
  transcribeReading: string
  /** While the model downloads: `{loaded}` and `{total}`, in MB. */
  transcribeLoading: string
  /** While the model downloads, its size unknown: `{loaded}` MB. */
  transcribeLoadingSoFar: string
  /** While it transcribes: `{done}` and `{total}`, as times of the recording. */
  transcribeSending: string
  transcribeWaiting: string
  transcribeProgress: string
  transcribeStop: string
  /** Once done: `{engine}`. */
  transcribeDone: string
  transcribeStopped: string
  /** Why it did not happen (see TranscriptionError): `failed` says `{detail}`. */
  transcribeErrors: { noKey: string, key: string, rateLimited: string, tooLarge: string, unsupported: string, failed: string }
  /** The turn tool that gives a turn to another speaker. */
  voiceNamed: string
  whoSpeaks: string
  importFile: string
  /** What `importFile` reads, in its (?): a transcript, or a filled questionnaire when the interview is held through one. */
  importFileHint: string
  saveButton: string
  loading: string
  /** Said while the text of the transcript is not JSON the editor can read: the interview keeps the last text it understood. */
  invalid: string
  notATranscript: string
  /** The group that shows a questionnaire the interview was held through as a form, to fill in (see QuestionnaireForm). */
  questionnaireTab: string
  questionnaire: QuestionnaireFormMessages
  /** The button that sets in the witness's observation what their answers say of it (see QuestionnaireFeed), its (?) and what it did: `{n}` values. */
  feed: string
  feedHint: string
  /**
   * The button that sends the filled questionnaire, the case with every file of it, to whom it is for: `send` naming them (`{name}`), `sendHint` their
   * address (`{email}`); `sendPrepare` and its hint when the case template names nobody, the witness then addressing it.
   */
  send: string
  sendHint: string
  sendPrepare: string
  sendPrepareHint: string
  /** The message: its subject and body (`{title}` the questionnaire's), what is said of the confidential answers sealed for `{name}`. */
  sendSubject: string
  sendBody: string
  sendSealed: string
  /** Added to a message prepared in the mail, which cannot attach a file itself: `{file}`, just saved, to attach. */
  sendAttach: string
  /** How it went: shared by the device; saved as `{file}` and the message prepared; or why it could not be (`{error}`). */
  sent: string
  sendPrepared: string
  sendFailed: string
  fed: string
  /** When the answers say nothing the observation can be given yet. */
  fedNothing: string
  /** When the questionnaire it was filled in on is not one this version knows: `{id}`. */
  unknownQuestionnaire: string
  /** Said when the interview is a questionnaire and the file holds no field to read as a question and its answer. */
  notAQuestionnaire: string
  loadFailed: string
  editorLabel: string
  /** What `by` may be filled with: the ids of people, separated by commas. */
  byHint: string
}
