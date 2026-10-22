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
  }
}
