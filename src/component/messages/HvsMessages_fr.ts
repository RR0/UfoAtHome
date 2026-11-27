import type { HvsMessages } from "./HvsMessages.js"

export const hvsMessages_fr = {
  heading: "Hypothèses pesées (HVS)",
  hint: "Le protocole HVS de Stéphane Baron pèse chaque hypothèse par sa couverture (CS), la part des éléments du dossier qu'elle explique, et par sa plausibilité (PS), indépendante du cas : HVS = CS × PS, une valeur préférée et son enveloppe, jamais une probabilité. La CS brute porte sur tous les éléments comptés (les inférences d'association ne le sont pas), la CS discriminante sur ceux qui séparent les hypothèses ; c'est elle qui désigne l'hypothèse dominante. Une hypothèse n'est retenue que si elle couvre au moins la moitié des éléments. Une direction ou une taille qu'une lecture reconstitue est expliquée ou non selon sa confrontation au témoignage ; le reste, comme le déclare l'analyste. La plausibilité et le facteur de contexte sont ceux de l'analyste : UFO@home ne fournit aucune probabilité a priori.",
  credit: "Protocole HVS {protocol} de Stéphane Baron",
  taxonomy: "taxonomie {taxonomy}",
  notSealed: "La liste des éléments n'est pas arrêtée : elle doit l'être avant de peser les hypothèses.",
  noElements: "Aucun élément : le dossier n'en liste pas.",
  noHypotheses: "Aucune hypothèse pesée.",
  iqi: {
    heading: "Qualité de l'information (IQI)",
    item: "{group} : {level}",
    total: "{sum} sur {of}",
    groups: { dateTime: "Date et heure", place: "Lieu", identification: "Identification des témoins", witnesses: "Nombre de témoins", enquiry: "Enquête" },
    levels: { complete: "complet", partial: "partiel", absent: "absent" },
    unrated: "à évaluer",
    suggested: "suggéré d'après le dossier"
  },
  elements: {
    heading: "Éléments",
    id: "Id",
    element: "Élément",
    status: "Statut",
    statuses: { observed: "fait observé", inferred: "inférence", association: "inférence d'association" },
    discriminating: "sépare les hypothèses",
    explainedByReading: "expliqué : la lecture le reproduit",
    notExplainedByReading: "non expliqué : la lecture ne le reproduit pas",
    explainedDeclared: "expliqué, selon l'analyste",
    notExplainedDeclared: "non expliqué, selon l'analyste"
  },
  hypotheses: {
    heading: "Hypothèses",
    code: "Code",
    hypothesis: "Hypothèse",
    csRaw: "CS brute",
    csDiscriminating: "CS discriminante",
    ps: "PS",
    hvs: "HVS",
    standing: "Jalon",
    score: "{preferred} [{low} – {high}]",
    retained: "retenue",
    notRetained: "non retenue",
    dominant: "dominante",
    identified: "stimulus identifié",
    proven: "preuve scellée",
    geometric: "moyenne géométrique : une cote s'effondre",
    missing: "non coté : {names}",
    ratings: { existence: "existence", frequency: "fréquence", compatibility: "compatibilité", context: "contexte" }
  },
  loading: "…"
} satisfies HvsMessages
