// @vitest-environment node
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OfflineKit } from "../../site/OfflineKit.js"

const ORIGIN = "https://ufoathome.org"

/** The part of the Cache API the worker uses, keyed by absolute URL like the real one. */
class FakeCache {
  readonly entries = new Map<string, Response>()

  private static keyOf(request: Request | string): string {
    return new URL(typeof request === "string" ? request : request.url, ORIGIN).href
  }

  async match(request: Request | string): Promise<Response | undefined> {
    return this.entries.get(FakeCache.keyOf(request))?.clone()
  }

  async put(request: Request | string, response: Response): Promise<void> {
    this.entries.set(FakeCache.keyOf(request), response)
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map(url => new Request(url))
  }

  async delete(request: Request | string): Promise<boolean> {
    return this.entries.delete(FakeCache.keyOf(request))
  }
}

/** A same-origin answer, as `fetch` gives one: a constructed Response says "default", not "basic". */
function basic(body: string, init: ResponseInit & { redirected?: boolean } = {}): Response {
  const response = new Response(body, init)
  Object.defineProperty(response, "type", {value: "basic"})
  Object.defineProperty(response, "redirected", {value: init.redirected ?? false})
  return response
}

/** Just enough of a request: `mode: "navigate"` cannot be set on a real Request outside a browser. */
function requestFor(url: string, init: { mode?: string, range?: boolean } = {}): Request {
  const headers = new Headers(init.range ? {range: "bytes=0-9"} : {})
  return {url: new URL(url, ORIGIN).href, method: "GET", headers, mode: init.mode ?? "cors"} as unknown as Request
}

interface Worker {
  respond(event: unknown): Promise<Response> | undefined
  install(): Promise<void>
  activate(): Promise<void>
  keep(urls: string[], page: string): Promise<void>
}

describe("sw.js", () => {

  let stores: Map<string, FakeCache>
  let fetched: string[]
  let network: (url: string) => Response | Promise<Response>
  let worker: Worker
  let UfoAtHomeWorker: { isImmutable(url: URL): boolean }

  beforeEach(async () => {
    stores = new Map()
    fetched = []
    network = () => basic("network")
    const caches = {
      open: async (name: string) => {
        if (!stores.has(name)) {
          stores.set(name, new FakeCache())
        }
        return stores.get(name)!
      },
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name)
    }
    const fakeFetch = async (request: Request | string) => {
      const url = new URL(typeof request === "string" ? request : request.url, ORIGIN).href
      fetched.push(url)
      return network(url)
    }
    const template = await readFile(join(process.cwd(), "site", "assets", "sw.js"), "utf8")
    const source = await new OfflineKit().worker(template, ["/play/", "/style.css"], "test-build")
    const scope = {location: {origin: ORIGIN}, addEventListener: () => undefined, clients: {claim: async () => undefined}, skipWaiting: async () => undefined}
    const load = new Function("self", "caches", "fetch", `${source}\nreturn {worker, UfoAtHomeWorker}`)
    const loaded = load(scope, caches, fakeFetch)
    worker = loaded.worker
    UfoAtHomeWorker = loaded.UfoAtHomeWorker
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const event = (request: Request) => ({request, waitUntil: () => undefined})
  const cacheNamed = async (name: string) => stores.get(name) ?? new FakeCache()

  it("leaves other people's servers to the browser", () => {
    expect(worker.respond(event(requestFor("https://api.open-meteo.com/v1/forecast")))).toBeUndefined()
  })

  it("leaves range requests alone, which the Cache API cannot answer", () => {
    expect(worker.respond(event(requestFor("/lib/0.1.0/thunder-DA48qs_v.wav", {range: true})))).toBeUndefined()
  })

  it("never handles its own file", () => {
    expect(worker.respond(event(requestFor("/sw.js")))).toBeUndefined()
  })

  it("answers from the network when there is one, whatever the cache holds", async () => {
    const cache = await cacheNamed("ufoathome")
    await cache.put("/docs/", basic("old"))
    stores.set("ufoathome", cache)
    network = () => basic("new")
    const response = await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    expect(await response.text()).toBe("new")
  })

  it("keeps what it served, and serves it back when the network is gone", async () => {
    network = () => basic("page")
    await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    network = () => Promise.reject(new TypeError("offline"))
    const response = await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    expect(await response.text()).toBe("page")
  })

  it("serves a page whatever query it was opened with", async () => {
    network = () => basic("player")
    await worker.respond(event(requestFor("/play/?file=Socorro", {mode: "navigate"})))!
    network = () => Promise.reject(new TypeError("offline"))
    const response = await worker.respond(event(requestFor("/play/?file=Valensole", {mode: "navigate"})))!
    expect(await response.text()).toBe("player")
  })

  it("shows the offline page for an address it has never seen", async () => {
    await (await (async () => {
      const cache = await cacheNamed("ufoathome")
      stores.set("ufoathome", cache)
      return cache
    })()).put("/offline.html", basic("offline"))
    network = () => Promise.reject(new TypeError("offline"))
    const response = await worker.respond(event(requestFor("/never/", {mode: "navigate"})))!
    expect(await response.text()).toBe("offline")
  })

  it("does not keep the answer to a redirect, nor an error", async () => {
    network = () => basic("moved", {redirected: true})
    await worker.respond(event(requestFor("/player/", {mode: "navigate"})))!
    network = () => basic("missing", {status: 404})
    await worker.respond(event(requestFor("/gone/", {mode: "navigate"})))!
    expect([...(await cacheNamed("ufoathome")).entries.keys()]).toEqual([])
  })

  it("serves a cached page rather than a server error", async () => {
    network = () => basic("page")
    await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    network = () => basic("boom", {status: 503})
    const response = await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    expect(await response.text()).toBe("page")
  })

  it("serves the cached copy when the network is too slow", async () => {
    network = () => basic("page")
    await worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    vi.useFakeTimers()
    network = () => new Promise<Response>(() => undefined)
    const answer = worker.respond(event(requestFor("/docs/", {mode: "navigate"})))!
    await vi.advanceTimersByTimeAsync(5001)
    expect(await (await answer).text()).toBe("page")
  })

  describe("files named by their content", () => {
    it("recognises a hashed chunk and not an entry module", () => {
      const immutable = (path: string) => UfoAtHomeWorker.isImmutable(new URL(path, ORIGIN))
      expect(immutable("/lib/0.103.0/AdsbLolArchiveProvider-2vNkvjL5.js")).toBe(true)
      expect(immutable("/lib/0.103.0/thunder-DA48qs_v.wav")).toBe(true)
      expect(immutable("/lib/0.103.0/lunar-relief.bin-ByThqxUn.gz")).toBe(true)
      // Eight letters after the hyphen, and still an entry: its name is the published API.
      expect(immutable("/lib/0.103.0/rr0-sighting.mjs")).toBe(false)
      expect(immutable("/lib/0.103.0/rr0-sighting-editor.mjs")).toBe(false)
      expect(immutable("/docs/index.html")).toBe(false)
    })

    it("is served without asking the network again", async () => {
      await worker.respond(event(requestFor("/lib/0.103.0/Chunk-2vNkvjL5.js")))!
      await worker.respond(event(requestFor("/lib/0.103.0/Chunk-2vNkvjL5.js")))!
      expect(fetched).toEqual([`${ORIGIN}/lib/0.103.0/Chunk-2vNkvjL5.js`])
    })
  })

  describe("data", () => {
    it("keeps a recording, and not a file too big to be worth the quota", async () => {
      network = () => basic("{}", {headers: {"content-length": "2"}})
      await worker.respond(event(requestFor("/demo-data/socorro.json")))!
      network = () => basic("huge", {headers: {"content-length": String(10 * 1024 * 1024)}})
      await worker.respond(event(requestFor("/tle/huge.json")))!
      expect([...(await cacheNamed("ufoathome-data")).entries.keys()]).toEqual([`${ORIGIN}/demo-data/socorro.json`])
    })

    it("measures a compressed answer, which declares no length, instead of trusting it", async () => {
      network = () => basic("x".repeat(3 * 1024 * 1024 + 1))
      await worker.respond(event(requestFor("/tle/big.json")))!
      network = () => basic("small")
      await worker.respond(event(requestFor("/tle/small.json")))!
      expect([...(await cacheNamed("ufoathome-data")).entries.keys()]).toEqual([`${ORIGIN}/tle/small.json`])
    })

    it("forgets the oldest files past the cap", async () => {
      network = () => basic("x", {headers: {"content-length": "1"}})
      for (let i = 0; i < 152; i++) {
        await worker.respond(event(requestFor(`/roads/${i}.json`)))!
      }
      const keys = [...(await cacheNamed("ufoathome-data")).entries.keys()]
      expect(keys).toHaveLength(150)
      expect(keys[0]).toBe(`${ORIGIN}/roads/2.json`)
    })
  })

  describe("releases", () => {
    it("keeps the files of the latest two and forgets the older ones", async () => {
      const cache = await cacheNamed("ufoathome")
      stores.set("ufoathome", cache)
      for (const version of ["0.99.0", "0.100.0", "0.101.0", "0.103.0"]) {
        await cache.put(`/lib/${version}/rr0-sighting.mjs`, basic(version))
      }
      await cache.put("/docs/", basic("page"))
      await worker.activate()
      expect([...cache.entries.keys()].sort()).toEqual([
        `${ORIGIN}/docs/`, `${ORIGIN}/lib/0.101.0/rr0-sighting.mjs`, `${ORIGIN}/lib/0.103.0/rr0-sighting.mjs`
      ])
    })

    it("drops the caches of an older design of itself", async () => {
      stores.set("ufoathome-v0", new FakeCache())
      await worker.activate()
      expect([...stores.keys()]).not.toContain("ufoathome-v0")
    })
  })

  describe("what a page loaded before it had a worker", () => {
    it("keeps the files and the page it hands over, and only this site's", async () => {
      network = () => basic("body", {headers: {"content-length": "4"}})
      await worker.keep([
        `${ORIGIN}/demo-data/socorro.json`, `${ORIGIN}/lib/0.103.0/Chunk-2vNkvjL5.js`,
        "https://api.open-meteo.com/v1/forecast", `${ORIGIN}/sw.js`
      ], `${ORIGIN}/?utm=1#top`)
      expect([...(await cacheNamed("ufoathome-data")).entries.keys()]).toEqual([`${ORIGIN}/demo-data/socorro.json`])
      expect([...(await cacheNamed("ufoathome")).entries.keys()].sort())
        .toEqual([`${ORIGIN}/`, `${ORIGIN}/lib/0.103.0/Chunk-2vNkvjL5.js`])
    })

    it("does not fetch again what it already holds", async () => {
      const cache = await cacheNamed("ufoathome")
      stores.set("ufoathome", cache)
      await cache.put("/style.css", basic("css"))
      await worker.keep([`${ORIGIN}/style.css`], `${ORIGIN}/docs/`)
      expect(fetched).toEqual([`${ORIGIN}/docs/`])
    })

    it("ignores an address that is not one", async () => {
      await worker.keep(["http://[bad"], "")
      expect(fetched).toEqual([])
    })

    it("then serves that page offline", async () => {
      network = () => basic("home")
      await worker.keep([], `${ORIGIN}/faq/`)
      network = () => Promise.reject(new TypeError("offline"))
      const response = await worker.respond(event(requestFor("/faq/", {mode: "navigate"})))!
      expect(await response.text()).toBe("home")
    })
  })

  it("installs what it was given, and survives a file that is missing", async () => {
    network = url => url.endsWith("/style.css") ? basic("", {status: 404}) : basic("page")
    await worker.install()
    expect([...(await cacheNamed("ufoathome")).entries.keys()]).toEqual([`${ORIGIN}/play/`])
  })
})
