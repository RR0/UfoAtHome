import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"
import { PERCEPTION_SOURCES } from "../../modules/perception/perceptionSources.js"

/**
 * What bends an observer's perception, all together: the providers of the extension point `perception` (see PERCEPTION_SOURCES in
 * src/modules/perception, and ModuleRegistry), built in and brought by modules. The scene and the editor read only this and the
 * ObserverProvider interface; a new provider is a class in src/modules/perception and one line in its registry, or a module's.
 */
export class ObserverProviders {
  private static readonly built = new WeakMap<object, ObserverProvider>()

  /** Every provider, in the registry's order, as it stands now. */
  static get ALL(): readonly ObserverProvider[] {
    return PERCEPTION_SOURCES.map(source => {
      let provider = ObserverProviders.built.get(source)
      if (!provider) {
        provider = source.create()
        ObserverProviders.built.set(source, provider)
      }
      return provider
    })
  }

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
   * what a recording stores. Undefined when nothing is left. A provider no module of this page knows is
   * kept as it was read: dropping it would be an edit nobody made. */
  static compact(settings: Record<string, ObserverSettings>): Record<string, ObserverSettings> | undefined {
    const kept: Record<string, ObserverSettings> = {}
    const all = ObserverProviders.ALL
    for (const [id, values] of Object.entries(settings)) {
      if (!all.some(provider => provider.id === id) && Object.keys(values ?? {}).length > 0) kept[id] = values
    }
    for (const provider of all) {
      const values = settings[provider.id] ?? {}
      const differing = Object.fromEntries(
        provider.settings.filter(setting => values[setting.id] !== undefined && values[setting.id] !== setting.default).map(setting => [setting.id, values[setting.id]])
      )
      if (Object.keys(differing).length > 0) kept[provider.id] = differing
    }
    return Object.keys(kept).length > 0 ? kept : undefined
  }
}
