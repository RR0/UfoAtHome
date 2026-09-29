import { access, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { HtmlPage, type HtmlPagePlacement } from "./HtmlPage.js"
import { EXTRA_LANGUAGES, type ExtraLanguage, FALLBACK_LANGUAGE, type Said, SITE_LANGUAGES } from "./SitePage.js"

/**
 * Reads a directory of HTML pages off disk: `index.html` for the fallback language,
 * `index_<lang>.html` for each other one, and each sub-directory as a sub-page published under the
 * parent's path, reached from the parent rather than from the navigation.
 *
 * `index_es.html` and `index_it.html` are optional (see EXTRA_LANGUAGES): a page is translated into
 * them only where it matters, and readers of those languages get it where it exists.
 */
export class HtmlPageTree {

  /**
   * The page in `dir` and every page below it, sub-pages after their parent, siblings by name.
   *
   * @param slug Where `dir` is published, e.g. "roadmap".
   * @param placement Where the top page appears.
   */
  static async read(dir: string, slug: string, version: string, placement: HtmlPagePlacement = {}): Promise<HtmlPage[]> {
    const files = {} as Said<{ name: string, html: string }>
    for (const language of SITE_LANGUAGES) {
      const name = join(dir, language === FALLBACK_LANGUAGE ? "index.html" : `index_${language}.html`)
      files[language] = { name, html: await readFile(name, "utf8") }
    }
    // The extra languages are optional: a page is translated into them only where it matters.
    const extraFiles: Partial<Record<ExtraLanguage, { name: string, html: string }>> = {}
    for (const language of EXTRA_LANGUAGES) {
      const name = join(dir, `index_${language}.html`)
      if (await access(name).then(() => true, () => false)) {
        extraFiles[language] = { name, html: await readFile(name, "utf8") }
      }
    }
    const pages = [HtmlPage.of(slug, files, version, placement, extraFiles)]
    const subDirs = (await readdir(dir, { withFileTypes: true }))
      // A dot-directory is a tool's (an editor's, an agent's), never a page.
      .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
      .map(entry => entry.name)
      .sort()
    for (const sub of subDirs) {
      pages.push(...await HtmlPageTree.read(join(dir, sub), `${slug}/${sub}`, version,
        { asideFromNav: true, asideFromFooter: true }))
    }
    return pages
  }
}
