import type { ModulesPanelMessages } from "./ModulesPanelMessages.js"

export const modulesPanelMessages_fr: ModulesPanelMessages = {
  intro: "Un module ajoute des sources (imagerie, relief, météo…) et des modèles 3D publiés par d'autres. Les modules que vous ajoutez sont gardés dans ce navigateur ; enregistrez-les dans un fichier pour les retrouver ailleurs.",
  codeWarning: "Un module qui contient du code s'exécute avec tous les droits de cette page : n'ajoutez que ceux dont vous connaissez l'auteur.",
  urlPlaceholder: "https://…/ufoathome-module.json",
  add: "Ajouter",
  none: "Aucun module.",
  remove: "Retirer",
  enabled: "Actif",
  namedByRecording: "Nommé par cet enregistrement",
  namedByRecordingHint: "Qui ouvre l'enregistrement charge ce module, pour que les modèles qu'il y prend soient dessinés. Son code, s'il en a, ne s'exécute que pour qui l'a ajouté lui-même.",
  addToMine: "Ajouter à mes modules",
  loading: "Chargement…",
  failed: "Chargement impossible : {error}",
  off: "Inactif",
  brings: "Apporte : {points}",
  bringsNothing: "N'apporte rien.",
  runsCode: "Exécute du code.",
  codeNotRun: "Son code n'a pas été exécuté : ajoutez-le à vos modules pour l'exécuter.",
  exportConfig: "Enregistrer mes modules",
  importConfig: "Charger des modules",
  imported: "{count} module(s) lu(s) dans le fichier.",
  importFailed: "Ce fichier n'est pas une liste de modules : {error}",
  points: {
    weather: "météo", place: "lieux", timeZone: "fuseaux horaires", narrative: "rédaction", assessment: "évaluations",
    lightPollution: "pollution lumineuse", aircraft: "trafic aérien", upperAir: "air en altitude", elevation: "relief", imagery: "imagerie",
    surroundings: "environs", perception: "perception", interpretations: "interprétations", skyEvents: "événements du ciel", decorModels: "modèles 3D"
  }
}
