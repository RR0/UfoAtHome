import type { DroneEditorMessages } from "./DroneEditorMessages.js"

export const droneEditorMessages_it = {
  intro: "Droni, come lettura del resoconto: ciò che ha visto era un drone, o più d'uno. Ognuno vola la propria traiettoria, calcolata dalla sua cellula e dal suo tragitto: si ferma dove il tragitto si ferma, si inclina verso dove va e contro il vento, e le sue luci lampeggiano come fanno — calcolato, non disegnato.",
  none: "Nessun drone in questa registrazione",
  drone: "Droni",
  deleteDrone: "Elimina questi droni",
  addDrone: "Aggiungi un drone",
  addNowhere: "Dai prima un luogo alla registrazione: un drone viene posto davanti al testimone",
  explainsEachNote: "Questi droni rappresentano ciascuno una forma del resoconto, {n} nel loro ordine: cambia quali nel file della registrazione.",
  path: "Tragitto",
  deletePoint: "Rimuovi questo punto",
  timelineNote: "Sulla linea del tempo, un rombo premuto è il punto del tragitto mostrato sotto, e la scena va al suo istante; trascinalo per spostarlo nel tempo. Il «+» mette un punto alla testina, dove si trova allora il drone. Due punti nello stesso posto sono un volo stazionario: un multirotore vi si ferma, come al primo punto e all'ultimo.",
  addPointHere: "Aggiungi un punto qui, alla testina",
  pointHere: "C'è un punto alla testina: premilo per modificarlo",
  zoomHint: "Pizzica, o Ctrl + rotella, per ingrandire; Maiusc + rotella per scorrere",
  derivedNote: "Un campo vuoto mostra, in grigio, il valore in uso: quello della sua cellula per il colore e le luci. Svuota un campo per tornarvi."
} satisfies DroneEditorMessages
