/** What the Modules item of the Files group says — see ModulesPanelElement. */
export interface ModulesPanelMessages {
  /** What a module is, above the list. */
  intro: string
  /** Under the address field: that a module with code runs with everything this page can do. */
  codeWarning: string
  /** The address field's placeholder. */
  urlPlaceholder: string
  add: string
  /** When nobody added a module and no recording names one. */
  none: string
  remove: string
  /** The checkbox of a module the person added: on or off. */
  enabled: string
  /** The checkbox that makes the recording name the module (see SightingRecordingJson.modules). */
  namedByRecording: string
  namedByRecordingHint: string
  /** The button of a module a recording names and the person did not add. */
  addToMine: string
  loading: string
  /** {error} is what went wrong. */
  failed: string
  off: string
  /** What it brings: {points} is the list of what, with how many. */
  brings: string
  /** When a manifest brings nothing. */
  bringsNothing: string
  /** A module whose script was run. */
  runsCode: string
  /** A module a recording names, whose script was not run: the person did not add it. */
  codeNotRun: string
  exportConfig: string
  importConfig: string
  /** {count} is how many modules were read from the file. */
  imported: string
  /** {error} is why the file is not a list of modules. */
  importFailed: string
  /** Each extension point, by its id (see ExtensionPointTypes). */
  points: Record<string, string>
}
