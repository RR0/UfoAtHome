import type { HvsMessages } from "./HvsMessages.js"

export const hvsMessages_es = {
  heading: "Hipótesis ponderadas (HVS)",
  hint: "El protocolo HVS de Stéphane Baron pondera cada hipótesis por su cobertura (CS), la parte de los elementos del expediente que explica, y por su plausibilidad (PS), independiente del caso: HVS = CS × PS, un valor preferido y su envolvente, nunca una probabilidad. La CS bruta abarca todos los elementos contados (las inferencias de asociación no lo son), la CS discriminante solo los que separan las hipótesis; es esta la que designa la hipótesis dominante. Una hipótesis solo es admisible si cubre al menos la mitad de los elementos. Una dirección o un tamaño que una lectura reconstruye queda explicado o no según su confrontación con el testimonio; el resto, como lo declara el analista. La plausibilidad y el factor de contexto son los del analista: UFO@home no aporta ninguna probabilidad a priori.",
  credit: "Protocolo HVS {protocol} de Stéphane Baron",
  taxonomy: "taxonomía {taxonomy}",
  notSealed: "La lista de elementos no está cerrada: debe estarlo antes de ponderar las hipótesis.",
  noElements: "Ningún elemento: el expediente no enumera ninguno.",
  noHypotheses: "Ninguna hipótesis ponderada.",
  iqi: {
    heading: "Calidad de la información (IQI)",
    item: "{group}: {level}",
    total: "{sum} de {of}",
    groups: { dateTime: "Fecha y hora", place: "Lugar", identification: "Identificación de los testigos", witnesses: "Número de testigos", enquiry: "Investigación" },
    levels: { complete: "completo", partial: "parcial", absent: "ausente" },
    unrated: "por evaluar",
    suggested: "sugerido a partir del expediente"
  },
  elements: {
    heading: "Elementos",
    id: "Id",
    element: "Elemento",
    status: "Estatus",
    statuses: { observed: "hecho observado", inferred: "inferencia", association: "inferencia de asociación" },
    discriminating: "separa las hipótesis",
    explainedByReading: "explicado: la lectura lo reproduce",
    notExplainedByReading: "no explicado: la lectura no lo reproduce",
    explainedDeclared: "explicado, según el analista",
    notExplainedDeclared: "no explicado, según el analista"
  },
  hypotheses: {
    heading: "Hipótesis",
    code: "Código",
    hypothesis: "Hipótesis",
    csRaw: "CS bruta",
    csDiscriminating: "CS discriminante",
    ps: "PS",
    hvs: "HVS",
    standing: "Hito",
    score: "{preferred} [{low} – {high}]",
    admissible: "admisible",
    notAdmissible: "no admisible",
    admissibleHint: "Admisible: cubre al menos la mitad de los elementos (CS bruta ≥ 0,5). Un filtro antes de separar las hipótesis, no un veredicto.",
    dominant: "dominante",
    identified: "estímulo identificado",
    proven: "prueba sellada",
    geometric: "media geométrica: una nota se hunde",
    missing: "sin nota: {names}",
    ratings: { existence: "existencia", frequency: "frecuencia", compatibility: "compatibilidad", context: "contexto" }
  },
  loading: "…"
} satisfies HvsMessages
