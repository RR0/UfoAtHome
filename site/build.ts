import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Layout } from "./Layout.js"
import { SITE_LANGUAGES, type SiteLanguage, type SitePage } from "./SitePage.js"
import { HomePage } from "./content/HomePage.js"
import { PlayerPage } from "./content/PlayerPage.js"
import { EditorPage } from "./content/EditorPage.js"
import { DemosPage } from "./content/DemosPage.js"
import { DocsPage } from "./content/DocsPage.js"
import { DocsCreatePage } from "./content/DocsCreatePage.js"
import { DocsSharePage } from "./content/DocsSharePage.js"
import { DocsComponentsPage } from "./content/DocsComponentsPage.js"
import { FaqPage } from "./content/FaqPage.js"
import { RoadmapPage } from "./content/RoadmapPage.js"

/**
 * Builds ufoathome.org into `dist-site/`.
 *
 * Not a Vite build, and deliberately: these pages import the four component bundles that
 * `npm run build:embed*` already produces, and have nothing else to bundle. Running them through
 * Vite would mean re-emitting those bundles under hashed names — the opposite of what a page that
 * hands out a copy-pasteable `<script src>` needs. So the pages are generated, the bundles are
 * copied as they are, and `public/demo-data/` (Vite's own static directory, and the source of the
 * demo recordings for the local dev demo too) is copied alongside them.
 */
class SiteBuilder {

  private readonly root = dirname(dirname(fileURLToPath(import.meta.url)))
  private readonly out = join(this.root, "dist-site")

  /**
   * Set once the example recording has been read off disk — see `build`.
   *
   * The documentation quotes a whole file, and quoting it by hand would have been one more copy to
   * keep in step with the real one. It is read from `public/demo-data/`, which is also where the
   * page LINKS to it, so what is printed and what is served can never disagree.
   */
  private pages: readonly SitePage[] = []

  /** Every built embed directory, flattened into `/lib`. Their hashed assets (the star catalogue,
   * the weather audio) carry identical names and identical bytes across the four, so flattening
   * them de-duplicates instead of colliding — and `base: "./"` in each Vite config is what makes
   * the `new URL(asset, import.meta.url)` references keep working from there. */
  private readonly bundleDirs = [
    "dist-embed-ufo", "dist-embed-scene", "dist-embed-sighting", "dist-embed", "dist-site-lib"
  ]

  async build(): Promise<void> {
    const version = JSON.parse(await readFile(join(this.root, "package.json"), "utf8")).version as string
    const example = await readFile(join(this.root, "public", "demo-data", "example-minimal.json"), "utf8")
    this.pages = [
      new HomePage(), new PlayerPage(), new EditorPage(), new DemosPage(), new DocsPage(),
      // The documentation pages sit under the hub above and stay out of the navigation, which names
      // only it — see DocsSection for why they are split by question rather than by subject.
      new DocsCreatePage(example.trim()), new DocsSharePage(), new DocsComponentsPage(),
      new FaqPage(), new RoadmapPage()
    ]
    const layout = new Layout(this.pages, version)

    await rm(this.out, { recursive: true, force: true })
    await mkdir(this.out, { recursive: true })

    const written: string[] = []
    for (const page of this.pages) {
      for (const language of SITE_LANGUAGES) {
        const file = join(this.out, layout.fileName(page.meta, language))
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, layout.render(page, language), "utf8")
        written.push(file)
      }
    }

    await cp(join(this.root, "site", "style.css"), join(this.out, "style.css"))
    await cp(join(this.root, "site", "assets", "favicon.svg"), join(this.out, "favicon.svg"))
    await cp(join(this.root, "public", "demo-data"), join(this.out, "demo-data"), { recursive: true })

    await mkdir(join(this.out, "lib"), { recursive: true })
    for (const dir of this.bundleDirs) {
      await cp(join(this.root, dir), join(this.out, "lib"), { recursive: true })
    }
    await this.writeLegacyBundle()

    await this.writeNetlifyFiles(layout)
    await this.writeSitemap(layout)
    console.log(`dist-site: ${written.length} pages, ${this.bundleDirs.length} bundles, v${version}`)
  }

  /**
   * The address `<rr0-eyewitness>` was published at, kept working under the name it now has.
   *
   * A module and not a redirect: pages already load this exact URL in a `<script type="module">`
   * — rr0.org's own case files among them — and a re-export is the one form of forwarding that
   * costs nothing and cannot go wrong on a cross-origin fetch, which is how every one of those
   * pages reaches it. The bundle it points at registers both tag names (see SightingElement), so
   * a page written against the old name keeps working without changing a character.
   */
  private async writeLegacyBundle(): Promise<void> {
    await writeFile(
      join(this.out, "lib", "rr0-eyewitness.mjs"),
      "/* Renamed to rr0-sighting.mjs in 0.41.0. This address goes on working: the bundle it loads\n"
      + "   registers <rr0-eyewitness> as well as <rr0-sighting>. */\n"
      + "export * from \"./rr0-sighting.mjs\"\n",
      "utf8"
    )
  }

  /**
   * `_headers` is read by Netlify from the DEPLOYED directory, so it is emitted here rather than
   * committed anywhere.
   *
   * `_redirects` holds no language rule. Language is decided by each page, in the head, so a
   * server-side `Language=` rule would be a second mechanism doing the same job from somewhere the
   * reader cannot see. And the one other thing a redirect rule was wanted for — turning `/Socorro`
   * into a player link — would have sat ahead of every path this site might ever add, so it lives
   * in 404.html, which by definition only runs where nothing else matched. What is left in it is
   * the retired French tree; see `retiredFrenchPaths`.
   */
  /**
   * The one thing a redirect rule is still for here: the French tree this site had for about an
   * hour on 2026-09-05, before its addresses stopped depending on the language they were read in.
   *
   * A short-lived scheme, but it was live and it was in a sitemap, so those URLs may have been
   * taken down or crawled — and left alone they would have reached 404.html, which reads an unknown
   * path as the NAME OF AN OBSERVATION and would have offered to play `fr/editeur`. Hardcoded
   * rather than derived, because the slugs it maps no longer exist anywhere in this source: this is
   * a record of what was, and it can be deleted once nothing follows it.
   */
  private readonly retiredFrenchPaths: ReadonlyArray<readonly [string, string]> = [
    ["/fr/", "/"],
    ["/fr/lecteur/", "/player/"],
    ["/fr/editeur/", "/editor/"],
    ["/fr/demos/", "/demos/"],
    ["/fr/documentation/", "/docs/"],
    ["/fr/faq/", "/faq/"],
    ["/fr/plan/", "/roadmap/"]
  ]

  private async writeNetlifyFiles(layout: Layout): Promise<void> {
    const retired = this.retiredFrenchPaths
      .map(([from, to]) => `${from.padEnd(20)} ${to.padEnd(10)} 301`)
      .join("\n")
    await writeFile(join(this.out, "_redirects"), `# Generated by site/build.ts — do not edit in dist-site/.

# NOT language negotiation: each page decides that itself, in its own head, and nothing here does.
# These are the addresses of the French tree this site briefly had, kept pointing at the pages that
# replaced them. A reader who saved one still lands where they meant to, and the language they get
# is settled on arrival like everyone else's.
${retired}
`, "utf8")

    await writeFile(join(this.out, "_headers"), `# Generated by site/build.ts — do not edit in dist-site/.

# The whole point of this site is that its components run on OTHER people's pages: a page elsewhere
# loads /lib/rr0-sighting.mjs cross-origin, and that module then fetches its own hashed assets
# (the star catalogue, the weather audio) from beside itself. Both need this header, and so do the
# demo recordings, which exist to be pointed at from anywhere.
/lib/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=604800

/demo-data/*
  Access-Control-Allow-Origin: *
`, "utf8")

    await writeFile(join(this.out, "robots.txt"),
      `User-agent: *\nAllow: /\nSitemap: ${Layout.ORIGIN}/sitemap.xml\n`, "utf8")

    await this.write404(layout)
  }

  /**
   * The only place the `ufoathome.org/<something>` convention still lives.
   *
   * Before this site existed the domain redirected to a single page of rr0.org, handing on whatever
   * path it was asked for as the observation to open — so links of that shape are already out
   * there. Reproducing that from a 404 page rather than from a redirect rule means it can never
   * shadow a real page of this site, whatever gets added later.
   *
   * It lands on the PLAYER, not the editor. Someone following a link of that shape was handed it to
   * SEE an account, not to change one — and the player says so on the page itself, so sending them
   * to the editor would have made the site contradict its own documentation.
   */
  private async write404(layout: Layout): Promise<void> {
    const player = layout.path(new PlayerPage().meta)
    await writeFile(join(this.out, "404.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found — UFO@home</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
<section class="band hero">
  <div class="wrap">
    <h1>Nothing here.</h1>
    <p class="lede" id="message">This page does not exist. <a href="/">Start from the home page</a>,
      or go straight to <a href="${player}">the player</a>.</p>
  </div>
</section>
</main>
<script type="module">
// ufoathome.org/<name> used to open that observation. Keep the promise those links made, without a
// redirect rule that would sit ahead of every future page of this site.
const path = decodeURIComponent(location.pathname.replace(/^\\/+|\\/+$/g, ""))
if (path && !path.includes("..")) {
  location.replace("${player}?sighting=" + encodeURIComponent(path))
}
</script>
</body>
</html>
`, "utf8")
  }

  private async writeSitemap(layout: Layout): Promise<void> {
    const urls = this.pages.map(page => {
      const alternates = SITE_LANGUAGES
        .map((language: SiteLanguage) =>
          `    <xhtml:link rel="alternate" hreflang="${language}" href="${Layout.ORIGIN}${layout.fileUrl(page.meta, language)}"/>`)
        .join("\n")
      return `  <url>\n    <loc>${Layout.ORIGIN}${layout.path(page.meta)}</loc>\n${alternates}\n  </url>`
    }).join("\n")
    await writeFile(join(this.out, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
      "utf8")
  }
}

await new SiteBuilder().build()
