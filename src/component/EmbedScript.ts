/** The elements the share dialog can give the embed code of. */
export type EmbeddedTag = "rr0-sighting" | "rr0-sighting-editor"

/**
 * The address of the module an embed code loads: the one the share dialog writes in its `<script>`.
 *
 * Two promises, for two kinds of author. By default, the CURRENT component: `/lib/rr0-sighting.mjs`, whose bytes change at every
 * release, so the embed gets every fix, and reads its recording all the same since the recording states the version of its format
 * (see FormatVersion). Frozen, THIS release, for an author who wants the rendering they checked and not a later one: the package as
 * published on npm, served by jsDelivr, which keeps every version for good. Not from this site, which holds only the current
 * release: each deployment replaces the whole site, so a `/lib/<version>/` of its own would be gone at the next one.
 */
export class EmbedScript {

  /** The npm package the components are published in. */
  static readonly PACKAGE = "@rr0/ufoathome"

  /** Where a published version of the package is served from, as `<CDN>/<package>@<version>/<file>`. */
  static readonly CDN = "https://cdn.jsdelivr.net/npm"

  /** The directory of each entry module in the package (see its `exports`). */
  private static readonly DIRECTORIES: Record<EmbeddedTag, string> = {
    "rr0-sighting": "dist-embed-sighting",
    "rr0-sighting-editor": "dist-embed-sighting-editor"
  }

  /**
   * The current component, beside the module that is running (`loadedFrom`, its import.meta.url), so that an embed code made on a
   * staging or local copy points back at that copy. Without the version directory the site's own pages load it from (see
   * Layout.versioned), which is gone at the next release; and on the site itself when this module came from the CDN.
   */
  static current(tag: EmbeddedTag, loadedFrom: string, home: string): string {
    const url = new URL(`${tag}.mjs`, loadedFrom)
    if (url.href.startsWith(`${EmbedScript.CDN}/`)) return `${home}/lib/${tag}.mjs`
    url.pathname = url.pathname.replace(/\/lib\/\d+\.\d+\.\d+[^/]*\//, "/lib/")
    return url.href
  }

  /** The component of `version` for good, as published on npm. */
  static frozen(tag: EmbeddedTag, version: string): string {
    return `${EmbedScript.CDN}/${EmbedScript.PACKAGE}@${version}/${EmbedScript.DIRECTORIES[tag]}/${tag}.mjs`
  }
}
