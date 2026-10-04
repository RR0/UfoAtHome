import type { BodyPrimitive } from "../../engine/interpretation/Interpretation.js"

/** What the Bodies part of the Phenomenon group says — see BodyEditor. */
export interface BodyEditorMessages {
  intro: string
  interpretationTitle: string
  body: string
  none: string
  deleteBody: string
  addBody: string
  /** {shape} is the selected shape's name. */
  addBodyHint: string
  /** A body added with no shape to stand for: where the observer is looking. */
  addBodyHintView: string
  lookAtBody: string
  id: string
  title: string
  explains: string
  explainsNothing: string
  model: string
  primitives: string
  catalogue: string
  modelAdvanced: string
  modelUrl: string
  modelUrlHint: string
  modelTitle: string
  modelAuthor: string
  modelLicense: string
  modelSource: string
  modelIncomplete: string
  /** Under the address block, when it shows a catalogue model. */
  modelFromCatalogue: string
  outlineNode: string
  outlineNodeHint: string
  track: string
  trackEmpty: string
  /** {n} keyframes, {from} and {to} in seconds. */
  trackSpan: string
  /** {at} in seconds. */
  trackSingle: string
  /** {t} is the playhead, in seconds. */
  atPlayhead: string
  keyframeHere: string
  keyframeAdded: string
  placement: string
  fromObserver: string
  inWorld: string
  azimuth: string
  elevation: string
  distance: string
  east: string
  north: string
  onGround: string
  aboveGround: string
  width: string
  length: string
  height: string
  heading: string
  pitch: string
  roll: string
  colour: string
  albedo: string
  luminance: string
  /** Under the appearance fields. */
  appearanceNote: string
  deleteKeyframe: string
  /** What the picture does to the body on show. */
  pictureHint: string
  notPlaced: string
  primitive: Record<BodyPrimitive, string>
}
