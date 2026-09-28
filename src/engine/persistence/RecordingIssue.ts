/**
 * Something in a recording that was not played as written: a key nothing reads, a value of the
 * wrong kind, a word a closed list does not have, or a value the loader had to make up because the
 * file left it out.
 *
 * A file that loads is not a file that says what its author meant. Loading forgives a lot on
 * purpose (see KeyframeCompletion), and every forgiveness is a place where what is on screen may
 * differ from what was asked for, so each is reported rather than absorbed: to the console, and as
 * the `recordingissues` event the player and the editor show.
 *
 * Holding a field from the keyframe before is NOT an issue: it is the format's own rule, stated on
 * the format page, and reporting it would bury the real problems under a line per keyframe.
 */
export interface RecordingIssue {
  kind:
    /** A key the format does not have, so nothing reads it — most often a misspelling. */
    | "unknown-key"
    /** A value of the wrong JSON type: a string where a number goes, an object where a list does. */
    | "wrong-type"
    /** A word a closed list does not have. */
    | "not-in-list"
    /** A shape's first appearance left a field out, and the loader filled in a value nobody stated. */
    | "defaulted"
    /** A shape has neither a direction nor a box, so it is drawn at the middle of the view. */
    | "unplaced"
    /** A shape has neither an angular size nor a box, so it is drawn one pixel wide. */
    | "unsized"
    /** A keyframe restated the pixel box without the angles, so the angles held from before were
     * dropped and the shape follows the pixels. */
    | "pixels-over-angles"
  /** Where, as dot-joined keys and array indices ("timeline.keyframes.2.shapes.0.shape.kind"),
   * counted in the file as written. */
  path: string
  /** What was expected (a type, the accepted words) or filled in, when there is something to say. */
  expected?: string
  /** What the file had, for a wrong type or an unknown word. */
  found?: string
}

/** How each kind of issue reads, with {path}, {expected} and {found} to fill in — one set per
 * language, the editor's own in its messages. */
export type RecordingIssueTemplates = Record<RecordingIssue["kind"], string>

/** Turns issues into text, for the console and for any reader without translations. */
export class RecordingIssues {

  static readonly EN: RecordingIssueTemplates = {
    "unknown-key": "{path}: unknown key, ignored",
    "wrong-type": "{path}: expected {expected}, found {found}",
    "not-in-list": "{path}: {found} is not one of {expected}",
    "defaulted": "{path}: missing, {expected} used",
    "unplaced": "{path}: no aim (and no bounds), drawn at the middle of the view",
    "unsized": "{path}: no angular size (and no bounds), drawn one pixel wide",
    "pixels-over-angles": "{path}: bounds restated without aim or angular, so the shape follows the pixels"
  }

  static text(issue: RecordingIssue, templates: RecordingIssueTemplates = RecordingIssues.EN): string {
    return templates[issue.kind]
      .replace("{path}", issue.path)
      .replace("{expected}", issue.expected ?? "")
      .replace("{found}", issue.found ?? "")
  }

  /** The console warning for a recording's issues, or nothing when it has none. */
  static warn(issues: ReadonlyArray<RecordingIssue>, name?: string): void {
    if (issues.length === 0) return
    const lines = issues.map(issue => `  ${RecordingIssues.text(issue)}`)
    console.warn(`UFO@home: ${issues.length} problem(s) in ${name ?? "this recording"}:\n${lines.join("\n")}`)
  }
}
