import { ModuleConfig } from "./ModuleConfig.js"
import type { ModuleConfigJson } from "./ModuleConfig.js"
import { ModuleLoader } from "./ModuleLoader.js"
import type { LoadedModule } from "./ModuleLoader.js"
import { ModuleRegistry } from "./ModuleRegistry.js"

/** Where one module stands on this page. */
export interface ModuleState {
  url: string
  /** Who asked for it: the person (their configuration), or a recording that names it, or both. */
  addedByPerson: boolean
  enabled: boolean
  status: "loading" | "installed" | "failed" | "off"
  loaded?: LoadedModule
  error?: string
}

/**
 * The modules of this page: those the person added (see ModuleConfig) and those the recordings it shows name (see
 * SightingRecordingJson.modules), read once each (see ModuleLoader) and installed into the registry (see ModuleRegistry).
 *
 * One per page (`shared`), like the registry it fills: the scenes and the editors of a page see the same implementations.
 *
 * A module's script runs only when the person added it and has it on. One a recording names and they did not add is installed with what
 * its manifest states, its script left out, and says so: opening somebody's file must not run somebody's code.
 */
export class ModuleSession {
  static readonly shared = new ModuleSession()

  /** Fires `change` whenever a module's state changes. */
  readonly changes = new EventTarget()
  private readonly states = new Map<string, ModuleState>()
  private config: ModuleConfigJson = ModuleConfig.empty()
  private started?: Promise<void>

  constructor(private readonly loader = new ModuleLoader(), private readonly storage?: Storage) {
  }

  /** Every module of the page: the person's first, in their order, then those only recordings name. */
  list(): ModuleState[] {
    const states = [...this.states.values()]
    return [...states.filter(state => state.addedByPerson), ...states.filter(state => !state.addedByPerson)]
  }

  state(url: string): ModuleState | undefined {
    return this.states.get(url)
  }

  /** Reads the person's configuration and loads what is on in it, once per page. */
  start(): Promise<void> {
    this.started ??= this.applyConfig(ModuleConfig.read(this.storage))
    return this.started
  }

  /** Adds a module by the address of its manifest, on, and loads it. */
  async add(url: string): Promise<ModuleState> {
    await this.start()
    const absolute = new URL(url, typeof location === "undefined" ? undefined : location.href).href
    if (!this.config.modules.some(entry => entry.url === absolute)) {
      this.config = { ...this.config, modules: [...this.config.modules, { url: absolute, enabled: true }] }
      this.save()
    }
    return this.reload(absolute)
  }

  /** Forgets a module the person added. One a recording still names stays, without its script. */
  async remove(url: string): Promise<void> {
    this.config = { ...this.config, modules: this.config.modules.filter(entry => entry.url !== url) }
    this.save()
    await this.reload(url)
  }

  /** Turns a module the person added on or off. */
  async setEnabled(url: string, enabled: boolean): Promise<void> {
    this.config = { ...this.config, modules: this.config.modules.map(entry => entry.url === url ? { ...entry, enabled } : entry) }
    this.save()
    await this.reload(url)
  }

  /** The person's configuration as a file holds it. */
  exportText(): string {
    return ModuleConfig.text(this.config)
  }

  /** Replaces the person's configuration with the one in `text` (an exported file), and loads it. */
  async importText(text: string): Promise<void> {
    const config = ModuleConfig.parse(text)
    await this.start()
    const before = this.config.modules.map(entry => entry.url)
    this.config = config
    this.save()
    await Promise.all([...new Set([...before, ...config.modules.map(entry => entry.url)])].map(url => this.reload(url)))
  }

  /**
   * Loads the modules a recording names, its addresses read from `base` (the recording's own address). Returns once each is installed or
   * has failed, so that what the recording draws from them can be drawn.
   */
  async require(urls: readonly string[] | undefined, base?: string): Promise<void> {
    if (!urls?.length) return
    await this.start()
    await Promise.all(urls.map(async url => {
      let absolute: string
      try {
        absolute = new URL(url, base ?? (typeof location === "undefined" ? undefined : location.href)).href
      } catch {
        return
      }
      const known = this.states.get(absolute)
      if (known && known.status !== "off") return known.status === "loading" ? this.pending.get(absolute) : undefined
      this.named.add(absolute)
      await this.reload(absolute)
    }))
  }

  /** The addresses recordings of this page named. */
  private readonly named = new Set<string>()
  private readonly pending = new Map<string, Promise<ModuleState>>()

  private async applyConfig(config: ModuleConfigJson): Promise<void> {
    this.config = config
    await Promise.all(config.modules.map(entry => this.reload(entry.url)))
  }

  /** Brings module `url` to what the configuration and the recordings now ask of it. */
  private reload(url: string): Promise<ModuleState> {
    const run = this.reloadNow(url)
    this.pending.set(url, run)
    return run
  }

  private async reloadNow(url: string): Promise<ModuleState> {
    const entry = this.config.modules.find(candidate => candidate.url === url)
    const previous = this.states.get(url)
    if (previous?.loaded) ModuleRegistry.uninstall(previous.loaded.module.id)
    const addedByPerson = entry !== undefined
    const enabled = entry?.enabled ?? true
    if (!addedByPerson && !this.named.has(url)) {
      this.states.delete(url)
      this.announce()
      return { url, addedByPerson, enabled, status: "off" }
    }
    // Off for the person, and named by no recording: nothing of it is loaded.
    if (addedByPerson && !enabled && !this.named.has(url)) return this.set({ url, addedByPerson, enabled, status: "off" })
    this.set({ url, addedByPerson, enabled, status: "loading" })
    try {
      const loaded = await this.loader.load(url, { runScript: addedByPerson && enabled })
      ModuleRegistry.install(loaded.module)
      return this.set({ url, addedByPerson, enabled, status: "installed", loaded })
    } catch (error) {
      return this.set({ url, addedByPerson, enabled, status: "failed", error: error instanceof Error ? error.message : String(error) })
    }
  }

  private set(state: ModuleState): ModuleState {
    this.states.set(state.url, state)
    this.announce()
    return state
  }

  private save(): void {
    ModuleConfig.write(this.config, this.storage)
  }

  private announce(): void {
    this.changes.dispatchEvent(new Event("change"))
  }
}
