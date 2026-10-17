import { ColorVisionProvider } from "./ColorVisionProvider.js"
import { FatigueProvider } from "./FatigueProvider.js"
import { IntoxicationProvider } from "./IntoxicationProvider.js"
import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"

/**
 * The single composition point of what bends an observer's perception — the way
 * defaultTerrainProviders is for the ground. The scene and the editor read only this and the
 * ObserverProvider interface; a new provider is a class and one line below.
 */
export class ObserverProviders {
  static readonly ALL: readonly ObserverProvider[] = [new ColorVisionProvider(), new IntoxicationProvider(), new FatigueProvider()]

  static byId(id: string): ObserverProvider | undefined {
    return ObserverProviders.ALL.find(provider => provider.id === id)
  }

  /** What a recording's settings, by provider id, do to the picture all together. Providers a recording
   * names that this build does not know are ignored: the record is kept, not interpreted. */
  static perceptionOf(settings: Record<string, ObserverSettings> | undefined): Perception {
    return ObserverProviders.ALL.reduce(
      (perception, provider) => Perceptions.combine(perception, provider.perceive(settings?.[provider.id] ?? {})),
      Perceptions.NONE
    )
  }

  /** Settings with everything that is the default removed, and providers left with nothing dropped:
   * what a recording stores. Undefined when nothing is left. */
  static compact(settings: Record<string, ObserverSettings>): Record<string, ObserverSettings> | undefined {
    const kept: Record<string, ObserverSettings> = {}
    for (const provider of ObserverProviders.ALL) {
      const values = settings[provider.id] ?? {}
      const differing = Object.fromEntries(
        provider.settings.filter(setting => values[setting.id] !== undefined && values[setting.id] !== setting.default).map(setting => [setting.id, values[setting.id]])
      )
      if (Object.keys(differing).length > 0) kept[provider.id] = differing
    }
    return Object.keys(kept).length > 0 ? kept : undefined
  }
}
