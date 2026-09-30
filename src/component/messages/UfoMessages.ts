/** Contract for `<rr0-ufo>`'s user-visible label strings — implemented per language under this
 * directory (`UfoMessages_en.ts`, `UfoMessages_fr.ts`) and loaded via `loadUfoMessages`. */
import type { RecordingIssueTemplates } from "../../engine/persistence/RecordingIssue.js"

export interface UfoMessages {
  play: string
  pause: string
  noDuration: string
  currentPosition: string
  duration: string
  /** Appended to both counters' titles to say what clicking one does. Only ever shown when the
   * observation has a start time, since with no clock there is nothing to switch to. */
  switchToElapsed: string
  switchToClockTime: string
  fullscreen: string
  exitFullscreen: string
  /** The button beside play, for the recording's sound (the reader's gesture, so a verb). */
  mute: string
  unmute: string
  /** The chevron that folds and unfolds the buttons a narrow player has no room for. */
  moreControls: string
  fewerControls: string
  /** Names the reader's own gesture, not the feature — see the project's wording rules. */
  showObserverMap: string
  hideObserverMap: string
  /** Shown on the map instead of the imagery when the tiles cannot be fetched — the path is still
   * drawn, so this says what is missing rather than that the map failed. */
  mapImageryUnavailable: string
  /** The map's own zoom buttons, and the one that puts back the box fitted to the path. */
  zoomMapIn: string
  zoomMapOut: string
  fitMap: string
  /** What hovering bare ground says when a click there moves the observer — the editor's map only. */
  placeObserverHere: string
  /** The account's own named moments (see Milestone) — the marks on the bar, the caption, and the
   * lettered points on the map, which go together. */
  /** The corner button that lays the recording's pictures of the place over the scene, and the
   * slider beside it — see SceneReference. */
  showReferences: string
  hideReferences: string
  referenceOpacity: string
  showMilestones: string
  hideMilestones: string
  /** What the map calls the two things a recording may not have named: the observer themselves, and
   * a piece of scenery with no title. A hover has to say something. */
  observerHere: string
  decorHere: string
  /** The warning over a recording that was not played as written — see RecordingIssue. {count} is
   * how many problems; the button shows the number alone. */
  recordingIssues: string
  /** One line per problem, {path} being where in the file. */
  issueTemplates: RecordingIssueTemplates
}
