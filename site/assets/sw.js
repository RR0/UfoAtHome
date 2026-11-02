/*
 * ufoathome.org service worker. Generated into dist-site/sw.js by site/build.ts, which fills the two
 * placeholders below; this file is plain JavaScript because it runs as it is, in the browser.
 *
 * The rule it follows: ONLINE, NOTHING CHANGES. The network always answers first, so a reader gets
 * the page and the components of the deployed release, exactly as without a worker; the cache is only
 * what is served when the network cannot answer (no signal in a field, a train, lie-fi). That is the
 * lesson of the unversioned /lib/ entries a browser once kept for a week: a cache that answers before
 * the network can run last week's component on today's page. The one exception is a file whose name
 * carries a content hash (a chunk, the star catalogue): the same name is always the same bytes, so it
 * is served from the cache without asking.
 *
 * Only this site's own GET requests are handled. Cross-origin calls (weather, geocoding, imagery, the
 * aircraft archive) are left to the browser, and so are range requests (audio), which the Cache API
 * cannot answer correctly.
 *
 * Build: __BUILD__
 */
class UfoAtHomeWorker {

  /** Pages, scripts, styles: what the site itself is made of. */
  static CACHE = "ufoathome"

  /** Recordings, models, tiles, orbital elements: bigger, and capped. */
  static DATA_CACHE = "ufoathome-data"

  static PRECACHE = __PRECACHE__

  /** What to show offline for a page that was never opened. */
  static OFFLINE = "/offline.html"

  /**
   * What the installed app shows the moment it is opened, before the page it opens on: without it, a phone
   * shows a blank screen while that page arrives. Written here, its style inline, so that it needs nothing
   * from the network; it then goes on to the page, and the browser keeps it on screen until that page can
   * be drawn. It shows the logo (precached), on style.css's dark ground as the manifest's background.
   */
  static LAUNCH_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <title>UFO@home</title>
  <style>
    html { background: #070a12; color: #f0bc44 }
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem }
    img { width: min(50vw, 12rem); height: auto; border-radius: 22% }
    .spinner { width: 2rem; height: 2rem; border: 3px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: turn 1s linear infinite }
    @keyframes turn { to { transform: rotate(1turn) } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 4s } }
  </style>
</head>
<body>
<img alt="UFO@home" src="/logo.png">
<div aria-label="Loading" class="spinner" role="progressbar"></div>
<script>
  const url = new URL(location.href)
  url.searchParams.delete("source")
  location.replace(url.pathname + url.search + url.hash)
</script>
</body>
</html>`

  /** How long a cached copy waits for a slow network before it is served instead. */
  static PATIENCE_MS = 5000

  /** Files above this size are not kept: one tile or one catalogue is not worth the quota. */
  static MAX_DATA_BYTES = 3 * 1024 * 1024

  static MAX_DATA_ENTRIES = 150

  static MAX_KEPT_AT_ONCE = 300

  /** Releases whose /lib/<version>/ files are kept: the current one, and the one a tab left open
   * across a deploy may still be loading chunks from. */
  static KEPT_VERSIONS = 2

  static DATA_PREFIXES = ["/demo-data/", "/models/", "/tle/", "/roads/", "/water/", "/railways/", "/light-pollution/", "/reentries/", "/fireballs/", "/aircraft/"]

  /** Vite names a chunk `<name>-<8 hash characters>.<ext>`. The hash must hold a digit or a capital:
   * `rr0-sighting.mjs` has eight letters after its hyphen too, and is NOT immutable. */
  static HASHED = /-(?=[A-Za-z0-9_-]*[0-9A-Z_])[A-Za-z0-9_-]{8}(\.[A-Za-z0-9.]+)?$/

  static isImmutable(url) {
    if (!url.pathname.startsWith("/lib/")) {
      return false
    }
    const name = url.pathname.substring(url.pathname.lastIndexOf("/") + 1)
    return !/^rr0-.*\.mjs$/.test(name) && UfoAtHomeWorker.HASHED.test(name)
  }

  static isData(url) {
    return UfoAtHomeWorker.DATA_PREFIXES.some(prefix => url.pathname.startsWith(prefix))
  }

  /** The release a /lib/<version>/ path belongs to, or undefined for any other path. */
  static libVersion(pathname) {
    const match = /^\/lib\/(\d+)\.(\d+)\.(\d+)\//.exec(pathname)
    return match ? match.slice(1).map(Number) : undefined
  }

  static compareVersions(a, b) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  }

  /** A response worth keeping: complete, from here, and not the answer to a redirect (a redirected
   * response given back for a navigation is an error in every browser). */
  static storable(response) {
    return response.ok && response.status === 200 && response.type === "basic" && !response.redirected
  }

  async install() {
    const cache = await caches.open(UfoAtHomeWorker.CACHE)
    // Best effort and individually: one missing file must not keep the worker from installing.
    await Promise.allSettled(UfoAtHomeWorker.PRECACHE.map(async path => {
      const response = await fetch(new Request(new URL(path, self.location.origin).href, {cache: "reload"}))
      if (UfoAtHomeWorker.storable(response)) {
        await cache.put(path, response)
      }
    }))
  }

  async activate() {
    // The page request leaves while the worker is still starting, instead of waiting for it.
    if (self.registration?.navigationPreload) {
      await self.registration.navigationPreload.enable()
    }
    for (const name of await caches.keys()) {
      if (name.startsWith("ufoathome") && name !== UfoAtHomeWorker.CACHE && name !== UfoAtHomeWorker.DATA_CACHE) {
        await caches.delete(name)
      }
    }
    await this.pruneReleases()
  }

  /** Forgets the /lib/<version>/ files of every release but the latest few. */
  async pruneReleases() {
    const cache = await caches.open(UfoAtHomeWorker.CACHE)
    const requests = await cache.keys()
    const versions = new Map()
    for (const request of requests) {
      const version = UfoAtHomeWorker.libVersion(new URL(request.url).pathname)
      if (version) {
        versions.set(version.join("."), version)
      }
    }
    const kept = [...versions.values()]
      .sort((a, b) => UfoAtHomeWorker.compareVersions(b, a))
      .slice(0, UfoAtHomeWorker.KEPT_VERSIONS)
      .map(version => version.join("."))
    for (const request of requests) {
      const version = UfoAtHomeWorker.libVersion(new URL(request.url).pathname)
      if (version && !kept.includes(version.join("."))) {
        await cache.delete(request)
      }
    }
  }

  /** The response to a fetch event, or undefined to leave the request to the browser. */
  respond(event) {
    const request = event.request
    if (request.method !== "GET" || request.headers.has("range")) {
      return undefined
    }
    const url = new URL(request.url)
    if (url.origin !== self.location.origin || url.pathname === "/sw.js") {
      return undefined
    }
    if (request.mode === "navigate") {
      // The manifest's start and shortcut URLs carry source=pwa: the app is being opened.
      if (url.searchParams.get("source") === "pwa") {
        return Promise.resolve(new Response(UfoAtHomeWorker.LAUNCH_PAGE, {headers: {"Content-Type": "text/html; charset=utf-8"}}))
      }
      return this.navigation(event, url)
    }
    if (UfoAtHomeWorker.isImmutable(url)) {
      return this.cacheFirst(event, request, UfoAtHomeWorker.CACHE)
    }
    if (UfoAtHomeWorker.isData(url)) {
      return this.networkFirst(event, fetch(request), request, UfoAtHomeWorker.DATA_CACHE, true)
    }
    return this.networkFirst(event, fetch(request), request, UfoAtHomeWorker.CACHE, false)
  }

  /** A page is kept under its path alone: `/play/?file=…` is the same page whatever it is asked to play. */
  async navigation(event, url) {
    const key = new Request(url.origin + url.pathname)
    try {
      const source = Promise.resolve(event.preloadResponse).then(preloaded => preloaded ?? fetch(event.request))
      return await this.networkFirst(event, source, key, UfoAtHomeWorker.CACHE, false)
    } catch (offline) {
      const cache = await caches.open(UfoAtHomeWorker.CACHE)
      return (await cache.match(UfoAtHomeWorker.OFFLINE)) ?? Response.error()
    }
  }

  /**
   * Keeps what a page already loaded before this worker controlled it.
   *
   * A first visit is made without a worker, so nothing it fetched went through one: the page lists
   * its own resources and hands them over, and they are fetched again (from the browser's HTTP
   * cache, which has just filled) under the same rules as any other file.
   */
  async keep(urls, page) {
    const wanted = [...urls].slice(0, UfoAtHomeWorker.MAX_KEPT_AT_ONCE)
    for (const href of wanted) {
      const url = this.sameOrigin(href)
      if (!url || url.pathname === "/sw.js") {
        continue
      }
      const data = UfoAtHomeWorker.isData(url)
      const cache = await caches.open(data ? UfoAtHomeWorker.DATA_CACHE : UfoAtHomeWorker.CACHE)
      if (await cache.match(url.href)) {
        continue
      }
      try {
        const response = await fetch(url.href)
        if (UfoAtHomeWorker.storable(response) && await this.small(response, data)) {
          await cache.put(url.href, response)
          if (data) {
            await this.trim(cache)
          }
        }
      } catch (offline) {
        // Gone while it was being kept: nothing to do, it is only a head start.
      }
    }
    // The page itself, under the key a navigation to it will look for.
    const document = this.sameOrigin(page)
    if (document) {
      try {
        const response = await fetch(document.origin + document.pathname)
        if (UfoAtHomeWorker.storable(response)) {
          await (await caches.open(UfoAtHomeWorker.CACHE)).put(document.origin + document.pathname, response)
        }
      } catch (offline) {
        // As above.
      }
    }
  }

  sameOrigin(href) {
    if (!href) {
      return undefined
    }
    try {
      const url = new URL(href, self.location.origin)
      return url.origin === self.location.origin ? url : undefined
    } catch (invalid) {
      return undefined
    }
  }

  async cacheFirst(event, request, cacheName) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    return this.networkFirst(event, fetch(request), request, cacheName, false)
  }

  /**
   * The network's response is handed to the page as soon as its headers arrive, so that the page streams in
   * as it would without a worker; keeping a copy happens afterwards, off the page's path. Reading the cache
   * before the network answers, or keeping the copy before answering, held every response until it was
   * entirely downloaded and written, and queued the others behind it (rr0.org, whose worker this one shares
   * its design with, took 1 to 2 s per click for it).
   *
   * @param source The network response, already requested (a navigation preload, or a fetch).
   */
  networkFirst(event, source, key, cacheName, capped) {
    let copy
    const network = source.then(response => {
      copy = UfoAtHomeWorker.storable(response) ? response.clone() : undefined
      return response
    })
    event.waitUntil(network.then(() => copy && this.store(cacheName, key, copy, capped)).catch(() => undefined))
    const cached = async () => (await caches.open(cacheName)).match(key)
    const answer = network.then(
      async response => response.status >= 500 ? (await cached()) ?? response : response,
      async error => (await cached()) ?? Promise.reject(error)
    )
    const patience = new Promise(resolve => setTimeout(() => cached().then(found => found && resolve(found)), UfoAtHomeWorker.PATIENCE_MS))
    return Promise.race([answer, patience])
  }

  async store(cacheName, key, response, capped) {
    if (await this.small(response, capped)) {
      const cache = await caches.open(cacheName)
      await cache.put(key, response)
      if (capped) {
        await this.trim(cache)
      }
    }
  }

  /** A compressed answer carries no content-length, so its size is read off the body rather than assumed. */
  async small(response, capped) {
    if (!capped) {
      return true
    }
    const declared = response.headers.get("content-length")
    const size = declared !== null ? Number(declared) : (await response.clone().blob()).size
    return size <= UfoAtHomeWorker.MAX_DATA_BYTES
  }

  /** Oldest first: the cache lists its keys in insertion order. */
  async trim(cache) {
    const keys = await cache.keys()
    for (const key of keys.slice(0, Math.max(0, keys.length - UfoAtHomeWorker.MAX_DATA_ENTRIES))) {
      await cache.delete(key)
    }
  }
}

const worker = new UfoAtHomeWorker()
self.addEventListener("install", event => event.waitUntil(worker.install().then(() => self.skipWaiting())))
self.addEventListener("activate", event => event.waitUntil(worker.activate().then(() => self.clients.claim())))
self.addEventListener("message", event => {
  if (event.data && Array.isArray(event.data.keep)) {
    event.waitUntil(worker.keep(event.data.keep, event.data.page))
  }
})
self.addEventListener("fetch", event => {
  const response = worker.respond(event)
  if (response) {
    event.respondWith(response)
  }
})
