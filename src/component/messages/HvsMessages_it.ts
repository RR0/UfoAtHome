import type { HvsMessages } from "./HvsMessages.js"

export const hvsMessages_it = {
  heading: "Ipotesi pesate (HVS)",
  hint: "Il protocollo HVS di Stéphane Baron pesa ogni ipotesi per la sua copertura (CS), la parte degli elementi del fascicolo che spiega, e per la sua plausibilità (PS), indipendente dal caso: HVS = CS × PS, un valore preferito e il suo inviluppo, mai una probabilità. La CS grezza riguarda tutti gli elementi contati (le inferenze di associazione non lo sono), la CS discriminante solo quelli che separano le ipotesi; è questa a designare l'ipotesi dominante. Un'ipotesi è ritenuta solo se copre almeno la metà degli elementi. Una direzione o una dimensione che una lettura ricostruisce è spiegata o no secondo il suo confronto con la testimonianza; il resto, come lo dichiara l'analista. La plausibilità e il fattore di contesto sono quelli dell'analista: UFO@home non fornisce alcuna probabilità a priori.",
  credit: "Protocollo HVS {protocol} di Stéphane Baron",
  taxonomy: "tassonomia {taxonomy}",
  notSealed: "L'elenco degli elementi non è chiuso: deve esserlo prima di pesare le ipotesi.",
  noElements: "Nessun elemento: il fascicolo non ne elenca.",
  noHypotheses: "Nessuna ipotesi pesata.",
  iqi: {
    heading: "Qualità dell'informazione (IQI)",
    item: "{group}: {level}",
    total: "{sum} su {of}",
    groups: { dateTime: "Data e ora", place: "Luogo", identification: "Identificazione dei testimoni", witnesses: "Numero di testimoni", enquiry: "Indagine" },
    levels: { complete: "completo", partial: "parziale", absent: "assente" },
    unrated: "da valutare",
    suggested: "suggerito dal fascicolo"
  },
  elements: {
    heading: "Elementi",
    id: "Id",
    element: "Elemento",
    status: "Stato",
    statuses: { observed: "fatto osservato", inferred: "inferenza", association: "inferenza di associazione" },
    discriminating: "separa le ipotesi",
    explainedByReading: "spiegato: la lettura lo riproduce",
    notExplainedByReading: "non spiegato: la lettura non lo riproduce",
    explainedDeclared: "spiegato, secondo l'analista",
    notExplainedDeclared: "non spiegato, secondo l'analista"
  },
  hypotheses: {
    heading: "Ipotesi",
    code: "Codice",
    hypothesis: "Ipotesi",
    csRaw: "CS grezza",
    csDiscriminating: "CS discriminante",
    ps: "PS",
    hvs: "HVS",
    standing: "Tappa",
    score: "{preferred} [{low} – {high}]",
    retained: "ritenuta",
    notRetained: "non ritenuta",
    dominant: "dominante",
    identified: "stimolo identificato",
    proven: "prova sigillata",
    geometric: "media geometrica: un voto crolla",
    missing: "senza voto: {names}",
    ratings: { existence: "esistenza", frequency: "frequenza", compatibility: "compatibilità", context: "contesto" }
  },
  loading: "…"
} satisfies HvsMessages
