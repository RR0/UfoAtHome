import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_es: EventsMessages = {
  title: "Eventos",
  derivedNote: "Las poses del observador se calculan a partir de estos eventos. Mover al observador o girar su mirada a mano escribe poses propias, que prevalecen sobre ellos.",
  overriddenNote: "Las poses propias de esta grabación prevalecen sobre sus eventos.",
  resetToEvents: "Volver a los eventos",
  kinds: { drive: "Conduce", lookAhead: "Mira la carretera", lean: "Se inclina", watch: "Mira por el retrovisor" },
  params: {
    vehicle: "Vehículo", path: "Trayecto", speeds: "Velocidades", speedDivisors: "Velocidades divididas por", through: "Pasa por", eye: "Ojo en el vehículo",
    fovDeg: "Campo de visión", target: "Mira", pitchShare: "Alza la vista hasta (parte de su altura)", keepDeg: "Lo mantiene a menos de", glanceBeyondDeg: "Vistazos más allá de",
    glanceS: "Vistazo", roadS: "De vuelta a la carretera", offsetM: "Desplaza el ojo", holdS: "Durante", turnS: "En", mirror: "Retrovisor", firstS: "Primero",
    mirrorS: "En el retrovisor", glancesUntil: "Vistazos directos hasta"
  },
  from: "de",
  to: "a",
  points: "{n} puntos",
  at: "a",
  basis: { stated: "declarado", derived: "deducido", assumed: "supuesto", measured: "medido" }
}
