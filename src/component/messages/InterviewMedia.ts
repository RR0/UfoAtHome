import type { InterviewMedium } from "../../engine/persistence/interviewJson.js"
import type { UfoLanguage } from "./index.js"

/**
 * What each medium an interview was held through is called, in the languages the components speak: the editor of an interview, and the dialog
 * of the case editor that adds one. One table, so that the two say it the same way.
 */
export class InterviewMedia {

  private static readonly LABELS: Record<UfoLanguage, Record<InterviewMedium, string>> = {
    en: { "in-person": "In person", phone: "Phone", video: "Video call", chat: "Chat", email: "Email", letter: "Letter", other: "Other" },
    fr: { "in-person": "Face à face", phone: "Téléphone", video: "Visioconférence", chat: "Chat", email: "Mail", letter: "Courrier", other: "Autre" },
    es: { "in-person": "En persona", phone: "Teléfono", video: "Videollamada", chat: "Chat", email: "Correo electrónico", letter: "Carta", other: "Otro" },
    it: { "in-person": "Di persona", phone: "Telefono", video: "Videochiamata", chat: "Chat", email: "Email", letter: "Lettera", other: "Altro" }
  }

  /** The media, in the order they are offered. */
  static readonly ALL: readonly InterviewMedium[] = ["in-person", "phone", "video", "chat", "email", "letter", "other"]

  static label(medium: string, language: UfoLanguage): string {
    return (InterviewMedia.LABELS[language] as Record<string, string>)[medium] ?? medium
  }
}
