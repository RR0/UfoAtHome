import type { InterviewMessages } from "./InterviewMessages.js"

export const interviewMessages_fr: InterviewMessages = {
  title: "Titre",
  time: "Date",
  by: "Enquêteur",
  medium: "Moyen",
  witness: "Témoin",
  witnessNone: "—",
  summary: "Description",
  transcript: "Transcription",
  transcriptHint: "Adresse du fichier de transcription anonymisée (facultative)",
  summaryTab: "Résumé",
  fileTab: "Fichier",
  importFile: "Charger un fichier JSON",
  importUrl: "Ou depuis une adresse",
  importButton: "Charger",
  saveButton: "Sauver",
  loading: "Chargement de la transcription…",
  invalid: "Ce texte n'est pas encore du JSON valide : l'interview garde la dernière transcription qu'elle a comprise.",
  notATranscript: "Ce fichier n'est pas une transcription d'interview (il n'a pas de tours de parole).",
  loadFailed: "Cette transcription n'a pas pu être lue.",
  editorLabel: "Transcription de l'interview en JSON",
  byHint: "Identifiants de personnes RR0, séparés par des virgules"
}
