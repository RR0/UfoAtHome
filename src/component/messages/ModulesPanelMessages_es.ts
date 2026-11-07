import type { ModulesPanelMessages } from "./ModulesPanelMessages.js"

export const modulesPanelMessages_es: ModulesPanelMessages = {
  intro: "Un módulo añade fuentes (imágenes, relieve, meteorología…) y modelos 3D publicados por otros. Los módulos que añade se guardan en este navegador; guárdelos en un archivo para usarlos en otro lugar.",
  codeWarning: "Un módulo que contiene código se ejecuta con todos los derechos de esta página: añada solo aquellos cuyo autor conozca.",
  urlPlaceholder: "https://…/ufoathome-module.json",
  add: "Añadir",
  none: "Ningún módulo.",
  remove: "Quitar",
  enabled: "Activo",
  namedByRecording: "Citado por esta grabación",
  namedByRecordingHint: "Quien abre la grabación carga este módulo, para que se dibujen los modelos que toma de él. Su código, si lo tiene, solo se ejecuta para quien lo añadió.",
  addToMine: "Añadir a mis módulos",
  loading: "Cargando…",
  failed: "No se pudo cargar: {error}",
  off: "Inactivo",
  brings: "Aporta: {points}",
  bringsNothing: "No aporta nada.",
  runsCode: "Ejecuta código.",
  codeNotRun: "Su código no se ejecutó: añádalo a sus módulos para ejecutarlo.",
  exportConfig: "Guardar mis módulos",
  importConfig: "Cargar módulos",
  imported: "{count} módulo(s) leído(s) del archivo.",
  importFailed: "Este archivo no es una lista de módulos: {error}",
  points: {
    weather: "meteorología", place: "lugares", timeZone: "husos horarios", narrative: "redacción", assessment: "evaluaciones",
    lightPollution: "contaminación lumínica", aircraft: "tráfico aéreo", upperAir: "aire en altura", elevation: "relieve", imagery: "imágenes",
    surroundings: "entorno", skyEvents: "eventos del cielo", decorModels: "modelos 3D"
  }
}
