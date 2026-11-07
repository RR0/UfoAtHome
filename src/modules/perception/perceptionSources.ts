import { ModuleRegistry } from "../ModuleRegistry.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { ObserverProvider } from "../../engine/observer/ObserverProvider.js"
import { ColorVisionProvider } from "./ColorVisionProvider.js"
import { FatigueProvider } from "./FatigueProvider.js"
import { IntoxicationProvider } from "./IntoxicationProvider.js"

/** What its source cites, for the credit beside it: the first of its sources, or the provider's own name. */
const creditOf = (provider: ObserverProvider): string => provider.sources[0] ?? provider.id

/**
 * Every source of what bends an observer's perception (see ObserverProvider): their effects add up, every one applied with the settings the
 * recording states for it, by its id. A module's providers come after these. A `DataSource` whose `id` is the provider's.
 */
export const PERCEPTION_SOURCES: DataSource<ObserverProvider>[] = ModuleRegistry.point("perception").provide(ModuleRegistry.BUILT_IN,
  [new ColorVisionProvider(), new IntoxicationProvider(), new FatigueProvider()].map((provider): DataSource<ObserverProvider> => ({
    id: provider.id,
    name: provider.id,
    credit: creditOf(provider),
    creditUrl: "https://ufoathome.org/docs/sources/",
    create: () => provider
  })))
