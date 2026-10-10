import { createHash } from "node:crypto"
import { readFile, readdir, stat } from "node:fs/promises"
import { join } from "node:path"

/**
 * What makes ufoathome.org installable and usable without a network: the web app manifest, the
 * service worker (site/assets/sw.js, filled in here) and the list of files it fetches on install.
 *
 * Kept out of build.ts so that the parts with a rule in them (which files an installation needs, what
 * identifies a build) can be tested without building the site.
 */
export class OfflineKit {

  /** Light and dark `--ground` of style.css: the colour of the window frame around the installed app. */
  static readonly THEME_LIGHT = "#f6f8fc"
  static readonly THEME_DARK = "#070a12"

  /** The `<head>` lines a page needs to be installable. */
  static readonly HEAD = `<link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="${OfflineKit.THEME_LIGHT}" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="${OfflineKit.THEME_DARK}" media="(prefers-color-scheme: dark)">`

  /** Registers the worker once the page has loaded, so that it never competes with the page itself. */
  static readonly REGISTER = `<script>
if ("serviceWorker" in navigator) {
  addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}) })
}
</script>`

  manifest(): string {
    return JSON.stringify({
      id: "/",
      name: "UFO@home",
      short_name: "UFO@home",
      description: "Replay what a witness saw, under the sky of that night.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: OfflineKit.THEME_DARK,
      theme_color: OfflineKit.THEME_DARK,
      icons: [
        {src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any"},
        {src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any"}
      ],
      shortcuts: [
        {name: "Player", url: "/play/", icons: [{src: "/icon-192.png", sizes: "192x192"}]},
        {name: "Editor", url: "/edit/", icons: [{src: "/icon-192.png", sizes: "192x192"}]}
      ]
    }, undefined, 2) + "\n"
  }

  /** Above this, a file the entry mentions is left to be kept when it is used (the moon's relief, the thunder). */
  static readonly MAX_PRECACHED_BYTES = 1024 * 1024

  /**
   * Every file `entry` can need, followed all the way down: its static imports, the chunks it loads
   * later, and the assets it names (the star catalogue, the messages of each language).
   *
   * Found by the NAMES of the built files rather than by parsing imports, because a first visit is
   * made before the worker exists: whatever the page loads then never goes through it, so a chunk
   * not fetched on install is simply missing the first time the network is gone. It over-includes (a
   * name can appear in a string that is never loaded), which costs a few kilobytes; leaving one out
   * costs a component that cannot start offline.
   */
  async closure(libDir: string, entry: string): Promise<string[]> {
    const sizes = new Map<string, number>()
    for (const file of await readdir(libDir)) {
      const info = await stat(join(libDir, file))
      if (info.isFile()) {
        sizes.set(file, info.size)
      }
    }
    const seen = new Set<string>()
    const visit = async (name: string): Promise<void> => {
      if (seen.has(name)) {
        return
      }
      seen.add(name)
      if (!/\.m?js$/.test(name)) {
        return
      }
      const source = await readFile(join(libDir, name), "utf8")
      for (const [other, size] of sizes) {
        if (other !== name && size <= OfflineKit.MAX_PRECACHED_BYTES && source.includes(other)) {
          await visit(other)
        }
      }
    }
    await visit(entry)
    return [...seen]
  }

  /**
   * An installation holds the shell and the player, nothing heavy: the home and the player pages in
   * every language, the styles, the icons and the player's component with everything it loads (see
   * `closure`). Recordings, models and tiles are kept as they are used (see sw.js), never up front: the
   * orbital elements alone weigh 114 MB.
   */
  precache(pageUrls: readonly string[], libFiles: readonly string[], version: string): string[] {
    return [
      ...pageUrls,
      "/style.css", "/manifest.webmanifest", "/offline.html",
      "/favicon.ico", "/icon-192.png", "/apple-touch-icon.png", "/logo.png", "/logo-96.png",
      ...libFiles.map(file => `/lib/${version}/${file}`)
    ]
  }

  /** Identifies a build by what it serves, so a new deployment gives the worker different bytes and
   * the browser installs it, and an unchanged one gives the same bytes and nothing happens. */
  buildId(contents: readonly (string | Buffer)[]): string {
    const hash = createHash("sha256")
    for (const content of contents) {
      hash.update(content)
    }
    return hash.digest("hex").substring(0, 16)
  }

  async worker(template: string, precache: readonly string[], build: string): Promise<string> {
    return template
      .replace("__PRECACHE__", JSON.stringify(precache, undefined, 2))
      .replace("__BUILD__", build)
  }

  /** The page shown for an address never opened while offline. Standalone: it must work from a cache
   * that holds nothing else, so its words are all in it and the language is read on the spot. */
  offlinePage(): string {
    const words = {
      en: ["You are offline", "This page was not saved on this device. Open the player or a page you have already visited.", "Player"],
      fr: ["Vous êtes hors ligne", "Cette page n'a pas été enregistrée sur cet appareil. Ouvrez le lecteur ou une page déjà consultée.", "Lecteur"],
      es: ["Sin conexión", "Esta página no se guardó en este dispositivo. Abre el reproductor o una página que ya hayas visitado.", "Reproductor"],
      it: ["Sei offline", "Questa pagina non è stata salvata su questo dispositivo. Apri il lettore o una pagina già visitata.", "Lettore"]
    }
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — UFO@home</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
<section class="band hero">
  <div class="wrap">
    <h1 id="title">${words.en[0]}</h1>
    <p class="lede"><span id="message">${words.en[1]}</span> <a id="player" href="/play/">${words.en[2]}</a></p>
  </div>
</section>
</main>
<script>
(function () {
  var words = ${JSON.stringify(words)}
  var preferences = navigator.languages || [navigator.language || "en"]
  for (var i = 0; i < preferences.length; i++) {
    var language = String(preferences[i]).toLowerCase().split("-")[0]
    if (words[language]) {
      document.documentElement.lang = language
      document.getElementById("title").textContent = words[language][0]
      document.getElementById("message").textContent = words[language][1]
      document.getElementById("player").textContent = words[language][2]
      break
    }
  }
})()
</script>
</body>
</html>
`
  }
}
