import type { ClaudeNarrativeTexts } from "./ClaudeNarrativeTexts.js"

export const claudeNarrativeTexts_fr: ClaudeNarrativeTexts = {
  keyLabel: "Clé d'API Claude",
  keySuspect: "Ceci ne ressemble pas à une clé d'API Claude : elles commencent par sk-ant-",
  workspaceLabel: "ID d'espace de travail",
  workspacePlaceholder: "seulement si votre clé en couvre plusieurs",
  workspaceHint: "Seulement pour une clé couvrant toute l'organisation. Plus simple : laissez vide et créez une clé limitée à un espace de travail.",
  modelLabel: "Modèle",
  fableChoice: "Claude Fable 5.1 (le plus capable, plus cher)",
  sonnetChoice: "Claude Sonnet 5.5 (moins cher)",
  haikuChoice: "Claude Haiku 4.5 (le moins cher)"
}
