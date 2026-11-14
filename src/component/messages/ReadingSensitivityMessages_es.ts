import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_es = {
  heading: "Sensibilidad:",
  hint: "Lo que se compara: cada dirección o tamaño que la grabación atribuye al testigo diciendo en qué se basa, frente a lo que daría, visto desde su posición y en el mismo instante, el cuerpo que coloca la lectura. Una diferencia solo es contradicción más allá de la incertidumbre de un testigo para ese tipo de estimación. Los márgenes dicen cuánto se puede desplazar cada valor supuesto por la lectura antes de que reproduzca menos: un margen estrecho indica un ajuste fino, uno amplio una lectura robusta.",
  nothingToConfront: "nada que confrontar con el relato: ningún cuerpo de la lectura dice qué fenómeno es",
  noneSaid: "nada que confrontar: el relato no atribuye al testigo, diciendo en qué se basan, ninguna dirección ni tamaño",
  noneAgrees: "no reproduce ninguna de las {compared} indicaciones del testigo",
  agreementOne: "reproduce 1 de las {compared} indicaciones del testigo",
  agreement: "reproduce {agreed} de las {compared} indicaciones del testigo",
  allAgree: "reproduce las {compared} indicaciones del testigo",
  tooFew: "demasiado pocas para medir su robustez",
  noFreeValue: "nada supuesto: ningún valor que desplazar",
  tightest: "lo más ajustado: {knob}, de {lower} a {upper}",
  margin: "{knob}: se sostiene de {lower} a {upper}",
  atLeast: "{value} y más allá",
  better: "Otro ajuste reproduce más: {knob} {amount}, {agreed} de {compared}",
  knobs: { azimuth: "dirección", altitude: "altura", distance: "distancia", size: "tamaño", time: "instante" }
} satisfies ReadingSensitivityMessages
