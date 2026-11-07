import type { DecorKind } from "../../engine/model/Decor.js"
import type { DecorModelEntry, DecorModelProvider } from "../../render3d/decor/DecorModelProvider.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import { ModuleRegistry } from "../ModuleRegistry.js"
import { DECOR_MODEL_SOURCES } from "./decorModelSources.js"

/**
 * Every model catalogue at once, one of them preferred: what the scene and the editor read models through.
 *
 * A recording names a model by its id, and that id may come from any catalogue a module brought (see ModuleRegistry), not only the one
 * the author's picker shows. So a model is looked up in the preferred catalogue first, then in each of the others in their order, and
 * the first that knows it answers. What is offered for picking (`entries`) is the preferred catalogue's alone: the picker of catalogues is
 * how the author says which they are browsing.
 *
 * Each catalogue is built once, when it is first asked; one a module removed is no longer asked.
 */
export class ModelCatalogues implements DecorModelProvider {
  readonly attribution = "3D models, each under its own author's licence"
  private readonly built = new Map<DataSource<DecorModelProvider>, DecorModelProvider>()

  /** `preferredId`: the catalogue browsed, the first of the registry when absent or unknown. */
  constructor(private readonly preferredId?: string, private readonly sources: readonly DataSource<DecorModelProvider>[] = DECOR_MODEL_SOURCES) {
  }

  /** The catalogues in the order they are asked: the preferred one, then the others. */
  private catalogues(): DecorModelProvider[] {
    const preferred = this.sources.find(source => source.id === this.preferredId) ?? this.sources[0]
    const ordered = preferred ? [preferred, ...this.sources.filter(source => source !== preferred)] : []
    return ordered.map(source => {
      let catalogue = this.built.get(source)
      if (!catalogue) {
        catalogue = source.create()
        this.built.set(source, catalogue)
      }
      return catalogue
    })
  }

  entries(kind?: DecorKind): Promise<DecorModelEntry[]> {
    const preferred = this.catalogues()[0]
    return preferred ? preferred.entries(kind) : Promise.resolve([])
  }

  async entry(id: string): Promise<DecorModelEntry | undefined> {
    for (const catalogue of this.catalogues()) {
      // A catalogue that cannot be reached knows nothing today: the next one is asked.
      const entry = await catalogue.entry(id).catch(() => undefined)
      if (entry) return entry
    }
    return undefined
  }

  /** The module that brought the catalogue which knows model `id`, if it is not a built-in one: what a recording that uses it has to name. */
  async moduleOf(id: string): Promise<string | undefined> {
    const point = ModuleRegistry.point("decorModels")
    for (const source of this.sources) {
      const owner = point.ownerOf(source.id)
      if (owner === undefined || owner === ModuleRegistry.BUILT_IN) continue
      if (await this.catalogueOf(source).entry(id).catch(() => undefined)) return owner
    }
    return undefined
  }

  private catalogueOf(source: DataSource<DecorModelProvider>): DecorModelProvider {
    this.catalogues()
    return this.built.get(source)!
  }
}
