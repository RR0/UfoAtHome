/**
 * The events an `<rr0-interview>` sends, named apart from the element so that the case editor can listen for them without loading it: most
 * cases have no interview, and the element (see InterviewElement) is fetched only when one is shown.
 */

/** Sent, and bubbling, each time the interview is edited: what changed is the event the element holds, in place; for the transcript, its text is in `detail.text`. */
export const INTERVIEW_CHANGE_EVENT = "interviewchange"

/**
 * Sent, and bubbling, when the reader follows a passage of the dialogue to the moment of the observation it tells of: `detail` is the `sighting` (the
 * `id` of the observer's account, or the interview's own when the passage names none) and `at`, in seconds since the beginning of the observation.
 */
export const INTERVIEW_SEEK_EVENT = "interviewseek"
