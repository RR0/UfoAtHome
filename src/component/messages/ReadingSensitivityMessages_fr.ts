import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_fr = {
  heading: "Sensibilité :",
  hint: "Jusqu'où chaque valeur supposée par la lecture peut varier avant qu'elle reproduise moins du compte rendu. Une ressemblance qui ne tient qu'à quelques dixièmes de degré a été ajustée, pas trouvée. L'incertitude du témoin ne varie pas : elle est déjà dans ce qui compte comme contradiction.",
  nothingToConfront: "rien à confronter au compte rendu : aucun corps de la lecture ne dit quel phénomène il est",
  noneAgrees: "ne reproduit aucune des {compared} comparaisons",
  agreement: "reproduit {agreed} comparaisons sur {compared}",
  agreementOne: "reproduit 1 comparaison sur {compared}",
  allAgree: "reproduit les {compared} comparaisons",
  noFreeValue: "rien de supposé : aucune valeur à faire varier",
  tightest: "le plus fragile : {knob}, de {lower} à {upper}",
  margin: "{knob} : de {lower} à {upper}",
  atLeast: "{value} et au-delà",
  better: "Un autre réglage reproduit davantage : {knob} à {amount}, {agreed} sur {compared}",
  knobs: { azimuth: "direction", altitude: "hauteur", distance: "distance", size: "taille", time: "instant" }
} satisfies ReadingSensitivityMessages
