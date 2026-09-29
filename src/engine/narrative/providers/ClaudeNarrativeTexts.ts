/**
 * What ClaudeNarrativeProvider's settings say, in one language other than English. English is the
 * provider's own text; the others are loaded only for the reader who reads them (see
 * ClaudeNarrativeProvider.localize).
 */
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
