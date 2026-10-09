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

  /** How long a cached copy waits for a slow network before it is served instead. */
  static PATIENCE_MS = 5000

  /** Files above this size are not kept: one tile or one catalogue is not worth the quota. */
  static MAX_DATA_BYTES = 3 * 1024 * 1024

  static MAX_DATA_ENTRIES = 150

  /** Releases whose /lib/<version>/ files are kept: the current one, and the one a tab left open
   * across a deploy may still be loading chunks from. */
  static KEPT_VERSIONS = 2

  static DATA_PREFIXES = ["/demo-data/", "/models/", "/tle/", "/roads/", "/light-pollution/", "/reentries/", "/fireballs/", "/aircraft/"]

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
      return this.navigation(event, url)
    }
    if (UfoAtHomeWorker.isImmutable(url)) {
      return this.cacheFirst(request, UfoAtHomeWorker.CACHE)
    }
    if (UfoAtHomeWorker.isData(url)) {
      return this.networkFirst(event, request, request, UfoAtHomeWorker.DATA_CACHE, true)
    }
    return this.networkFirst(event, request, request, UfoAtHomeWorker.CACHE, false)
  }

  /** A page is kept under its path alone: `/play/?file=…` is the same page whatever it is asked to play. */
  async navigation(event, url) {
    const key = new Request(url.origin + url.pathname)
    try {
      return await this.networkFirst(event, event.request, key, UfoAtHomeWorker.CACHE, false)
    } catch (offline) {
      const cache = await caches.open(UfoAtHomeWorker.CACHE)
      return (await cache.match(UfoAtHomeWorker.OFFLINE)) ?? Response.error()
    }
  }

  async cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    const response = await fetch(request)
    if (UfoAtHomeWorker.storable(response)) {
      await cache.put(request, response.clone())
    }
    return response
  }

  async networkFirst(event, request, key, cacheName, capped) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(key)
    const network = fetch(request).then(async response => {
      if (UfoAtHomeWorker.storable(response) && this.small(response, capped)) {
        await cache.put(key, response.clone())
        if (capped) {
          await this.trim(cache)
        }
      }
      return response
    })
    if (!cached) {
      return network
    }
    event.waitUntil(network.catch(() => undefined))
    const patience = new Promise(resolve => setTimeout(() => resolve(cached), UfoAtHomeWorker.PATIENCE_MS))
    const answer = network.then(response => response.status >= 500 ? cached : response, () => cached)
    return Promise.race([answer, patience])
  }

  small(response, capped) {
    return !capped || Number(response.headers.get("content-length") ?? 0) <= UfoAtHomeWorker.MAX_DATA_BYTES
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
self.addEventListener("fetch", event => {
  const response = worker.respond(event)
  if (response) {
    event.respondWith(response)
  }
})
