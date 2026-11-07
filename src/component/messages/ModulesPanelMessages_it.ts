import type { ModulesPanelMessages } from "./ModulesPanelMessages.js"

export const modulesPanelMessages_it: ModulesPanelMessages = {
  intro: "Un modulo aggiunge fonti (immagini, rilievo, meteo…) e modelli 3D pubblicati da altri. I moduli che aggiungi sono conservati in questo browser; salvali in un file per ritrovarli altrove.",
  codeWarning: "Un modulo che contiene codice viene eseguito con tutti i diritti di questa pagina: aggiungi solo quelli di cui conosci l'autore.",
  urlPlaceholder: "https://…/ufoathome-module.json",
  add: "Aggiungi",
  none: "Nessun modulo.",
  remove: "Rimuovi",
  enabled: "Attivo",
  namedByRecording: "Citato da questa registrazione",
  namedByRecordingHint: "Chi apre la registrazione carica questo modulo, perché i modelli che ne prende siano disegnati. Il suo codice, se ne ha, viene eseguito solo per chi lo ha aggiunto.",
  addToMine: "Aggiungi ai miei moduli",
  loading: "Caricamento…",
  failed: "Impossibile caricarlo: {error}",
  off: "Inattivo",
  brings: "Porta: {points}",
  bringsNothing: "Non porta nulla.",
  runsCode: "Esegue codice.",
  codeNotRun: "Il suo codice non è stato eseguito: aggiungilo ai tuoi moduli per eseguirlo.",
  exportConfig: "Salva i miei moduli",
  importConfig: "Carica moduli",
  imported: "{count} modulo/i letto/i dal file.",
  importFailed: "Questo file non è un elenco di moduli: {error}",
  points: {
    weather: "meteo", place: "luoghi", timeZone: "fusi orari", narrative: "redazione", assessment: "valutazioni",
    lightPollution: "inquinamento luminoso", aircraft: "traffico aereo", upperAir: "aria in quota", elevation: "rilievo", imagery: "immagini",
    surroundings: "dintorni", decorModels: "modelli 3D"
  }
}
