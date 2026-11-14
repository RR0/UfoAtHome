import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_it = {
  heading: "Sensibilità:",
  hint: "Fin dove può variare ciascun valore supposto dalla lettura prima che riproduca meno del resoconto. Una somiglianza che regge solo entro pochi decimi di grado è stata aggiustata, non trovata. L'incertezza del testimone non varia: è già in ciò che conta come contraddizione.",
  nothingToConfront: "niente da confrontare con il resoconto: nessun corpo della lettura dice quale fenomeno sia",
  noneAgrees: "non riproduce nessuno dei {compared} confronti",
  agreement: "riproduce {agreed} confronti su {compared}",
  agreementOne: "riproduce 1 confronto su {compared}",
  allAgree: "riproduce tutti i {compared} confronti",
  noFreeValue: "niente di supposto: nessun valore da far variare",
  tightest: "il più fragile: {knob}, da {lower} a {upper}",
  margin: "{knob}: da {lower} a {upper}",
  atLeast: "{value} e oltre",
  better: "Un'altra regolazione riproduce di più: {knob} a {amount}, {agreed} su {compared}",
  knobs: { azimuth: "direzione", altitude: "altezza", distance: "distanza", size: "dimensione", time: "istante" }
} satisfies ReadingSensitivityMessages
