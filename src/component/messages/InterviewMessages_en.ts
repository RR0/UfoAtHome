import type { InterviewMessages } from "./InterviewMessages.js"

export const interviewMessages_en: InterviewMessages = {
  title: "Title",
  time: "When",
  by: "Interviewer",
  medium: "Medium",
  witness: "Witness",
  witnessNone: "—",
  summary: "Description",
  transcript: "Transcript",
  transcriptHint: "Address of the anonymised transcript file (optional)",
  summaryTab: "Summary",
  fileTab: "File",
  importFile: "Load JSON file",
  importUrl: "Or load from URL",
  importButton: "Load",
  saveButton: "Save",
  loading: "Loading the transcript…",
  invalid: "This text is not valid JSON yet: the interview keeps the last transcript it understood.",
  notATranscript: "That file is not an interview transcript (it has no segments).",
  loadFailed: "That transcript could not be read.",
  editorLabel: "Interview transcript as JSON",
  byHint: "RR0 people ids, separated by commas"
}
