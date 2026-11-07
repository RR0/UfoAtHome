import type { DataSource } from "../engine/source/DataSource.js"
import type { Assessor } from "../engine/assessment/Assessor.js"
import type { LightPollutionProvider } from "../engine/atmosphere/LightPollutionProvider.js"
import type { NarrativeProvider } from "../engine/narrative/NarrativeProvider.js"
import type { PlaceProvider } from "../engine/place/PlaceProvider.js"
import type { TimeZoneProvider } from "../engine/time/TimeZoneProvider.js"
import type { AircraftProvider } from "../engine/traffic/AircraftProvider.js"
import type { UpperAirProvider } from "../engine/traffic/UpperAirProvider.js"
import type { WeatherProvider } from "../engine/weather/WeatherProvider.js"
import type { DecorModelProvider } from "../render3d/decor/DecorModelProvider.js"
import type { ElevationProvider } from "../render3d/terrain/ElevationProvider.js"
import type { ImageryProvider } from "../render3d/terrain/ImageryProvider.js"
import type { SurroundingsProvider } from "../render3d/terrain/SurroundingsProvider.js"

/**
 * What each extension point of UFO@home is a list of: the interface an implementation of that point gives.
 *
 * A point is a place where this project offers a choice of implementations (a picker in the editor, a fallback order in the
 * scene): where the weather of a date is read from, which survey draws the buildings round a place, which scheme assesses a
 * recording. Adding a point is adding a line here, and the list of its built-in implementations in the folder of its kind
 * (see src/modules/README.md).
 */
export interface ExtensionPointTypes {
  /** Where the weather of a place and a date is read from (see WeatherProvider). */
  weather: WeatherProvider
  /** Where a place's name is looked up and its coordinates found (see PlaceProvider). */
  place: PlaceProvider
  /** Where the time zone of a place at a date is found (see TimeZoneProvider). */
  timeZone: TimeZoneProvider
  /** What drafts a recording from an account in prose (see NarrativeProvider). */
  narrative: NarrativeProvider
  /** The schemes a finished recording can be assessed by (see Assessor). */
  assessment: Assessor
  /** Where the artificial brightness of the night sky is read from (see LightPollutionProvider). */
  lightPollution: LightPollutionProvider
  /** Where the aircraft that were flying round a place are read from (see AircraftProvider). */
  aircraft: AircraftProvider
  /** Where the profile of the air aloft is read from, for contrails (see UpperAirProvider). */
  upperAir: UpperAirProvider
  /** Where the ground's relief is read from (see ElevationProvider). */
  elevation: ElevationProvider
  /** What aerial imagery the relief is draped with (see ImageryProvider). */
  imagery: ImageryProvider
  /** Which survey the trees, buildings and lines round a place are taken from (see SurroundingsProvider). */
  surroundings: SurroundingsProvider
  /** Which catalogues the 3D models of the decor and of bodies come from (see DecorModelProvider). */
  decorModels: DecorModelProvider
}

export type ExtensionPointId = keyof ExtensionPointTypes

/** What a module adds, by extension point. */
export type ModuleContributions = { [K in ExtensionPointId]?: DataSource<ExtensionPointTypes[K]>[] }

/**
 * A set of implementations that arrive together, because they come from the same author or the same service: a national
 * survey that gives a relief, an imagery and buildings; a weather service that also knows time zones.
 *
 * The implementations UFO@home is built with are a module like any other, `ufoathome` (see ModuleRegistry.BUILT_IN), whose
 * entries are written in each kind's `*Sources.ts` under src/modules. Another is installed with `ModuleRegistry.install`.
 */
export interface UfoAtHomeModule {
  /** Stable and unique among the modules: what a stored configuration names. */
  id: string
  /** What the list of modules calls it. */
  name: string
  /** Who wrote it, as their licence asks to be credited. */
  credit?: string
  /** Where that credit points: the module's own page or repository. */
  creditUrl?: string
  /** Where it was loaded from, when it was not part of this build. */
  url?: string
  contributes: ModuleContributions
}

/** A module whose entries cannot all be added: an id another module already gives at the same point. */
export class ModuleConflictError extends Error {
  constructor(readonly moduleId: string, readonly point: ExtensionPointId, readonly sourceId: string, readonly ownerId: string) {
    super(`Module "${moduleId}" gives "${sourceId}" at ${point}, which module "${ownerId}" already gives`)
    this.name = "ModuleConflictError"
  }
}

/**
 * The implementations available at one extension point, in the order they are offered: the built-in ones first (the first of
 * them is the default everywhere, see dataSourceById), then those of other modules, in the order they were installed.
 *
 * `sources` is one array for the life of the page, changed in place: a registry that read it once (a `*_SOURCES` constant)
 * sees what is installed afterwards without being asked again.
 */
export class ExtensionPoint<T> {
  readonly sources: DataSource<T>[] = []
  /** Which module gives each source, by source id. */
  private readonly owners = new Map<string, string>()

  constructor(readonly id: ExtensionPointId) {
  }

  /** The module that gives the source `sourceId` here, if any does. */
  ownerOf(sourceId: string): string | undefined {
    return this.owners.get(sourceId)
  }

  /** Whether `sources` can be given by `moduleId` here: an id given by another module cannot be taken over. */
  conflict(moduleId: string, sources: readonly DataSource<T>[]): { sourceId: string, ownerId: string } | undefined {
    for (const source of sources) {
      const ownerId = this.owners.get(source.id)
      if (ownerId !== undefined && ownerId !== moduleId) return { sourceId: source.id, ownerId }
    }
    return undefined
  }

  /**
   * Adds the sources `moduleId` gives here, replacing those it gave before. Returns the point's own array, which is what a
   * `*_SOURCES` constant is.
   */
  provide(moduleId: string, sources: readonly DataSource<T>[]): DataSource<T>[] {
    const conflict = this.conflict(moduleId, sources)
    if (conflict) throw new ModuleConflictError(moduleId, this.id, conflict.sourceId, conflict.ownerId)
    this.withdraw(moduleId)
    // The built-in sources stay ahead of the others whenever they are given: a module installed before the chunk that
    // declares the built-in ones was loaded must not become the default.
    const at = moduleId === ModuleRegistry.BUILT_IN
      ? this.sources.findIndex(source => this.owners.get(source.id) !== ModuleRegistry.BUILT_IN)
      : -1
    if (at < 0) this.sources.push(...sources)
    else this.sources.splice(at, 0, ...sources)
    for (const source of sources) this.owners.set(source.id, moduleId)
    return this.sources
  }

  /** Removes the sources `moduleId` gives here. */
  withdraw(moduleId: string): void {
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const id = this.sources[i].id
      if (this.owners.get(id) === moduleId) {
        this.sources.splice(i, 1)
        this.owners.delete(id)
      }
    }
  }
}

/**
 * Every extension point of UFO@home and the modules that give implementations to them.
 *
 * The built-in implementations are declared where their kind's registry is (`WEATHER_SOURCES` in
 * src/modules/providers/weather/weatherSources.ts, and so on), each through `point(...).provide(BUILT_IN, [...])`, so that a
 * bundle that never reads the weather never loads a weather provider. Another module is installed whole with `install`, and
 * its entries appear after the built-in ones in every picker that lists the point.
 *
 * `changes` tells who lists a point that its list changed (an event `change` whose `detail` is the point's id).
 */
export class ModuleRegistry {
  /** The id of the module UFO@home's own implementations belong to. */
  static readonly BUILT_IN = "ufoathome"

  /** Fires `change` (a CustomEvent whose detail is the ExtensionPointId) when a point gains or loses sources. */
  static readonly changes = new EventTarget()

  private static readonly points = new Map<ExtensionPointId, ExtensionPoint<unknown>>()
  private static readonly modules = new Map<string, UfoAtHomeModule>()

  /** The point `id`, created empty the first time it is asked for. */
  static point<K extends ExtensionPointId>(id: K): ExtensionPoint<ExtensionPointTypes[K]> {
    let point = ModuleRegistry.points.get(id)
    if (!point) {
      point = new ExtensionPoint<unknown>(id)
      ModuleRegistry.points.set(id, point)
    }
    return point as ExtensionPoint<ExtensionPointTypes[K]>
  }

  /**
   * Adds `module`'s implementations to every point it contributes to, or none of them when one cannot be added (an id that
   * another module gives at the same point): a module half installed would be a module nobody wrote. Installing a module
   * again replaces what it gave before.
   */
  static install(module: UfoAtHomeModule): void {
    if (module.id === ModuleRegistry.BUILT_IN) throw new Error(`"${ModuleRegistry.BUILT_IN}" is the id of the built-in module`)
    const contributions = ModuleRegistry.contributionsOf(module)
    for (const [id, sources] of contributions) {
      const conflict = ModuleRegistry.point(id).conflict(module.id, sources as DataSource<never>[])
      if (conflict) throw new ModuleConflictError(module.id, id, conflict.sourceId, conflict.ownerId)
    }
    const changed = new Set<ExtensionPointId>(contributions.map(([id]) => id))
    const previous = ModuleRegistry.modules.get(module.id)
    if (previous) for (const [id] of ModuleRegistry.contributionsOf(previous)) changed.add(id)
    for (const id of changed) ModuleRegistry.point(id).withdraw(module.id)
    for (const [id, sources] of contributions) ModuleRegistry.point(id).provide(module.id, sources as DataSource<never>[])
    ModuleRegistry.modules.set(module.id, module)
    for (const id of changed) ModuleRegistry.announce(id)
  }

  /** Removes everything module `id` gave. */
  static uninstall(id: string): void {
    const module = ModuleRegistry.modules.get(id)
    if (!module) return
    ModuleRegistry.modules.delete(id)
    for (const [point] of ModuleRegistry.contributionsOf(module)) {
      ModuleRegistry.point(point).withdraw(id)
      ModuleRegistry.announce(point)
    }
  }

  /** The modules installed besides the built-in one, in the order they were installed. */
  static installed(): readonly UfoAtHomeModule[] {
    return [...ModuleRegistry.modules.values()]
  }

  private static contributionsOf(module: UfoAtHomeModule): [ExtensionPointId, DataSource<unknown>[]][] {
    return (Object.entries(module.contributes) as [ExtensionPointId, DataSource<unknown>[] | undefined][])
      .filter((entry): entry is [ExtensionPointId, DataSource<unknown>[]] => Array.isArray(entry[1]) && entry[1].length > 0)
  }

  private static announce(id: ExtensionPointId): void {
    ModuleRegistry.changes.dispatchEvent(new CustomEvent("change", { detail: id }))
  }
}
