import { ModuleManifest } from "./ModuleManifest.js"
import type { ModuleManifestJson, ModuleScript } from "./ModuleManifest.js"
import type { ModuleContributions, UfoAtHomeModule } from "./ModuleRegistry.js"

/** A module read from its address: what it is, and whether it brought code that was run, or that was not. */
export interface LoadedModule {
  url: string
  manifest: ModuleManifestJson
  module: UfoAtHomeModule
  /** Whether the manifest names a script. */
  hasScript: boolean
  /** Whether that script was run. */
  scriptRun: boolean
}

export interface ModuleLoaderOptions {
  fetchImpl?: typeof fetch
  /** How a script is imported: the browser's own `import()`, unless a test says otherwise. */
  importImpl?: (url: string) => Promise<{ default?: unknown }>
}

/**
 * Reads a module from the address of its manifest (see ModuleManifest): fetches it, checks it, and, when it is allowed to, imports its
 * script.
 *
 * A script runs on this page's origin, with everything the page can do. So it is run only for a module the person added themself
 * (see ModuleSession): a recording that names a module brings what its manifest states, never its code.
 */
export class ModuleLoader {
  private readonly fetchImpl: typeof fetch
  private readonly importImpl: (url: string) => Promise<{ default?: unknown }>

  constructor(options: ModuleLoaderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.importImpl = options.importImpl ?? (url => import(/* @vite-ignore */ url))
  }

  async load(url: string, options: { runScript: boolean }): Promise<LoadedModule> {
    const response = await this.fetchImpl(url)
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    const manifest = ModuleManifest.check(await response.json(), url)
    const hasScript = manifest.script !== undefined
    let scripted: ModuleContributions = {}
    if (hasScript && options.runScript) {
      const scriptUrl = new URL(manifest.script!, url).href
      const imported = await this.importImpl(scriptUrl)
      if (typeof imported.default !== "function") throw new Error(`${scriptUrl}: its default export is not a function`)
      scripted = (await (imported.default as ModuleScript)({ manifestUrl: url })) ?? {}
    }
    return { url, manifest, module: ModuleManifest.module(manifest, url, scripted), hasScript, scriptRun: hasScript && options.runScript }
  }
}
