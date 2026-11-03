import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_es: EventsMessages = {
  title: "Eventos",
  derivedNote: "Las poses del observador se calculan a partir de estos eventos. Mover al observador o girar su mirada a mano escribe poses propias, que prevalecen sobre ellos.",
  overriddenNote: "Las poses propias de esta grabación prevalecen sobre sus eventos.",
  derivedShapesNote: "Las formas del relato se calculan a partir de lo que hizo el fenómeno. Dibujarlas a mano escribe formas propias, que prevalecen sobre estos eventos.",
  overriddenShapesNote: "Las formas propias de esta grabación prevalecen sobre los eventos del fenómeno.",
  parts: "{n} partes",
  resetToEvents: "Volver a los eventos",
  kinds: { drive: "Conduce", lookAhead: "Mira la carretera", lean: "Se inclina", watch: "Mira por el retrovisor", stand: "Se sitúa", look: "Mira", appearance: "Aspecto", walk: "Camina", follow: "Sigue con la mirada", blink: "Parpadea", vanish: "Desaparece" },
  params: {
    vehicle: "Vehículo", path: "Trayecto", speeds: "Velocidades", speedDivisors: "Velocidades divididas por", through: "Pasa por", eye: "Ojo en el vehículo",
    fovDeg: "Campo de visión", target: "Mira", pitchShare: "Alza la vista hasta (parte de su altura)", keepDeg: "Lo mantiene a menos de", glanceBeyondDeg: "Vistazos más allá de",
    glanceS: "Vistazo", roadS: "De vuelta a la carretera", offsetM: "Desplaza el ojo", holdS: "Durante", turnS: "En", mirror: "Retrovisor", firstS: "Primero",
    mirrorS: "En el retrovisor", glancesUntil: "Vistazos directos hasta",
    place: "Dónde", metres: "Tamaño (ancho, altura sobre el ojo)", parts: "Partes", onS: "Encendido", offS: "Apagado", off: "Apagado, está", from: "Desde", to: "Hasta", share: "Parte del camino hacia él", headingDeg: "Rumbo", pitchDeg: "Inclinación"
  },
  from: "de",
  to: "a",
  points: "{n} puntos",
  at: "a",
  basis: { stated: "declarado", derived: "deducido", assumed: "supuesto", measured: "medido" }
}
