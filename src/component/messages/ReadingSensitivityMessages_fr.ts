import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_fr = {
  heading: "Sensibilité :",
  hint: "Ce qui est comparé : chaque direction ou taille que l'enregistrement attribue au témoin en disant sur quoi elle repose, et ce que donnerait, vu de sa position et au même instant, le corps que place la lecture. Un écart n'est une contradiction qu'au-delà de l'incertitude d'un témoin pour ce type d'estimation. Les marges disent de combien on peut décaler chaque valeur supposée par la lecture avant qu'elle reproduise moins : une marge étroite signale un réglage fin, une marge large une lecture robuste.",
  nothingToConfront: "rien à confronter au compte rendu : aucun corps de la lecture ne dit quel phénomène il est",
  noneSaid: "rien à confronter : le compte rendu n'attribue au témoin, en disant sur quoi elles reposent, aucune direction ni taille",
  noneAgrees: "ne reproduit aucune des {compared} indications du témoin",
  agreementOne: "reproduit 1 des {compared} indications du témoin",
  agreement: "reproduit {agreed} des {compared} indications du témoin",
  allAgree: "reproduit les {compared} indications du témoin",
  tooFew: "trop peu pour mesurer sa robustesse",
  noFreeValue: "rien de supposé : aucune valeur à décaler",
  tightest: "le plus serré : {knob}, de {lower} à {upper}",
  margin: "{knob} : tient de {lower} à {upper}",
  atLeast: "{value} et au-delà",
  better: "Un autre réglage en reproduit davantage : {knob} {amount}, {agreed} sur {compared}",
  knobs: { azimuth: "direction", altitude: "hauteur", distance: "distance", size: "taille", time: "instant" }
} satisfies ReadingSensitivityMessages
