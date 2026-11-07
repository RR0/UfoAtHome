import type { DataSource } from "../engine/source/DataSource.js"
import type { DecorModelEntry } from "../render3d/decor/DecorModelProvider.js"
import type { ElevationProvider } from "../render3d/terrain/ElevationProvider.js"
import type { ImageryProvider } from "../render3d/terrain/ImageryProvider.js"
import type { ModuleContributions, UfoAtHomeModule } from "./ModuleRegistry.js"
import { ManifestModelCatalogue } from "./models/ManifestModelCatalogue.js"
import { AwsTerrariumElevationProvider } from "./providers/terrain/AwsTerrariumElevationProvider.js"
import { XyzImageryProvider } from "./providers/terrain/XyzImageryProvider.js"

/** A source of tiles a manifest names: an address and the credit its licence asks for. */
export interface TileSourceJson {
  /** Unique at its point: an id of the module's own ("acme-ortho"), since another module's or a built-in one is refused. */
  id: string
  name: string
  credit: string
  creditUrl: string
  /** The address of one tile, with `{z}`, `{x}` and `{y}`: "https://tiles.example.org/ortho/{z}/{x}/{y}.jpg". */
  tiles: string
}

/** A model a manifest lists: an entry of UFO@home's own index (public/models/index.json), its `file` relative to the manifest. */
export type ManifestModelJson = Omit<DecorModelEntry, "url"> & { file: string }

/**
 * What a module says of itself in its `ufoathome-module.json`, read from its address (see ModuleLoader).
 *
 * Most of what a module can bring needs no code: tiles of imagery or of relief are an address and a credit, models are files and their
 * credits. Those are stated here, and turned into implementations by this project's own code. What does need code (a weather service
 * with an answer of its own shape) is a `script`: an ES module whose default export returns the contributions, run only when the
 * person has added the module themself (see ModuleConfig).
 */
export interface ModuleManifestJson {
  /** The version of this format: 1. A newer one is refused, not misread. */
  format: 1
  /** Unique among the modules (see UfoAtHomeModule.id). */
  id: string
  name: string
  credit?: string
  creditUrl?: string
  contributes?: {
    imagery?: TileSourceJson[]
    /** Relief as Terrarium-encoded PNG tiles (height = R × 256 + G + B / 256 − 32768 metres), the encoding AWS's terrain tiles use. */
    elevation?: TileSourceJson[]
    models?: ManifestModelJson[]
  }
  /**
   * An ES module, relative to the manifest, whose default export is called with the module's context and returns (or resolves to) more
   * contributions, at any extension point (see ModuleContributions).
   */
  script?: string
}

/** What a module's script is given. */
export interface ModuleScriptContext {
  /** The manifest's own address, for the script to resolve its files from. */
  manifestUrl: string
}

/** The default export of a module's script. */
export type ModuleScript = (context: ModuleScriptContext) => ModuleContributions | Promise<ModuleContributions>

/** A manifest that cannot be read as one: what is wrong with it, in words a person who wrote it can fix it from. */
export class ModuleManifestError extends Error {
  constructor(readonly url: string, readonly reason: string) {
    super(`${url}: ${reason}`)
    this.name = "ModuleManifestError"
  }
}

/** Reads a manifest, and turns what it states into the implementations of a module. */
export class ModuleManifest {
  static readonly FORMAT = 1

  /** `json` checked as a manifest, or an error saying what is wrong with it. */
  static check(json: unknown, url: string): ModuleManifestJson {
    const fail = (reason: string): never => {
      throw new ModuleManifestError(url, reason)
    }
    if (json === null || typeof json !== "object" || Array.isArray(json)) fail("not a JSON object")
    const manifest = json as Partial<ModuleManifestJson>
    if (typeof manifest.format !== "number") fail("no \"format\"")
    if (manifest.format! > ModuleManifest.FORMAT) fail(`format ${manifest.format} is newer than ${ModuleManifest.FORMAT}, which this version reads`)
    if (typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(manifest.id)) fail("\"id\" must be lowercase letters, digits, '.', '_' or '-'")
    if (typeof manifest.name !== "string" || manifest.name.trim() === "") fail("no \"name\"")
    if (manifest.script !== undefined && typeof manifest.script !== "string") fail("\"script\" must be an address")
    const contributes = manifest.contributes ?? {}
    for (const point of ["imagery", "elevation"] as const) {
      const sources = contributes[point]
      if (sources === undefined) continue
      if (!Array.isArray(sources)) fail(`"contributes.${point}" must be a list`)
      sources.forEach((source, i) => {
        for (const field of ["id", "name", "credit", "creditUrl", "tiles"] as const) {
          if (typeof source?.[field] !== "string" || source[field] === "") fail(`"contributes.${point}[${i}].${field}" is missing`)
        }
        if (!["{z}", "{x}", "{y}"].every(part => source.tiles.includes(part))) fail(`"contributes.${point}[${i}].tiles" must hold {z}, {x} and {y}`)
      })
    }
    const models = contributes.models
    if (models !== undefined) {
      if (!Array.isArray(models)) fail("\"contributes.models\" must be a list")
      models.forEach((model, i) => {
        for (const field of ["id", "name", "file"] as const) {
          if (typeof model?.[field] !== "string" || model[field] === "") fail(`"contributes.models[${i}].${field}" is missing`)
        }
        if (model.kind === undefined) fail(`"contributes.models[${i}].kind" is missing`)
        if (!model.credit || typeof model.credit !== "object") fail(`"contributes.models[${i}].credit" is missing: a model is shown with its author and licence`)
      })
    }
    return manifest as ModuleManifestJson
  }

  /** The implementations a manifest states without code. */
  static contributions(manifest: ModuleManifestJson, url: string): ModuleContributions {
    const stated = manifest.contributes ?? {}
    const contributions: ModuleContributions = {}
    if (stated.imagery?.length) {
      contributions.imagery = stated.imagery.map((source): DataSource<ImageryProvider> => ({
        id: source.id, name: source.name, credit: source.credit, creditUrl: source.creditUrl,
        create: fetchImpl => new XyzImageryProvider({ tileUrlTemplate: ModuleManifest.absoluteTemplate(source.tiles, url), attribution: source.credit, fetchImpl })
      }))
    }
    if (stated.elevation?.length) {
      contributions.elevation = stated.elevation.map((source): DataSource<ElevationProvider> => ({
        id: source.id, name: source.name, credit: source.credit, creditUrl: source.creditUrl,
        create: fetchImpl => new AwsTerrariumElevationProvider({ tileUrlTemplate: ModuleManifest.absoluteTemplate(source.tiles, url), fetchImpl })
      }))
    }
    if (stated.models?.length) {
      const entries = stated.models.map(({ file, ...entry }) => ({ ...entry, url: new URL(file, url).href }))
      const credit = manifest.credit ?? manifest.name
      contributions.decorModels = [{
        id: `${manifest.id}-models`, name: manifest.name, credit, creditUrl: manifest.creditUrl ?? url,
        create: () => new ManifestModelCatalogue(credit, entries)
      }]
    }
    return contributions
  }

  /** The module a manifest describes, with what its script added at each point beside what the manifest states. */
  static module(manifest: ModuleManifestJson, url: string, scripted: ModuleContributions = {}): UfoAtHomeModule {
    const contributes: ModuleContributions = ModuleManifest.contributions(manifest, url)
    for (const [point, sources] of Object.entries(scripted) as [keyof ModuleContributions, DataSource<never>[] | undefined][]) {
      if (!Array.isArray(sources)) continue
      ;(contributes as Record<string, DataSource<never>[]>)[point] = [...((contributes[point] as DataSource<never>[] | undefined) ?? []), ...sources]
    }
    return { id: manifest.id, name: manifest.name, credit: manifest.credit, creditUrl: manifest.creditUrl, url, contributes }
  }

  /** A tile address made absolute from the manifest's, its placeholders kept (URL would escape their braces). */
  private static absoluteTemplate(template: string, url: string): string {
    const marked = template.replaceAll("{z}", "__Z__").replaceAll("{x}", "__X__").replaceAll("{y}", "__Y__")
    return new URL(marked, url).href.replaceAll("__Z__", "{z}").replaceAll("__X__", "{x}").replaceAll("__Y__", "{y}")
  }
}
