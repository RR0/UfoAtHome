import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_it: EventsMessages = {
  title: "Eventi dell'osservatore",
  phenomenonTitle: "Eventi del fenomeno",
  bodyTitle: "Eventi di {body}",
  derivedNote: "Le pose dell'osservatore sono calcolate da questi eventi. Spostare l'osservatore o girarne lo sguardo a mano scrive pose proprie, che prevalgono su di essi.",
  overriddenNote: "Le pose proprie di questa registrazione prevalgono sui suoi eventi.",
  derivedShapesNote: "Le forme del resoconto sono calcolate da ciò che ha fatto il fenomeno. Disegnarle a mano scrive forme proprie, che prevalgono su questi eventi.",
  overriddenShapesNote: "Le forme proprie di questa registrazione prevalgono sugli eventi del fenomeno.",
  parts: "{n} parti",
  derivedBodiesNote: "I fotogrammi chiave di questi corpi sono calcolati da ciò che hanno fatto. I fotogrammi chiave posti a mano prevalgono su questi eventi.",
  overriddenBodiesNote: "Fotogrammi chiave propri prevalgono su questi eventi.",
  add: "Aggiungi un evento", remove: "Elimina l'evento", none: "Nessun evento",
  resetToEvents: "Torna agli eventi",
  kinds: { drive: "Guida", lookAhead: "Guarda la strada", lean: "Si sporge", watch: "Guarda nello specchietto", stand: "Si trova", look: "Guarda", appearance: "Aspetto", walk: "Cammina", follow: "Segue con lo sguardo", blink: "Lampeggia", vanish: "Scompare", motion: "Si muove", spin: "Gira", rise: "Si alza", ride: "Viaggia in" },
  params: {
    vehicle: "Veicolo", path: "Percorso", speeds: "Velocità", speedDivisors: "Velocità divise per", through: "Passa per", eye: "Occhio nel veicolo",
    fovDeg: "Campo visivo", target: "Guarda", pitchShare: "Alza lo sguardo fino a (parte della sua altezza)", keepDeg: "Lo tiene entro", glanceBeyondDeg: "Occhiate oltre",
    glanceS: "Occhiata", roadS: "Di nuovo sulla strada", offsetM: "Sposta l'occhio di", holdS: "Per", turnS: "In", mirror: "Specchietto", firstS: "Prima",
    mirrorS: "Nello specchietto", glancesUntil: "Occhiate dirette fino a",
    place: "Dove", metres: "Dimensione (larghezza, altezza sopra l'occhio)", parts: "Parti", onS: "Acceso", offS: "Spento", off: "Spento, è", motion: "Movimento", turnsPerS: "Giri al secondo", distanceM: "Distanza", angleDeg: "Scarto dalla verticale", stops: "Si ferma", in: "In", aboveM: "Sopra", from: "Da", to: "A", headingDeg: "Rotta", pitchDeg: "Inclinazione"
  },
  from: "da",
  to: "a",
  points: "{n} punti",
  at: "a",
  basis: { stated: "dichiarato", derived: "dedotto", assumed: "supposto", measured: "misurato" }
}
