import type { CaseExportMessages } from "./CaseExportMessages.js"

export const caseExportMessages_it = {
  button: "Rapporto",
  hint: "Esportare un rapporto del caso: indicazioni dei testimoni, letture a confronto, constatazioni, sensibilità e figure",
  html: "Rapporto (HTML)",
  print: "Stampa o PDF",
  json: "Risultati (JSON)",
  csv: "Tabelle (CSV)",
  htmlHint: "Una pagina autonoma, da aprire, archiviare o riprendere in un programma di videoscrittura",
  printHint: "Lo stesso rapporto, da stampare o salvare in PDF dal browser",
  jsonHint: "Tutti i dati e tutti i risultati calcolati, per altri strumenti",
  csvHint: "Un file per tabella, per un foglio di calcolo, riuniti in uno zip",
  pictures: "Includere viste della scena",
  picturesHint: "Più lungo: la scena viene simulata e fotografata per ciascun testimone e ciascuna lettura",
  drawing: "Viste della scena: {done} su {total}…",
  working: "Elaborazione del rapporto…",
  failed: "Non è stato possibile elaborare il rapporto."
} satisfies CaseExportMessages
