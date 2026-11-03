import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_it: EventsMessages = {
  title: "Eventi",
  derivedNote: "Le pose dell'osservatore sono calcolate da questi eventi. Spostare l'osservatore o girarne lo sguardo a mano scrive pose proprie, che prevalgono su di essi.",
  overriddenNote: "Le pose proprie di questa registrazione prevalgono sui suoi eventi.",
  derivedShapesNote: "Le forme del resoconto sono calcolate da ciò che ha fatto il fenomeno. Disegnarle a mano scrive forme proprie, che prevalgono su questi eventi.",
  overriddenShapesNote: "Le forme proprie di questa registrazione prevalgono sugli eventi del fenomeno.",
  parts: "{n} parti",
  resetToEvents: "Torna agli eventi",
  kinds: { drive: "Guida", lookAhead: "Guarda la strada", lean: "Si sporge", watch: "Guarda nello specchietto", stand: "Si trova", look: "Aspetto", blink: "Lampeggia", vanish: "Scompare" },
  params: {
    vehicle: "Veicolo", path: "Percorso", speeds: "Velocità", speedDivisors: "Velocità divise per", through: "Passa per", eye: "Occhio nel veicolo",
    fovDeg: "Campo visivo", target: "Guarda", pitchShare: "Alza lo sguardo fino a (parte della sua altezza)", keepDeg: "Lo tiene entro", glanceBeyondDeg: "Occhiate oltre",
    glanceS: "Occhiata", roadS: "Di nuovo sulla strada", offsetM: "Sposta l'occhio di", holdS: "Per", turnS: "In", mirror: "Specchietto", firstS: "Prima",
    mirrorS: "Nello specchietto", glancesUntil: "Occhiate dirette fino a",
    place: "Dove", metres: "Dimensione (larghezza, altezza sopra l'occhio)", parts: "Parti", onS: "Acceso", offS: "Spento", off: "Spento, è"
  },
  from: "da",
  to: "a",
  points: "{n} punti",
  at: "a",
  basis: { stated: "dichiarato", derived: "dedotto", assumed: "supposto", measured: "misurato" }
}
