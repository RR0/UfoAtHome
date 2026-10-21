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
  /** The picker of the body's keyframes, and the button that adds one at the playhead. */
  keyframes: string
  addKeyframe: string
  /** What the picker says when the playhead is between two keyframes. */
  noKeyframeHere: string
  /** What the buttons that step to the keyframe before and after the playhead are called. */
  previousKeyframe: string
  nextKeyframe: string
  /** {t} is the playhead, in seconds. */
  atPlayhead: string
  /** Why the model of a body cannot be changed: it is chosen when the body is added. */
  modelFixed: string
  keyframeHere: string
  keyframeAdded: string
  /** Under the appearance fields. */
  appearanceNote: string
  deleteKeyframe: string
  /** What the picture does to the body on show. */
  pictureHint: string
  notPlaced: string
  primitive: Record<BodyPrimitive, string>
}
