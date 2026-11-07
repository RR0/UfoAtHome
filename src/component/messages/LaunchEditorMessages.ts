/** What the Launches part of the Phenomenon group says — see LaunchEditor. */
export interface LaunchEditorMessages {
  intro: string
  none: string
  launch: string
  deleteLaunch: string
  addLaunch: string
  /** The path of a launch: its row on the timeline and its legend, and what removes the place picked. */
  path: string
  deletePlace: string
  /** What else the stage lets go: a jet's legend, what adds and removes one, and the kinds a jet is added of. */
  jet: string
  addJet: string
  deleteJet: string
  jetBurn: string
  jetVent: string
  /** The adding button when the recording has no place to put a launch at. */
  addLaunchNowhere: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
  /** Under the timeline: how it is used. */
  timelineNote: string
  /** The "+" of a row of the timeline, and what it says when something of the row is at the playhead already. */
  addHere: string
  here: string
  zoomHint: string
}
