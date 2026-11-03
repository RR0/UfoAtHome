import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_it: EventsMessages = {
  title: "Eventi",
  derivedNote: "Le pose dell'osservatore sono calcolate da questi eventi. Spostare l'osservatore o girarne lo sguardo a mano scrive pose proprie, che prevalgono su di essi.",
  overriddenNote: "Le pose proprie di questa registrazione prevalgono sui suoi eventi.",
  resetToEvents: "Torna agli eventi",
  kinds: { drive: "Guida", lookAhead: "Guarda la strada", lean: "Si sporge", watch: "Guarda nello specchietto" },
  params: {
    vehicle: "Veicolo", path: "Percorso", speeds: "Velocità", speedDivisors: "Velocità divise per", through: "Passa per", eye: "Occhio nel veicolo",
    fovDeg: "Campo visivo", target: "Guarda", pitchShare: "Alza lo sguardo fino a (parte della sua altezza)", keepDeg: "Lo tiene entro", glanceBeyondDeg: "Occhiate oltre",
    glanceS: "Occhiata", roadS: "Di nuovo sulla strada", offsetM: "Sposta l'occhio di", holdS: "Per", turnS: "In", mirror: "Specchietto", firstS: "Prima",
    mirrorS: "Nello specchietto", glancesUntil: "Occhiate dirette fino a"
  },
  from: "da",
  to: "a",
  points: "{n} punti",
  at: "a",
  basis: { stated: "dichiarato", derived: "dedotto", assumed: "supposto", measured: "misurato" }
}
