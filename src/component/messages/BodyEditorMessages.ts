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
  /** A body added with no shape to stand for: where the witness is looking. */
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
  fromWitness: string
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

export class BodyEditorTexts {
  static readonly en: BodyEditorMessages = {
    intro: "What the witness said the phenomenon was, in 3D: each body stands for one or more of the shapes drawn. Its movement comes from the file.",
    interpretationTitle: "Interpretation",
    body: "Body",
    none: "No body yet: the witness said nothing of what it was, or it is still to be entered",
    deleteBody: "Delete body",
    addBody: "Add a body",
    addBodyHintView: "Where the witness is looking now",
    lookAtBody: "Look at it",
    addBodyHint: "Standing for the shape \"{shape}\", where the scene draws it now",
    id: "ID",
    title: "Name",
    explains: "Stands for the shapes",
    explainsNothing: "No shape",
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
    outlineNode: "Part drawn by the witness",
    outlineNodeHint: "Node of the model, e.g. hull",
    track: "Movement",
    trackEmpty: "No keyframe",
    trackSpan: "{n} keyframes, from {from} to {to}",
    trackSingle: "1 keyframe, at {at}",
    atPlayhead: "At {t}",
    keyframeHere: "A keyframe stands here: editing changes it",
    keyframeAdded: "Editing adds a keyframe here",
    placement: "Position",
    fromWitness: "From the witness",
    inWorld: "In the world",
    azimuth: "Azimuth (°)",
    elevation: "Elevation (°)",
    distance: "Distance (m)",
    east: "East (m)",
    north: "North (m)",
    onGround: "On the ground",
    aboveGround: "Above the ground (m)",
    width: "Width (m)",
    length: "Length (m)",
    height: "Height (m)",
    heading: "Heading (°)",
    pitch: "Pitch (°)",
    roll: "Roll (°)",
    colour: "Colour",
    albedo: "Albedo (0-1)",
    luminance: "Light of its own (cd/m²)",
    appearanceNote: "The colour and the albedo paint the built-in shapes; a model of its own keeps its materials. Light of its own is what it gives out, lit or not.",
    deleteKeyframe: "Delete this keyframe",
    pictureHint: "On the picture: drag the body to move it, the wheel takes it nearer or further, the corners and sides size it, the stem turns it (with Shift: up and down pitches it, sideways rolls it).",
    notPlaced: "Not in the scene at this instant",
    primitive: {
      ellipsoid: "Ellipsoid", sphere: "Sphere", disc: "Disc", cylinder: "Cylinder", cone: "Cone",
      box: "Box", torus: "Torus", figure: "Human figure"
    }
  }

  static readonly fr: BodyEditorMessages = {
    intro: "Ce que le témoin a dit que le phénomène était, en 3D : chaque corps représente une ou plusieurs des formes dessinées. Son mouvement vient du fichier.",
    interpretationTitle: "Interprétation",
    body: "Corps",
    none: "Aucun corps pour l'instant : le témoin n'a rien dit de ce que c'était, ou c'est encore à saisir",
    deleteBody: "Supprimer le corps",
    addBody: "Ajouter un corps",
    addBodyHintView: "Là où le témoin regarde à cet instant",
    lookAtBody: "Le regarder",
    addBodyHint: "Représentant la forme « {shape} », là où la scène la dessine à cet instant",
    id: "Identifiant",
    title: "Nom",
    explains: "Représente les formes",
    explainsNothing: "Aucune forme",
    model: "Modèle 3D",
    primitives: "Formes de base",
    catalogue: "Catalogue",
    modelAdvanced: "Modèle depuis une adresse",
    modelUrl: "Adresse glTF/GLB",
    modelUrlHint: "Absolue, ou relative à ce sighting.json",
    modelTitle: "Nom du modèle",
    modelAuthor: "Auteur",
    modelLicense: "Licence",
    modelSource: "Provenance",
    modelIncomplete: "Pas dessiné tant que le nom et la licence du modèle manquent",
    modelFromCatalogue: "Du catalogue, par lequel l'enregistrement le nomme. Modifiez un champ et il devient l'adresse propre à cet enregistrement.",
    outlineNode: "Partie dessinée par le témoin",
    outlineNodeHint: "Nœud du modèle, par ex. hull",
    track: "Mouvement",
    trackEmpty: "Aucune image clé",
    trackSpan: "{n} images clés, de {from} à {to}",
    trackSingle: "1 image clé, à {at}",
    atPlayhead: "À {t}",
    keyframeHere: "Une image clé est ici : l'éditer la modifie",
    keyframeAdded: "Éditer ajoute une image clé ici",
    placement: "Position",
    fromWitness: "Depuis le témoin",
    inWorld: "Dans le monde",
    azimuth: "Azimut (°)",
    elevation: "Hauteur (°)",
    distance: "Distance (m)",
    east: "Est (m)",
    north: "Nord (m)",
    onGround: "Au sol",
    aboveGround: "Au-dessus du sol (m)",
    width: "Largeur (m)",
    length: "Longueur (m)",
    height: "Hauteur (m)",
    heading: "Cap (°)",
    pitch: "Tangage (°)",
    roll: "Roulis (°)",
    colour: "Couleur",
    albedo: "Albédo (0-1)",
    luminance: "Lumière propre (cd/m²)",
    appearanceNote: "La couleur et l'albédo peignent les formes de base ; un modèle garde ses propres matériaux. La lumière propre est ce qu'il émet, éclairé ou non.",
    deleteKeyframe: "Supprimer cette image clé",
    pictureHint: "Sur l'image : glisser le corps le déplace, la molette le rapproche ou l'éloigne, les coins et les côtés le dimensionnent, la tige le tourne (avec Maj : haut et bas le cabrent, les côtés le font rouler).",
    notPlaced: "Pas dans la scène à cet instant",
    primitive: {
      ellipsoid: "Ellipsoïde", sphere: "Sphère", disc: "Disque", cylinder: "Cylindre", cone: "Cône",
      box: "Boîte", torus: "Tore", figure: "Silhouette humaine"
    }
  }

  static of(language: string): BodyEditorMessages {
    return language === "fr" ? BodyEditorTexts.fr : BodyEditorTexts.en
  }
}
