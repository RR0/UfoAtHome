import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_it = {
  heading: "Sensibilità:",
  hint: "Ciò che si confronta: ogni direzione o dimensione che la registrazione attribuisce al testimone dicendo su cosa si basa, con ciò che darebbe, visto dalla sua posizione e nello stesso istante, il corpo che la lettura colloca. Uno scarto è una contraddizione solo oltre l'incertezza di un testimone per quel tipo di stima. I margini dicono di quanto si può spostare ciascun valore supposto dalla lettura prima che riproduca meno: un margine stretto segnala una regolazione fine, uno ampio una lettura robusta.",
  nothingToConfront: "niente da confrontare con il resoconto: nessun corpo della lettura dice quale fenomeno sia",
  noneSaid: "niente da confrontare: il resoconto non attribuisce al testimone, dicendo su cosa si basano, nessuna direzione né dimensione",
  noneAgrees: "non riproduce nessuna delle {compared} indicazioni del testimone",
  agreementOne: "riproduce 1 delle {compared} indicazioni del testimone",
  agreement: "riproduce {agreed} delle {compared} indicazioni del testimone",
  allAgree: "riproduce tutte le {compared} indicazioni del testimone",
  tooFew: "troppo poche per misurarne la robustezza",
  noFreeValue: "niente di supposto: nessun valore da spostare",
  tightest: "il più stretto: {knob}, da {lower} a {upper}",
  margin: "{knob}: regge da {lower} a {upper}",
  atLeast: "{value} e oltre",
  better: "Un'altra regolazione ne riproduce di più: {knob} {amount}, {agreed} su {compared}",
  knobs: { azimuth: "direzione", altitude: "altezza", distance: "distanza", size: "dimensione", time: "istante" }
} satisfies ReadingSensitivityMessages
