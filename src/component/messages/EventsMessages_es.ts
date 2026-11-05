import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_es: EventsMessages = {
  title: "Eventos del observador",
  phenomenonTitle: "Eventos del fenómeno",
  bodyTitle: "Eventos de {body}",
  derivedNote: "Las poses del observador se calculan a partir de estos eventos. Mover al observador o girar su mirada a mano escribe poses propias, que prevalecen sobre ellos.",
  overriddenNote: "Las poses propias de esta grabación prevalecen sobre sus eventos.",
  derivedShapesNote: "Las formas del relato se calculan a partir de lo que hizo el fenómeno. Dibujarlas a mano escribe formas propias, que prevalecen sobre estos eventos.",
  overriddenShapesNote: "Las formas propias de esta grabación prevalecen sobre los eventos del fenómeno.",
  parts: "{n} partes",
  who: "Sujeto",
  part: "Parte",
  partHint: "Un nodo o un hueso de su modelo (legs, head): gira solo, el resto del cuerpo tal como está",
  wholeBody: "el cuerpo entero",
  derivedBodiesNote: "Los fotogramas clave de estos cuerpos se calculan a partir de lo que hicieron. Los fotogramas clave puestos a mano prevalecen sobre estos eventos.",
  overriddenBodiesNote: "Fotogramas clave propios prevalecen sobre estos eventos.",
  add: "Añadir un evento", remove: "Eliminar el evento", none: "Ningún evento",
  resetToEvents: "Volver a los eventos",
  kinds: { drive: "Conduce", lookAhead: "Mira la carretera", lean: "Se inclina", watch: "Mira por el retrovisor", stand: "Se sitúa", look: "Mira", appearance: "Aspecto", walk: "Camina", follow: "Sigue con la mirada", blink: "Parpadea", vanish: "Desaparece", motion: "Se mueve", spin: "Gira", rise: "Se eleva", ride: "Va en", turn: "Se gira" },
  params: {
    vehicle: "Vehículo", path: "Trayecto", speeds: "Velocidades", speedDivisors: "Velocidades divididas por", through: "Pasa por", eye: "Ojo en el vehículo",
    fovDeg: "Campo de visión", target: "Mira", pitchShare: "Alza la vista hasta (parte de su altura)", keepDeg: "Lo mantiene a menos de", glanceBeyondDeg: "Vistazos más allá de",
    glanceS: "Vistazo", roadS: "De vuelta a la carretera", offsetM: "Desplaza el ojo", holdS: "Durante", turnS: "En", mirror: "Retrovisor", firstS: "Primero",
    mirrorS: "En el retrovisor", glancesUntil: "Vistazos directos hasta",
    place: "Dónde", metres: "Tamaño (ancho, altura sobre el ojo)", parts: "Partes", onS: "Encendido", offS: "Apagado", off: "Apagado, está", motion: "Movimiento", turnsPerS: "Vueltas por segundo", distanceM: "Distancia", angleDeg: "Desvío de la vertical", stops: "Se detiene", in: "En", aboveM: "Por encima", from: "Desde", to: "Hasta", headingDeg: "Rumbo", pitchDeg: "Inclinación"
  },
  from: "de",
  to: "a",
  points: "{n} puntos",
  at: "a",
  basis: { stated: "declarado", derived: "deducido", assumed: "supuesto", measured: "medido" }
}
