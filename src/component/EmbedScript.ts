/** The entry modules an embed code can load, each named after the element it is for (the editor's registers `<rr0-case-editor>` too). */
export type EmbeddedModule = "rr0-sighting" | "rr0-sighting-editor"

/**
 * The address of the module an embed code loads: the one the share dialog writes in its `<script>`.
 *
 * Two promises, for two kinds of author. By default, the CURRENT component: `/lib/rr0-sighting.mjs`, whose bytes change at every
 * release, so the embed gets every fix, and reads its recording all the same since the recording states the version of its format
 * (see FormatVersion). Frozen, THIS release, for an author who wants the rendering they checked and not a later one: the package as
 * published on npm, served by jsDelivr, which keeps every version for good. Not from this site, which holds only the current
 * release: each deployment replaces the whole site, so a `/lib/<version>/` of its own would be gone at the next one. A link is
 * frozen the same way: the site's page, asked for a version by `?v=`, loads that version's components from the same place.
 */
export class EmbedScript {

  /** The npm package the components are published in. */
  static readonly PACKAGE = "@rr0/ufoathome"

  /** Where a published version of the package is served from, as `<CDN>/<package>@<version>/<file>`. */
  static readonly CDN = "https://cdn.jsdelivr.net/npm"

  /** The directory of each entry module in the package (see its `exports`). */
  private static readonly DIRECTORIES: Record<EmbeddedModule, string> = {
    "rr0-sighting": "dist-embed-sighting",
    "rr0-sighting-editor": "dist-embed-sighting-editor"
  }

  /**
   * The current component, beside the module that is running (`loadedFrom`, its import.meta.url), so that an embed code made on a
   * staging or local copy points back at that copy. Without the version directory the site's own pages load it from (see
   * Layout.versioned), which is gone at the next release; and on the site itself when this module came from the CDN.
   */
  static current(module: EmbeddedModule, loadedFrom: string, home: string): string {
    const url = new URL(`${module}.mjs`, loadedFrom)
    if (url.href.startsWith(`${EmbedScript.CDN}/`)) return `${home}/lib/${module}.mjs`
    url.pathname = url.pathname.replace(/\/lib\/\d+\.\d+\.\d+[^/]*\//, "/lib/")
    return url.href
  }

  /** The query parameter by which a page of the site is asked for the components of a given version (see Layout's module loader). */
  static readonly VERSION_PARAMETER = "v"

  /** Whether `module` (an entry module's name, without `.mjs`) is one a page or an embed can freeze. */
  static freezable(module: string): module is EmbeddedModule {
    return module in EmbedScript.DIRECTORIES
  }

  /**
   * A link to one of the site's pages, asking it for the components of `version`: the page is the site's own, as it is now, and
   * what it plays or edits with is that version, loaded from the package as published on npm.
   */
  static frozenLink(link: string, version: string): string {
    const url = new URL(link)
    url.searchParams.set(EmbedScript.VERSION_PARAMETER, version)
    return url.href
  }

  /** The component of `version` for good, as published on npm. */
  static frozen(module: EmbeddedModule, version: string): string {
    return `${EmbedScript.CDN}/${EmbedScript.PACKAGE}@${version}/${EmbedScript.DIRECTORIES[module]}/${module}.mjs`
  }
}
