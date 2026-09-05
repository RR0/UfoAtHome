import type { DecorKind } from "../../../engine/model/Decor.js"
import type { DecorModelEntry, DecorModelProvider } from "../DecorModelProvider.js"

/** Where the models live when the page itself doesn't carry a copy — see the class doc comment. */
export const UFOATHOME_MODEL_INDEX_URL = "https://ufoathome.org/models/index.json"

/** The index file's own shape, as served. Deliberately not DecorModelEntry: an entry states a full
 * `url`, whereas the file states a `file` RELATIVE to the index, so the whole catalogue can be
 * copied to another host (or served from a dev server) without rewriting every address in it. */
interface ModelIndexFile {
  version: number
  attribution?: string
  models: (Omit<DecorModelEntry, "url"> & { file: string })[]
}

export interface UfoAtHomeModelCatalogueOptions {
  fetchImpl?: typeof fetch
  /** Overrides where the index is looked for, in order. Mainly for tests. */
  indexUrls?: string[]
}

/**
 * The models UFO@home hosts itself.
 *
 * This exists because of what happened when the catalogue question was asked seriously: the sources
 * that are readable cross-origin (Khronos's own sample assets, Poly Haven) hold test objects and
 * props, and the CC0 kits that do contain a car, an airframe or a shed are on third-party mirrors
 * whose permanence and stated licence vary. A reconstruction cannot rest on that. So the rule here
 * is the same one the rest of this project applies to data it did not produce: when a source isn't
 * guaranteed to last, take a copy, keep the credit with it, and serve it from somewhere that will.
 *
 * The index is looked for BESIDE THE PAGE first and on ufoathome.org otherwise. A host that mirrors
 * the models (this site itself, or a dev server) serves its own; every other page embedding
 * `<rr0-scene>` — rr0.org's case dossiers above all — gets them from here, with no configuration.
 * A miss on the first address is not an error worth reporting: it is the ordinary case everywhere
 * except this site.
 */
export class UfoAtHomeModelCatalogue implements DecorModelProvider {
  readonly attribution = "3D models re-hosted by UFO@home, each under its own author's licence"
  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  /** The one in-flight (or settled) load. A catalogue is small and never changes within a session,
   * and the editor asks for it on every decor selection. */
  private loading?: Promise<DecorModelEntry[]>

  constructor(options: UfoAtHomeModelCatalogueOptions = {}) {
    // fetch.bind(globalThis) — an unbound fetch loses the `this` it requires once called as a
    // field (see AwsTerrariumElevationProvider, which learned the same thing).
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? defaultIndexUrls()
  }

  async entries(kind?: DecorKind): Promise<DecorModelEntry[]> {
    const all = await this.load()
    return kind ? all.filter(entry => entry.kind === kind) : all
  }

  async entry(id: string): Promise<DecorModelEntry | undefined> {
    return (await this.load()).find(entry => entry.id === id)
  }

  private load(): Promise<DecorModelEntry[]> {
    this.loading ??= this.fetchFirstAvailable()
    return this.loading
  }

  private async fetchFirstAvailable(): Promise<DecorModelEntry[]> {
    for (const indexUrl of this.indexUrls) {
      const entries = await this.fetchIndex(indexUrl)
      if (entries) return entries
    }
    // No catalogue reachable at all — offline, or a host that mirrors nothing and cannot reach this
    // site. Every recording then draws its primitives, which is exactly what it did before models
    // existed; nothing is broken, so nothing is thrown.
    return []
  }

  private async fetchIndex(indexUrl: string): Promise<DecorModelEntry[] | undefined> {
    try {
      const response = await this.fetchImpl(indexUrl)
      if (!response.ok) return undefined
      const file = (await response.json()) as ModelIndexFile
      if (!Array.isArray(file?.models)) return undefined
      return file.models.map(({ file: relative, ...entry }) => ({ ...entry, url: new URL(relative, indexUrl).href }))
    } catch {
      // A 404 served as HTML, a CORS refusal, an offline browser: all the same answer here — this
      // address doesn't hold the catalogue, try the next.
      return undefined
    }
  }
}

/** Beside the page first, then this project's own host. Guarded for a non-browser context (tests,
 * SSR), where there is no page to look beside. */
function defaultIndexUrls(): string[] {
  const here = typeof location === "undefined" ? undefined : new URL("/models/index.json", location.href).href
  return here && here !== UFOATHOME_MODEL_INDEX_URL ? [here, UFOATHOME_MODEL_INDEX_URL] : [UFOATHOME_MODEL_INDEX_URL]
}
