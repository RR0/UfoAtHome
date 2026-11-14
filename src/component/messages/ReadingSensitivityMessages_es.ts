import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_es = {
  heading: "Sensibilidad:",
  hint: "Hasta dónde puede variar cada valor que la lectura supuso antes de que reproduzca menos del relato. Un parecido que solo se sostiene a unas décimas de grado fue ajustado, no encontrado. La incertidumbre del testigo no varía: ya está en lo que cuenta como contradicción.",
  nothingToConfront: "nada que confrontar con el relato: ningún cuerpo de la lectura dice qué fenómeno es",
  noneAgrees: "no reproduce ninguna de las {compared} comparaciones",
  agreement: "reproduce {agreed} de {compared} comparaciones",
  agreementOne: "reproduce 1 de {compared} comparaciones",
  allAgree: "reproduce las {compared} comparaciones",
  noFreeValue: "nada supuesto: ningún valor que variar",
  tightest: "lo más frágil: {knob}, de {lower} a {upper}",
  margin: "{knob}: de {lower} a {upper}",
  atLeast: "{value} y más allá",
  better: "Otro ajuste reproduce más: {knob} en {amount}, {agreed} de {compared}",
  knobs: { azimuth: "dirección", altitude: "altura", distance: "distancia", size: "tamaño", time: "instante" }
} satisfies ReadingSensitivityMessages
