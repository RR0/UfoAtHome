import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What ClaudeNarrativeProvider's settings say, in one language: only the reader's is loaded (see ClaudeNarrativeProvider.localize). */
export interface ClaudeNarrativeTexts {
  keyLabel: string
  /** Shown against a key that lacks the sk-ant- prefix. */
  keySuspect: string
  workspaceLabel: string
  workspacePlaceholder: string
  workspaceHint: string
  modelLabel: string
  fableChoice: string
  sonnetChoice: string
  haikuChoice: string
}

export const CLAUDE_NARRATIVE_TEXTS = Messages.catalog<ClaudeNarrativeTexts>({
  en: () => import("./ClaudeNarrativeTexts_en.js").then(m => m.claudeNarrativeTexts_en),
  fr: () => import("./ClaudeNarrativeTexts_fr.js").then(m => m.claudeNarrativeTexts_fr),
  es: () => import("./ClaudeNarrativeTexts_es.js").then(m => m.claudeNarrativeTexts_es),
  it: () => import("./ClaudeNarrativeTexts_it.js").then(m => m.claudeNarrativeTexts_it)
})
