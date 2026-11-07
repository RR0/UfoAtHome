import type { ClaudeNarrativeTexts } from "./ClaudeNarrativeTexts.js"

export const claudeNarrativeTexts_en = {
  keyLabel: "Claude API key",
  keySuspect: "This does not look like a Claude API key: they begin with sk-ant-",
  workspaceLabel: "Workspace ID",
  workspacePlaceholder: "only if your key spans several",
  workspaceHint: "Only for a key whose scope is the whole organisation. Simpler: leave this empty and create a key scoped to one workspace instead.",
  modelLabel: "Model",
  fableChoice: "Claude Fable 5.1 (most capable, dearer)",
  sonnetChoice: "Claude Sonnet 5.5 (cheaper)",
  haikuChoice: "Claude Haiku 4.5 (cheapest)"
} satisfies ClaudeNarrativeTexts
