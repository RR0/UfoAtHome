import type { CloudEditorMessages } from "./CloudEditorMessages.js"

export const cloudEditorMessages_it: CloudEditorMessages = {
  intro: "I dati meteorologici forniscono la copertura e il vento quando sono disponibili. Forma, spessore e dimensione delle nuvole sono stime visive, non nuvole singole misurate.",
  editScope: "Ambito delle modifiche",
  scopeInstant: "Istante corrente",
  scopeObservation: "Tutta l’osservazione",
  layer: "Strato",
  addLayer: "Aggiungi strato",
  deleteLayer: "Elimina strato",
  editHelp: "La modifica mette in pausa la riproduzione e salva all’istante meteorologico corrente. Un vento di strato vuoto riprende il vento generale. Tutta l’osservazione applica la proprietà modificata a ogni fotogramma chiave meteorologico.",
  individualClouds: "Nuvole singole",
  individualCloud: "Nuvola singola",
  addIndividualCloud: "Aggiungi nuvola singola",
  pointAtCloud: "Punta la nuvola",
  deleteCloud: "Elimina nuvola",
  manipulate: "Seleziona e trascina le nuvole nel cielo",
  individualHelp: "Le nuvole singole restano presenti allo 0 % di copertura globale. Il trascinamento cambia posizione e quota; i campi numerici fissano con precisione le dimensioni. Le nuvole seguono il vento del loro strato.",
  none: "Nessuna",
  cloud: "Nuvola",
  savedAcrossObservation: "Salvato su tutta l’osservazione; venti conservati.",
  savedAtThisTime: "Meteo salvato in questo istante.",
  noCloudHere: "Nessuna nuvola singola qui.",
  cloudSelected: "Nuvola selezionata. Trascinala per spostarla.",
  cloudAdded: " Nuvola singola aggiunta, indipendente dalla copertura globale."
}
