import type { KmlExportTexts } from "./KmlExportTexts.js"

export const kmlExportTexts_es = {
  document: "{name} — UFO@home",
  documentNote: "Lo que esta reconstrucción tiene de geográfico: dónde estaba el testigo, las direcciones que declara el testimonio, y dónde una lectura sitúa lo que se habría visto. Nada de esto es una medida del fenómeno.",
  folderObserver: "Testigo",
  folderSightLines: "Líneas de visión",
  folderBodies: "Lo que sitúa una lectura",
  folderTraces: "Trazados del investigador",
  observerPoint: "Testigo, {s} s",
  observerPath: "Recorrido del testigo",
  observerNote: "{elevation} m sobre el suelo, mirando a {heading}° del norte.",
  sightLine: "Línea de visión — {what}, {s} s",
  sightLineNote: "La dirección que declara el testimonio: {azimuth}° del norte, {altitude}° sobre el horizonte. Los {km} km trazados son convencionales: el testimonio da una dirección, no una distancia.",
  bodyPoint: "{what}",
  bodyPath: "{what} — recorrido",
  bodyNote: "Donde lo sitúa una lectura del testimonio. La interpretación de alguien, no el testimonio.",
  heightNote: "Las alturas se cuentan desde el suelo del que partió el testigo.",
  unnamed: "Fenómeno {id}"
} satisfies KmlExportTexts
