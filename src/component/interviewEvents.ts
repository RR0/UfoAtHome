/**
 * The events an `<rr0-interview-editor>` sends, named apart from the element so that the case editor can listen for them without loading it: most
 * cases have no interview, and the element (see InterviewEditorElement) is fetched only when one is shown.
 */

/** Sent, and bubbling, each time the interview is edited: what changed is the event the element holds, in place; for the transcript, its text is in `detail.text`. */
export const INTERVIEW_CHANGE_EVENT = "interviewchange"

/**
 * Sent, and bubbling, when the reader follows a passage of the dialogue to the moment of the observation it tells of: `detail` is the `sighting` (the
 * `id` of the observer's account, or the interview's own when the passage names none) and `at`, in seconds since the beginning of the observation.
 */
export const INTERVIEW_SEEK_EVENT = "interviewseek"

/**
 * Sent, and bubbling, when the author asks that a questionnaire's answers be set in the witness's observation (see QuestionnaireFeed): `detail` holds
 * the interview's `event` and its transcript `json`; the host that does it calls `detail.report` with how many values it set.
 */
export const QUESTIONNAIRE_FEED_EVENT = "questionnairefeed"

/**
 * Sent, and bubbling, when the witness asks that their filled questionnaire be sent to whom it is for (see SealRecipient.email): the host sends the
 * case, every file of it, through the device's sharing, else saves it and prepares a message in the witness's mail, and says which by `report`.
 */
export const QUESTIONNAIRE_SEND_EVENT = "questionnairesend"

/** What a send asks (see QUESTIONNAIRE_SEND_EVENT): where to, the message's subject and body (`{file}` the case's file), and what to say once done. */
export interface QuestionnaireSend {
  email?: string
  subject: string
  body: string
  /** Added to a message prepared in the mail, which cannot attach the case itself: to attach `{file}`, just saved. */
  attach: string
  report(outcome: "shared" | "prepared" | "failed", detail: string): void
}
