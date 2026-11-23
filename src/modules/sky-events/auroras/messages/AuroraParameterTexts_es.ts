import type { AuroraParameterTexts } from "./AuroraParameterTexts.js"

export const auroraParameterTexts_es: AuroraParameterTexts = {
  aurora: "Aurora",
  name: "Nombre",
  field: "Campo magnético",
  light: "Luz",
  when: "Cuándo",
  kp: "Índice Kp",
  kpHint: "Lo agitado que estaba el campo magnético terrestre, de 0 (tranquilo) a 9 (tormenta extrema), según el índice planetario; por encima de 9, el índice Hp del GFZ, sin techo.",
  edge: "Borde hacia el ecuador",
  edgeHint: "La latitud geomagnética del borde del óvalo más cercano al ecuador, a medianoche magnética: se indica cuando se conoce de otro modo que por Kp, que se detiene en 9.",
  arcs: "Arcos",
  arcsHint: "Cuántos arcos distintos hay en el óvalo; 0 para un simple resplandor difuso.",
  arcBrightness: "Brillo de los arcos",
  arcBrightnessHint: "Kilorayleighs de la línea verde a lo alto de un arco: 1, el brillo de la Vía Láctea; 10, un cirro fino a la luz de la luna; 100, un cúmulo a la luz de la luna; 1000 ilumina el suelo como la luna llena.",
  red: "Rojo de tormenta",
  redHint: "Kilorayleighs de la línea roja alta de una tormenta magnética, de la que se compone sobre todo una aurora vista de lejos hacia el ecuador.",
  from: "Desde",
  fromHint: "Segundos de la grabación; negativos antes de su inicio. Desde el inicio si está vacío.",
  until: "Hasta",
  untilHint: "Segundos de la grabación. Hasta el final si está vacío."
} satisfies AuroraParameterTexts
