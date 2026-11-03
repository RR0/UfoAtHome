import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_fr: EventsMessages = {
  title: "Événements",
  derivedNote: "Les poses de l'observateur sont calculées à partir de ces événements. Déplacer l'observateur ou tourner son regard à la main écrit vos propres poses, qui l'emportent sur eux.",
  overriddenNote: "Les poses propres à cet enregistrement l'emportent sur ses événements.",
  derivedShapesNote: "Les formes du compte rendu sont calculées à partir de ce qu'a fait le phénomène. Les dessiner à la main écrit vos propres formes, qui l'emportent sur ces événements.",
  overriddenShapesNote: "Les formes propres à cet enregistrement l'emportent sur les événements du phénomène.",
  parts: "{n} parties",
  resetToEvents: "Revenir aux événements",
  kinds: { drive: "Conduit", lookAhead: "Regarde la route", lean: "Se penche", watch: "Regarde dans le rétroviseur", stand: "Se tient", look: "Regarde", appearance: "Aspect", walk: "Marche", follow: "Suit des yeux", blink: "Clignote", vanish: "Disparaît" },
  params: {
    vehicle: "Véhicule", path: "Trajet", speeds: "Vitesses", speedDivisors: "Vitesses divisées par", through: "Passe par", eye: "Œil dans le véhicule",
    fovDeg: "Champ de vision", target: "Regarde", pitchShare: "Lève les yeux jusqu'à (part de sa hauteur)", keepDeg: "Le garde à moins de", glanceBeyondDeg: "Coups d'œil au-delà de",
    glanceS: "Coup d'œil", roadS: "Retour sur la route", offsetM: "Déplace l'œil de", holdS: "Pendant", turnS: "En", mirror: "Rétroviseur", firstS: "D'abord",
    mirrorS: "Dans le rétroviseur", glancesUntil: "Coups d'œil directs jusqu'à",
    place: "Où", metres: "Taille (largeur, hauteur au-dessus de l'œil)", parts: "Parties", from: "De", to: "À", onS: "Allumé", offS: "Éteint", off: "Éteint, il est", headingDeg: "Cap", pitchDeg: "Inclinaison"
  },
  from: "de",
  to: "à",
  points: "{n} points",
  at: "à",
  basis: { stated: "énoncé", derived: "dérivé", assumed: "supposé", measured: "mesuré" }
}
