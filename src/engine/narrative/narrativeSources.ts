import type { DataSource } from "../source/DataSource.js"
import type { NarrativeProvider } from "./NarrativeProvider.js"
import { ClaudeNarrativeProvider } from "./providers/ClaudeNarrativeProvider.js"

/** Everything the editor can read an account with. One entry today — see DataSource's own doc
 * comment on why the picker exists anyway, and this is the registry where it will matter soonest:
 * what reads an account is the most obviously provisional part of the editor. */
export const NARRATIVE_SOURCES: DataSource<NarrativeProvider>[] = [
  {
    id: "claude",
    name: "Claude",
    credit: "Anthropic",
    creditUrl: "https://www.anthropic.com/legal/consumer-terms",
    create: () => new ClaudeNarrativeProvider()
  }
]
