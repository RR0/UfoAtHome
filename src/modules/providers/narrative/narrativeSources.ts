import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import type { NarrativeProvider } from "../../../engine/narrative/NarrativeProvider.js"
import { ClaudeNarrativeProvider } from "./ClaudeNarrativeProvider.js"

/** Everything the editor can read an account with. One entry today — see DataSource's own doc
 * comment on why the picker exists anyway, and this is the registry where it will matter soonest:
 * what reads an account is the most obviously provisional part of the editor. */
export const NARRATIVE_SOURCES: DataSource<NarrativeProvider>[] = ModuleRegistry.point("narrative").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "claude",
    name: "Claude",
    credit: "Anthropic",
    creditUrl: "https://www.anthropic.com/legal/consumer-terms",
    create: () => new ClaudeNarrativeProvider()
  }
])
