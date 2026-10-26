/** What the Launches part of the Phenomenon group says — see LaunchEditor. */
export interface LaunchEditorMessages {
  intro: string
  none: string
  launch: string
  deleteLaunch: string
  addLaunch: string
  /** The path of a launch: its legend, the picker of its places, what adds, removes and steps through them. */
  path: string
  place: string
  addPlace: string
  deletePlace: string
  previousPlace: string
  nextPlace: string
  /** What else the stage lets go: the legend, the picker of its jets, what adds and removes one, and the kinds a jet is added of. */
  jets: string
  jet: string
  noJet: string
  addJet: string
  deleteJet: string
  jetBurn: string
  jetVent: string
  /** The adding button when the recording has no place to put a launch at. */
  addLaunchNowhere: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
}
