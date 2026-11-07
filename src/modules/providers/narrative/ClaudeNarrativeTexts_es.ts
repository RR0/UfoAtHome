import type { ClaudeNarrativeTexts } from "./ClaudeNarrativeTexts.js"

export const claudeNarrativeTexts_es: ClaudeNarrativeTexts = {
  keyLabel: "Clave de API de Claude",
  keySuspect: "Esto no parece una clave de API de Claude: empiezan por sk-ant-",
  workspaceLabel: "ID del espacio de trabajo",
  workspacePlaceholder: "solo si tu clave abarca varios",
  workspaceHint: "Solo para una clave que abarca toda la organización. Más sencillo: déjalo vacío y crea una clave limitada a un espacio de trabajo.",
  modelLabel: "Modelo",
  fableChoice: "Claude Fable 5.1 (el más capaz, más caro)",
  sonnetChoice: "Claude Sonnet 5.5 (más barato)",
  haikuChoice: "Claude Haiku 4.5 (el más barato)"
}
