import type { DecorKind } from "../../engine/model/Decor.js"
import type { DecorModelEntry, DecorModelProvider } from "../../render3d/decor/DecorModelProvider.js"

/**
 * The models a module lists in its manifest (see ModuleManifest), in the form of UFO@home's own index (public/models/index.json): each
 * with its `file` already made absolute from the manifest's address.
 */
export class ManifestModelCatalogue implements DecorModelProvider {
  constructor(readonly attribution: string, private readonly models: readonly DecorModelEntry[]) {
  }

  async entries(kind?: DecorKind): Promise<DecorModelEntry[]> {
    return kind ? this.models.filter(entry => [entry.kind].flat().includes(kind)) : [...this.models]
  }

  async entry(id: string): Promise<DecorModelEntry | undefined> {
    return this.models.find(entry => entry.id === id)
  }
}
