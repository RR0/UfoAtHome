import type { AuroraParameterTexts } from "./AuroraParameterTexts.js"

export const auroraParameterTexts_fr: AuroraParameterTexts = {
  aurora: "Aurore",
  name: "Nom",
  field: "Champ magnétique",
  light: "Lumière",
  when: "Quand",
  kp: "Indice Kp",
  kpHint: "Le degré d'agitation du champ magnétique terrestre, de 0 (calme) à 9 (tempête extrême), tel que le donne l'indice planétaire ; au-delà de 9, l'indice Hp du GFZ, sans plafond.",
  edge: "Bord côté équateur",
  edgeHint: "La latitude géomagnétique du bord de l'ovale le plus proche de l'équateur, à minuit magnétique : à donner quand on la connaît autrement que par Kp, qui s'arrête à 9.",
  arcs: "Arcs",
  arcsHint: "Le nombre d'arcs distincts dans l'ovale ; 0 pour une simple lueur diffuse.",
  arcBrightness: "Éclat des arcs",
  arcBrightnessHint: "En kilorayleighs de la raie verte sur la hauteur d'un arc : 1, l'éclat de la Voie lactée ; 10, un cirrus fin au clair de lune ; 100, un cumulus au clair de lune ; 1 000 éclaire le sol comme la pleine Lune.",
  red: "Rouge d'orage",
  redHint: "En kilorayleighs de la raie rouge haute d'un orage magnétique, ce dont est surtout faite une aurore vue de loin vers l'équateur.",
  from: "De",
  fromHint: "Secondes de l'enregistrement, négatives avant son début. Depuis le début si vide.",
  until: "À",
  untilHint: "Secondes de l'enregistrement. Jusqu'à la fin si vide."
} satisfies AuroraParameterTexts
