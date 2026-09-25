import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { HtmlPage, type HtmlPagePlacement } from "./HtmlPage.js"
import { FALLBACK_LANGUAGE, type Said, SITE_LANGUAGES } from "./SitePage.js"

/**
 * Reads a directory of HTML pages off disk: `index.html` for the fallback language,
 * `index_<lang>.html` for each other one, and each sub-directory as a sub-page published under the
 * parent's path, reached from the parent rather than from the navigation.
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
    const pages = [HtmlPage.of(slug, files, version, placement)]
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
