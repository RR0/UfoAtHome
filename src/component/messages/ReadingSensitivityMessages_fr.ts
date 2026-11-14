import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_fr = {
  heading: "Sensibilité :",
  hint: "Ce qui est comparé : chaque direction ou taille que l'enregistrement attribue au témoin en disant sur quoi elle repose, et ce que donnerait, vu de sa position et au même instant, le corps que place la lecture. Un écart n'est une contradiction qu'au-delà de l'incertitude d'un témoin pour ce type d'estimation. Les marges disent de combien on peut décaler chaque valeur supposée par la lecture avant qu'elle reproduise moins : une marge étroite signale un réglage fin, une marge large une lecture robuste. Une marge est suffisante si elle couvre au moins la moitié de l'incertitude de la valeur de chaque côté, d'après les lois d'erreur des témoins (un facteur 10 pour une distance supposée) : pas la totalité, puisque l'accord est déjà jugé avec cette incertitude.",
  nothingToConfront: "rien à confronter au compte rendu : aucun corps de la lecture ne dit quel phénomène il est",
  noneSaid: "rien à confronter : le compte rendu n'attribue au témoin, en disant sur quoi elles reposent, aucune direction ni taille",
  noneAgrees: "ne reproduit aucune des {compared} indications du témoin",
  agreementOne: "reproduit 1 des {compared} indications du témoin",
  agreement: "reproduit {agreed} des {compared} indications du témoin",
  allAgree: "reproduit les {compared} indications du témoin",
  tooFew: "trop peu pour mesurer sa robustesse",
  noFreeValue: "rien de supposé : aucune valeur à décaler",
  tightest: "le plus serré : {knob}, de {lower} à {upper}",
  margin: "{knob} : tient de {lower} à {upper} ; aucune loi ne dit son incertitude",
  marginJudged: "{knob} : tient de {lower} à {upper}, pour une incertitude de {refLower} à {refUpper} ({coverage} % couverts)",
  sufficient: "marge suffisante",
  fineTuned: "réglage fin : {knob} ne couvre que {coverage} % de son incertitude",
  atLeast: "{value} et au-delà",
  better: "Un autre réglage en reproduit davantage : {knob} {amount}, {agreed} sur {compared}",
  knobs: { azimuth: "direction", altitude: "hauteur", distance: "distance", size: "taille", time: "instant" }
} satisfies ReadingSensitivityMessages
