import { afterEach, describe, expect, it, vi } from "vitest"
import { SightingFetch, SightingFetchError } from "../../src/engine/net/SightingFetch.js"

/**
 * The point of these is the diagnosis, not the happy path: a browser hands back one opaque
 * TypeError for every kind of cross-origin failure, and what this class does is narrow it.
 */
describe("SightingFetch", () => {

  const OWN = "http://localhost:3000"
  const OTHER = "https://elsewhere.example"

  const respond = (body: unknown, ok = true, status = 200): Response => ({
    ok, status, json: async () => body
  } as unknown as Response)

  afterEach(() => vi.unstubAllGlobals())

  /** Asserts the fetch failed and hands back the diagnosis — a `catch` alone would quietly pass a
   * test whose call unexpectedly succeeded. */
  const failure = async (url: string): Promise<SightingFetchError> => {
    try {
      await SightingFetch.json(url)
    } catch (error) {
      return error as SightingFetchError
    }
    throw new Error(`expected ${url} to fail`)
  }

  it("returns the recording when the fetch succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond({ version: 1 })))
    expect(await SightingFetch.json(`${OTHER}/s.json`)).toEqual({ version: 1 })
  })

  it("calls a cross-origin failure CORS when the server answers an opaque request", async () => {
    // The real signature of a refused origin: the readable request fails, the unreadable one does
    // not — so something is there, and the browser simply would not hand it over.
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.mode === "no-cors") return respond(undefined)
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", fetchMock)

    const error = await failure(`${OTHER}/s.json`)

    expect(error.kind).toBe("cors")
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({ mode: "no-cors" })
  })

  it("calls it unreachable when even the opaque request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))
    const error = await failure(`${OTHER}/s.json`)
    expect(error.kind).toBe("unreachable")
  })

  it("never blames CORS for a SAME-origin failure, whatever the probe would say", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.mode === "no-cors") return respond(undefined)
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", fetchMock)

    const error = await failure(`${OWN}/s.json`)

    expect(error.kind).toBe("unreachable")
    // And it does not waste a request finding that out.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reports a bad status as itself, since the server did answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(undefined, false, 404)))
    const error = await failure(`${OTHER}/missing.json`)
    expect(error.kind).toBe("status")
    expect(error.status).toBe(404)
  })

  it("reports a file that arrived but is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <") }
    } as unknown as Response)))
    const error = await failure(`${OTHER}/page.html`)
    expect(error.kind).toBe("malformed")
  })
})
