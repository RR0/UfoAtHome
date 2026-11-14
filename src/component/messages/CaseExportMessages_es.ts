import type { CaseExportMessages } from "./CaseExportMessages.js"

export const caseExportMessages_es = {
  button: "Informe",
  hint: "Exportar un informe del caso: indicaciones de los testigos, lecturas comparadas, constataciones, sensibilidad y figuras",
  html: "Informe (HTML)",
  print: "Imprimir o PDF",
  json: "Resultados (JSON)",
  csv: "Tablas (CSV)",
  htmlHint: "Una página autónoma, para abrir, archivar o retomar en un procesador de textos",
  printHint: "El mismo informe, para imprimir o guardar en PDF desde el navegador",
  jsonHint: "Todos los datos y todos los resultados calculados, para otras herramientas",
  csvHint: "Un archivo por tabla, para una hoja de cálculo, reunidos en un zip",
  working: "Elaborando el informe…",
  failed: "No se pudo elaborar el informe."
} satisfies CaseExportMessages
