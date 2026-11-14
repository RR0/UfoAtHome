import type { CaseExportMessages } from "./CaseExportMessages.js"

export const caseExportMessages_fr = {
  button: "Rapport",
  hint: "Exporter un rapport du dossier : indications des témoins, lectures comparées, constats, sensibilité et figures",
  html: "Rapport (HTML)",
  print: "Imprimer ou PDF",
  json: "Résultats (JSON)",
  csv: "Tableaux (CSV)",
  htmlHint: "Une page autonome, à ouvrir, archiver ou reprendre dans un traitement de texte",
  printHint: "Le même rapport, à imprimer ou à enregistrer en PDF depuis le navigateur",
  jsonHint: "Toutes les données et tous les résultats calculés, pour d'autres outils",
  csvHint: "Un fichier par tableau, pour un tableur, réunis dans un zip",
  pictures: "Inclure des vues de la scène",
  picturesHint: "Plus long : la scène est simulée et photographiée pour chaque témoin et chaque lecture",
  drawing: "Vues de la scène : {done} sur {total}…",
  working: "Calcul du rapport…",
  failed: "Le rapport n'a pas pu être établi."
} satisfies CaseExportMessages
