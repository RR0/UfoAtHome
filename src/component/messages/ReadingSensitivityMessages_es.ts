import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_es = {
  heading: "Sensibilidad:",
  hint: "Lo que se compara: cada dirección o tamaño que la grabación atribuye al testigo diciendo en qué se basa, frente a lo que daría, visto desde su posición y en el mismo instante, el cuerpo que coloca la lectura. Una diferencia solo es contradicción más allá de la incertidumbre de un testigo para ese tipo de estimación. Los márgenes dicen cuánto se puede desplazar cada valor supuesto por la lectura antes de que reproduzca menos: un margen estrecho indica un ajuste fino, uno amplio una lectura robusta. Un margen es suficiente si cubre al menos la mitad de la incertidumbre del valor a cada lado, según las leyes de error de los testigos (un factor 10 para una distancia supuesta): no toda, pues el acuerdo ya se juzga con esa incertidumbre.",
  nothingToConfront: "nada que confrontar con el relato: ningún cuerpo de la lectura dice qué fenómeno es",
  noneSaid: "nada que confrontar: el relato no atribuye al testigo, diciendo en qué se basan, ninguna dirección ni tamaño",
  noneAgrees: "no reproduce ninguna de las {compared} indicaciones del testigo",
  agreementOne: "reproduce 1 de las {compared} indicaciones del testigo",
  agreement: "reproduce {agreed} de las {compared} indicaciones del testigo",
  allAgree: "reproduce las {compared} indicaciones del testigo",
  tooFew: "demasiado pocas para medir su robustez",
  noFreeValue: "nada supuesto: ningún valor que desplazar",
  tightest: "lo más ajustado: {knob}, de {lower} a {upper}",
  margin: "{knob}: se sostiene de {lower} a {upper}; ninguna ley dice su incertidumbre",
  marginJudged: "{knob}: se sostiene de {lower} a {upper}, para una incertidumbre de {refLower} a {refUpper} ({coverage} % cubierto)",
  sufficient: "margen suficiente",
  fineTuned: "ajuste fino: {knob} solo cubre el {coverage} % de su incertidumbre",
  atLeast: "{value} y más allá",
  better: "Otro ajuste reproduce más: {knob} {amount}, {agreed} de {compared}",
  knobs: { azimuth: "dirección", altitude: "altura", distance: "distancia", size: "tamaño", time: "instante" },
  comparison: {
    heading: "Lecturas comparadas ({n})",
    hint: "Una fila por lectura del caso, confrontada con el relato que lee, como lo dice la sensibilidad de cada lectura: cuántas indicaciones del testigo reproduce, la diferencia mediana entre lo que dijo el testigo y lo que muestra la lectura (solo direcciones), si sus márgenes son suficientes y cuántos valores supuso. Cuantos más valores supone una lectura, más fácil es obtener un parecido.",
    reading: "Lectura",
    witness: "Lee",
    reproduced: "Reproduce",
    gap: "Diferencia mediana",
    robustness: "Robustez",
    supposed: "Valores supuestos",
    loading: "…",
    nothing: "nada que confrontar",
    sufficient: "suficiente",
    fineTuned: "ajuste fino ({knob})",
    tooFew: "demasiado poco reproducido",
    unjudged: "ninguna ley para juzgarla"
  }
} satisfies ReadingSensitivityMessages
