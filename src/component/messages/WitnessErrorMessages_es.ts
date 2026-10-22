import type { WitnessErrorMessages } from "./WitnessErrorMessages.js"

export const witnessErrorMessages_es: WitnessErrorMessages = {
  "basisTitle": "Cómo se obtuvo este valor",
  "basisField": "Base",
  "howField": "Cómo",
  "rationaleField": "Justificación",
  "basisReset": "Base devuelta a «declarada»: el valor se volvió a escribir (era: {basis}).",
  "lawSources": "Fuentes: {sources}",
  "extrapolation": "Estas leyes se midieron en observaciones nocturnas: aplicarlas a una observación diurna es una extrapolación.",
  "sectionAccountConditions": "Condiciones del testimonio",
  "sectionViewing": "Condiciones de visión",
  "sectionMoon": "Calibre Luna",
  "sectionErrorParameters": "Parámetros de error de este testigo",
  "errorModelField": "Modelo de error",
  "delayField": "Plazo antes de este relato",
  "delayUnit": "días",
  "versionField": "Versión",
  "wordField": "Palabra empleada",
  "exposureField": "Exposición",
  "independenceField": "Independencia",
  "independentYes": "sin haber hablado con los otros testigos",
  "independentNo": "tras hablar con los otros testigos",
  "unknownChoice": "no se sabe",
  "darkAdapted": "Adaptado a la oscuridad",
  "correctedVision": "Vista corregida (gafas, lentillas)",
  "glare": "Luz intensa justo antes",
  "viewingNote": "El cristal o el parabrisas y los prismáticos se ajustan en «Visión» más arriba.",
  "moonIntro": "El testigo muestra la Luna llena como mostró el objeto. La razón da su propio factor de tamaño angular: la única medida que hace individual la ley general. A tomar una vez por testigo.",
  "moonField": "Luna tal como se muestra",
  "moonHint": "Con el brazo extendido, 1 cm ≈ 1°",
  "moonNone": "Aún no medida: se aplica la ley general ({law}).",
  "moonFactor": "Factor ×{k}: sustituye a la ley general en todos los tamaños angulares de este testigo.",
  "moonReal": "Luna real · 0,52°",
  "parametersIntro": "Los errores de un mismo testigo están ligados: el mismo factor en todos sus tamaños, el mismo desfase en todas sus horas. Calculados, nunca escritos: ningún margen «±» se introduce a mano.",
  "showMore": "Mostrar",
  "basis": {
    "measured": "◆ medida",
    "stated": "declarada",
    "derived": "deducida",
    "assumed": "supuesta"
  },
  "how": {
    "clock": "leída en un reloj",
    "anchored": "anclada a un evento fechado",
    "estimated": "estimada",
    "shown-on-the-spot": "mostrada en el lugar",
    "arm-length-gauge": "calibre con el brazo extendido",
    "recalled-object": "referida a un objeto conocido",
    "instrument": "instrumento",
    "landmark": "referencia del paisaje",
    "occlusion": "ocultación",
    "known-size": "tamaño conocido",
    "triangulation": "triangulación"
  },
  "status": {
    "consolidated": "consolidada",
    "individual": "individual",
    "single": "estudio único",
    "argued": "argumentada",
    "contested": "discutida"
  },
  "laws": {
    "timeClock": "± {minutes} min (leída en un reloj)",
    "timeAnchored": "± {minutes} min (anclada a un evento fechado)",
    "timeEstimated": "± {minutes} min para 9 testigos de 10 (estimada)",
    "duration": "{low} a {high}: ×/÷{factor} (log-normal)",
    "elevationOver": "{low} a {high}: altura sobreestimada",
    "measuredInstrument": "± {degrees}° (medida)",
    "measuredLandmark": "± {degrees}° (según una referencia)",
    "headingCross": "{low} a {high}: ± {degrees}°, sentido a veces invertido",
    "sizeMoon": "{low} a {high}: factor ×{factor} del calibre Luna",
    "sizeShown": "{low} a {high}: mostrada en el lugar, +2 a +17 %",
    "sizeRecalled": "{low} a {high}: referida a un objeto conocido, ~30 % demasiado grande",
    "sizeArm": "{low} a {high}: sobreestimada ×{from} a ×{to} con el brazo extendido",
    "sizeGauge": "{low} a {high}: calibre, ± {percent} %",
    "distanceAnchored": "Anclada: su error sigue al de aquello de lo que se deduce",
    "distanceNotData": "No es un dato: errónea en un factor {factor} o más sin anclaje"
  },
  "parameterNames": {
    "clock": "Desfase del reloj",
    "date": "Desfase de fecha",
    "heading": "Rotación del rumbo",
    "elevation": "Compresión de alturas",
    "size": "Factor de tamaño angular",
    "duration": "Factor de duración"
  },
  "parameterScopes": {
    "clock": "todas las horas",
    "date": "la fecha",
    "heading": "todos los rumbos",
    "elevation": "todas las alturas",
    "size": "todos los tamaños angulares",
    "duration": "la duración y la escala de la línea de tiempo"
  },
  "parameters": {
    "clockClock": "± {minutes} min (reloj)",
    "clockAnchored": "± {minutes} min (anclada)",
    "clockEstimated": "± {minutes} min (estimada)",
    "dateShift": "±1 día, mes o año; horario de verano ({percent} % de las fechas)",
    "headingRotation": "± {degrees}°, espejo posible",
    "elevationCompression": "sobreestimadas, nunca subestimadas",
    "sizeMoon": "×{factor} (calibre Luna)",
    "sizeArm": "×{from} a ×{to} con el brazo extendido",
    "sizeShown": "+2 a +17 % mostrada en el lugar",
    "durationFactor": "×/÷{factor} (log-normal)"
  },
  "words": {
    "light": "luz",
    "object": "objeto",
    "craft": "aparato",
    "ufo": "ovni",
    "other": "otra"
  },
  "exposures": {
    "none": "ninguna",
    "press": "prensa",
    "broadcast": "radio, televisión",
    "other-witnesses": "otros testigos",
    "investigators": "investigadores"
  },
  "models": {
    "consolidated": "Lecturas consolidadas (UFO@home)",
    "keul": "Keul (tamaños mostrados en el lugar)"
  },
  "candidates": {
    "title": "Explicaciones candidatas",
    "verdicts": {
      "consolidated": "Compatible con sesgos consolidados",
      "contested": "Solo invocando sesgos discutidos",
      "incompatible": "Incompatible incluso en los límites"
    },
    "cost": "coste {x} σ",
    "seeVariant": "Ver esta variante",
    "variantLabel": "Variante: {name}",
    "backToAccount": "Volver al relato",
    "costNote": "Un coste no es una probabilidad: dice qué sesgos hay que invocar, y cuánto.",
    "scopeNote": "Matriz de Poher (1977) para la lista de partida; la Luna, los planetas, los pasos de satélites, las reentradas, los bólidos registrados y los aviones del registro se calculan y se confrontan con el relato.",
    "fields": {
      "time": "Hora",
      "heading": "Acimut",
      "elevation": "Altura sobre el horizonte",
      "size": "Anchura aparente"
    },
    "biases": {
      "clock": "desfase del reloj {x} min",
      "heading": "rotación del rumbo {x}°",
      "elevation": "altura sobreestimada ×{x}",
      "size": "tamaño sobreestimado ×{x}"
    },
    "reasons": {
      "never-seen": "Nunca visible desde este lugar en el margen de la hora dada.",
      "direction": "Demasiado lejos de la dirección dada, incluso en los límites de las leyes.",
      "size": "Tamaño demasiado distinto, incluso en los límites de las leyes."
    },
    "notAgainst": "No es un argumento contra el relato.",
    "noDirection": "El relato no sitúa el fenómeno en el cielo: no hay nada que confrontar.",
    "noSky": "Sin fecha, hora y lugar, ningún astro puede situarse.",
    "bodies": {
      "Moon": "Luna",
      "Venus": "Venus",
      "Mars": "Marte",
      "Jupiter": "Júpiter",
      "Saturn": "Saturno"
    },
    "aircraft": "Aeronave {name}",
    "reentry": "Reentrada {name}",
    "fireball": "Bólido {name}",
    "poherLoading": "Cargando la matriz de Poher…",
    "poherFailed": "No se pudo leer la matriz de Poher: solo se proponen los astros.",
    "poherTitle": "Según la matriz de Poher (1977)",
    "poherIntro": "Los demás fenómenos conocidos de la matriz, sin trayectoria calculada aquí: su nota es el juicio de Poher, a confrontar a mano.",
    "poherPossible": "Posibles",
    "poherExcluded": "Excluidos ({n})",
    "poherExcludedBy": "excluido por: {list}",
    "poherDoubted": "dudoso según estimaciones: {list}",
    "poherScore": "nota {x}",
    "poherTag": "Poher: {state}",
    "poherStatePossible": "posible, nota {x}",
    "poherStateExcluded": "excluido",
    "answersTitle": "Respuestas deducidas de la grabación ({n})",
    "firm": "firme",
    "soft": "estimación, no excluye nada por sí sola"
  }
}
