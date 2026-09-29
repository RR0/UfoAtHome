/**
 * The cloud editor's texts (see CloudEditor and cloudEditorTemplate). English is not a module: it
 * is the template's own text, what every reader sees until their language's module has arrived
 * (see loadCloudEditorMessages) and all an English reader ever downloads.
 */
export interface CloudEditorMessages {
  intro: string
  editScope: string
  scopeInstant: string
  scopeObservation: string
  layer: string
  addLayer: string
  deleteLayer: string
  cloudType: string
  unknownType: string
  base: string
  thickness: string
  coverage: string
  cloudSize: string
  density: string
  darkness: string
  crystalAlignment: string
  layerWindDirection: string
  layerWindSpeed: string
  generalWind: string
  patternSeed: string
  editHelp: string
  individualClouds: string
  individualCloud: string
  addIndividualCloud: string
  pointAtCloud: string
  deleteCloud: string
  manipulate: string
  instanceEast: string
  instanceNorth: string
  instanceBase: string
  instanceThickness: string
  instanceWidth: string
  instanceDepth: string
  instanceRotation: string
  instanceDensity: string
  layerDarkness: string
  individualHelp: string
  /** The individual-cloud picker's empty choice. */
  none: string
  /** "Cloud 2" — followed by the cloud's number. */
  cloud: string
  savedAcrossObservation: string
  /** After the time in seconds. */
  savedAtThisTime: string
  noCloudHere: string
  cloudSelected: string
  /** Appended to the status, hence its leading space. */
  cloudAdded: string
}
