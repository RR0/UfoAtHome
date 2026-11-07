/** One module the person added, by its manifest's address, on or off. */
export interface ModuleConfigEntry {
  url: string
  enabled: boolean
}

/** The person's modules, as kept in this browser and as exported to a file. */
export interface ModuleConfigJson {
  /** The version of this format: 1. */
  format: 1
  modules: ModuleConfigEntry[]
}

/**
 * The modules a person added to UFO@home, which there is no account to keep: in this browser's storage, and in a file they can save
 * and load again elsewhere.
 *
 * Only addresses are kept, never what a module answered: what it is is read again from its manifest each time (see ModuleLoader).
 */
export class ModuleConfig {
  static readonly STORAGE_KEY = "ufoathome.modules"
  static readonly FORMAT = 1

  static empty(): ModuleConfigJson {
    return { format: 1, modules: [] }
  }

  /** What this browser keeps, or no module at all where it keeps nothing readable (a private window, blocked storage, a file edited by hand). */
  static read(storage: Storage | undefined = ModuleConfig.storage()): ModuleConfigJson {
    try {
      const text = storage?.getItem(ModuleConfig.STORAGE_KEY)
      return text ? ModuleConfig.parse(text) : ModuleConfig.empty()
    } catch {
      return ModuleConfig.empty()
    }
  }

  /** Keeps `config` in this browser. Returns whether it could. */
  static write(config: ModuleConfigJson, storage: Storage | undefined = ModuleConfig.storage()): boolean {
    try {
      if (!storage) return false
      if (config.modules.length === 0) storage.removeItem(ModuleConfig.STORAGE_KEY)
      else storage.setItem(ModuleConfig.STORAGE_KEY, ModuleConfig.text(config))
      return true
    } catch {
      return false
    }
  }

  /** A configuration from its text (an exported file), or an error saying why it is not one. Addresses given twice are kept once. */
  static parse(text: string): ModuleConfigJson {
    const json = JSON.parse(text) as Partial<ModuleConfigJson>
    if (json === null || typeof json !== "object" || !Array.isArray(json.modules)) throw new Error("not a UFO@home module list")
    if (typeof json.format === "number" && json.format > ModuleConfig.FORMAT) throw new Error(`format ${json.format} is newer than ${ModuleConfig.FORMAT}`)
    const seen = new Set<string>()
    const modules: ModuleConfigEntry[] = []
    for (const entry of json.modules) {
      if (typeof entry?.url !== "string" || seen.has(entry.url)) continue
      seen.add(entry.url)
      modules.push({ url: entry.url, enabled: entry.enabled !== false })
    }
    return { format: 1, modules }
  }

  /** The text of a configuration, as a file holds it. */
  static text(config: ModuleConfigJson): string {
    return JSON.stringify({ format: ModuleConfig.FORMAT, modules: config.modules }, null, 2) + "\n"
  }

  private static storage(): Storage | undefined {
    try {
      return typeof localStorage === "undefined" ? undefined : localStorage
    } catch {
      return undefined
    }
  }
}
