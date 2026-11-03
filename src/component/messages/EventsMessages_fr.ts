import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_fr: EventsMessages = {
  title: "Événements",
  derivedNote: "Les poses de l'observateur sont calculées à partir de ces événements. Déplacer l'observateur ou tourner son regard à la main écrit vos propres poses, qui l'emportent sur eux.",
  overriddenNote: "Les poses propres à cet enregistrement l'emportent sur ses événements.",
  resetToEvents: "Revenir aux événements",
  kinds: { drive: "Conduit", lookAhead: "Regarde la route", lean: "Se penche", watch: "Regarde dans le rétroviseur" },
  params: {
    vehicle: "Véhicule", path: "Trajet", speeds: "Vitesses", speedDivisors: "Vitesses divisées par", through: "Passe par", eye: "Œil dans le véhicule",
    fovDeg: "Champ de vision", target: "Regarde", pitchShare: "Lève les yeux jusqu'à (part de sa hauteur)", keepDeg: "Le garde à moins de", glanceBeyondDeg: "Coups d'œil au-delà de",
    glanceS: "Coup d'œil", roadS: "Retour sur la route", offsetM: "Déplace l'œil de", holdS: "Pendant", turnS: "En", mirror: "Rétroviseur", firstS: "D'abord",
    mirrorS: "Dans le rétroviseur", glancesUntil: "Coups d'œil directs jusqu'à"
  },
  from: "de",
  to: "à",
  points: "{n} points",
  at: "à",
  basis: { stated: "énoncé", derived: "dérivé", assumed: "supposé", measured: "mesuré" }
}
