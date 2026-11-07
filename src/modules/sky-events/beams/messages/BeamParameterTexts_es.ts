import type { BeamParameterTexts } from "./BeamParameterTexts.js"

export const beamParameterTexts_es = {
  light: "Luz",
  beam: "Haz",
  when: "Cuándo",
  name: "Nombre",
  divergence: "Divergencia",
  howFastItWidensFullAngle: "Lo rápido que se ensancha, ángulo total: 0,1 mrad es un metro de ancho a 10 km.",
  widthAtTheEmitter: "Anchura en el emisor",
  unevenHaze: "Bruma irregular",
  howUnevenlyTheHazeItCrosses: "Lo desigual que es la bruma que cruza: visto de lado, el haz es más brillante donde cruza una bolsa más densa, y las bolsas derivan con el viento. 0 es una bruma uniforme; el valor por defecto se juzga en fotografías, no se mide.",
  itsColour532ForTheGreen: "Su color: 532 para el verde de un láser doblado en frecuencia, 520 para un diodo verde, 638 para uno rojo, 450 para uno azul.",
  theOpticalPowerItCarriesIts: "La potencia óptica que lleva, su media para un láser pulsado, cuyos pulsos ningún ojo distingue. Lo que se ve de él es lo que el aire difunde.",
  wavelength: "Longitud de onda",
  power: "Potencia",
  time: "Instante",
  secondsOfTheRecording: "Segundos de la grabación.",
  onFrom: "Encendido a",
  secondsOfTheRecordingEmptyFrom: "Segundos de la grabación; vacío, desde su inicio.",
  offAt: "Apagado a",
  secondsOfTheRecordingEmptyUntil: "Segundos de la grabación; vacío, hasta su final.",
  pathAtAnInstant: "Trayecto en un instante",
  pointOfThePath: "Punto del trayecto",
  position: "Posición",
  altitude: "Altitud",
  aboveTheSeaNotTheGround: "Sobre el mar, no sobre el suelo: un emisor en una ventana a doce metros de altura, sobre un suelo a 160 m, está a 172 m."
} satisfies BeamParameterTexts
