import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_it = {
  heading: "Sensibilità:",
  hint: "Ciò che si confronta: ogni direzione o dimensione che la registrazione attribuisce al testimone dicendo su cosa si basa, con ciò che darebbe, visto dalla sua posizione e nello stesso istante, il corpo che la lettura colloca. Uno scarto è una contraddizione solo oltre l'incertezza di un testimone per quel tipo di stima. I margini dicono di quanto si può spostare ciascun valore supposto dalla lettura prima che riproduca meno: un margine stretto segnala una regolazione fine, uno ampio una lettura robusta. Un margine è sufficiente se copre almeno metà dell'incertezza del valore da ciascun lato, secondo le leggi di errore dei testimoni (un fattore 10 per una distanza supposta): non tutta, poiché l'accordo è già giudicato con quell'incertezza.",
  nothingToConfront: "niente da confrontare con il resoconto: nessun corpo della lettura dice quale fenomeno sia",
  noneSaid: "niente da confrontare: il resoconto non attribuisce al testimone, dicendo su cosa si basano, nessuna direzione né dimensione",
  noneAgrees: "non riproduce nessuna delle {compared} indicazioni del testimone",
  agreementOne: "riproduce 1 delle {compared} indicazioni del testimone",
  agreement: "riproduce {agreed} delle {compared} indicazioni del testimone",
  allAgree: "riproduce tutte le {compared} indicazioni del testimone",
  tooFew: "troppo poche per misurarne la robustezza",
  noFreeValue: "niente di supposto: nessun valore da spostare",
  tightest: "il più stretto: {knob}, da {lower} a {upper}",
  margin: "{knob}: regge da {lower} a {upper}; nessuna legge ne dice l'incertezza",
  marginJudged: "{knob}: regge da {lower} a {upper}, per un'incertezza da {refLower} a {refUpper} ({coverage} % coperto)",
  sufficient: "margine sufficiente",
  fineTuned: "regolazione fine: {knob} copre solo il {coverage} % della sua incertezza",
  atLeast: "{value} e oltre",
  better: "Un'altra regolazione ne riproduce di più: {knob} {amount}, {agreed} su {compared}",
  knobs: { azimuth: "direzione", altitude: "altezza", distance: "distanza", size: "dimensione", time: "istante" },
  comparison: {
    heading: "Letture a confronto ({n})",
    hint: "Una riga per lettura del caso, confrontata con il resoconto che legge, come dice la sensibilità di ciascuna lettura: quante indicazioni del testimone riproduce, lo scarto mediano tra ciò che ha detto il testimone e ciò che mostra la lettura (solo direzioni), se i suoi margini sono sufficienti e quanti valori ha supposto. Più valori una lettura suppone, più è facile ottenere una somiglianza.",
    reading: "Lettura",
    witness: "Legge",
    reproduced: "Riproduce",
    gap: "Scarto mediano",
    robustness: "Robustezza",
    supposed: "Valori supposti",
    loading: "…",
    nothing: "niente da confrontare",
    sufficient: "sufficiente",
    fineTuned: "regolazione fine ({knob})",
    tooFew: "troppo poco riprodotto",
    unjudged: "nessuna legge per giudicarla"
  }
} satisfies ReadingSensitivityMessages
