import type { BodyEditorMessages } from "./BodyEditorMessages.js"

export const bodyEditorMessages_en: BodyEditorMessages = {
  intro: "What the observer said the phenomenon was, in 3D: each body stands for one or more of the shapes drawn. Its movement comes from the file.",
  interpretationTitle: "Interpretation title",
  body: "Body",
  none: "No body yet: the observer said nothing of what it was, or it is still to be entered",
  deleteBody: "Delete body",
  addBody: "Add a body",
  addBodyHintView: "Where the observer is looking now",
  lookAtBody: "Look at it",
  addBodyHint: "Standing for the shape \"{shape}\", where the scene draws it now",
  model: "3D model",
  primitives: "Built-in shapes",
  catalogue: "Catalogue",
  modelAdvanced: "Model from an address",
  modelUrl: "glTF/GLB address",
  modelUrlHint: "Absolute, or relative to this sighting.json",
  modelTitle: "Model name",
  modelAuthor: "Author",
  modelLicense: "Licence",
  modelSource: "Where it came from",
  modelIncomplete: "Not drawn until the model's name and licence are given",
  modelFromCatalogue: "From the catalogue, which the recording names it by. Change a field and it becomes this recording's own address.",
  keyframes: "Keyframes",
  addKeyframe: "Add a keyframe at this instant",
  noKeyframeHere: "No keyframe at this instant",
  atPlayhead: "At {t}",
  keyframeHere: "A keyframe stands here: editing changes it",
  keyframeAdded: "Editing adds a keyframe here",
  appearanceNote: "The colour and the albedo paint the built-in shapes; a model of its own keeps its materials. Light of its own is what it gives out, lit or not.",
  deleteKeyframe: "Delete this keyframe",
  pictureHint: "On the picture: drag the body to move it, the wheel takes it nearer or further, the corners and sides size it, the stem turns it (with Shift: up and down pitches it, sideways rolls it).",
  notPlaced: "Not in the scene at this instant",
  primitive: {
    ellipsoid: "Ellipsoid", sphere: "Sphere", disc: "Disc", cylinder: "Cylinder", cone: "Cone",
    box: "Box", torus: "Torus", figure: "Human figure"
  }
}
