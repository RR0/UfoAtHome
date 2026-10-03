// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { AircraftReleaseFetch } from "../../scripts/AircraftReleaseFetch.js"

/** A GitHub that holds some releases, and fails on demand. */
class FakeGithub {
  readonly requests: { url: string; range?: string }[] = []
  /** Releases by tag; each part is a content. */
  readonly releases = new Map<string, Record<string, string>>()
  /** Number of the next downloads that break after sending half of the file. */
  breakNext = 0
  /** Status to answer to every call for a tag. */
  readonly failing = new Map<string, number>()
  /** Answer ranged requests with the whole file, as a server that ignores ranges. */
  ignoresRanges = false

  readonly fetch: typeof fetch = async (input, init) => {
    const url = String(input)
    const range = (init?.headers as Record<string, string> | undefined)?.Range
    this.requests.push({ url, range })
    const api = /\/releases\/tags\/(.+)$/.exec(url)
    if (api) {
      const status = this.failing.get(api[1])
      if (status) return new Response("", { status })
      const parts = this.releases.get(api[1])
      if (!parts) return new Response("", { status: 404 })
      return Response.json({ assets: Object.entries(parts).map(([name, content]) => ({ name, size: content.length })) })
    }
    const [, tag, name] = /\/download\/([^/]+)\/(.+)$/.exec(url)!
    const content = this.releases.get(tag)?.[name]
    if (content === undefined) return new Response("", { status: 404 })
    const from = range && !this.ignoresRanges ? Number(/bytes=(\d+)-/.exec(range)![1]) : 0
    const body = content.slice(from)
    if (this.breakNext > 0) {
      this.breakNext--
      const half = body.slice(0, Math.ceil(body.length / 2))
      return new Response(new ReadableStream({
        // The error comes a little after the half, so that it has been written when the connection resets.
        start(controller) {
          controller.enqueue(new TextEncoder().encode(half))
        },
        async pull(controller) {
          await new Promise(resolve => setTimeout(resolve, 20))
          controller.error(new Error("connection reset"))
        }
      }), { status: from > 0 ? 206 : 200 })
    }
    return new Response(body, { status: from > 0 && !this.ignoresRanges ? 206 : 200 })
  }
}

describe("AircraftReleaseFetch", () => {
  let dir: string
  let github: FakeGithub
  const prod = "v2025.12.30-planes-readsb-prod-0"
  const staging = "v2025.12.30-planes-readsb-staging-0"

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "aircraft-fetch-"))
    github = new FakeGithub()
  })
  // Retried: Windows keeps a deleted file listed for a moment, and Node 20's rmSync answers ENOTEMPTY at once
  // (CI, windows-latest, Node 20, from 2026-10-02), where Node 22 waits.
  afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }))

  const fetcher = (options: { instances?: string[]; retries?: number } = {}) =>
    new AircraftReleaseFetch({ dir, fetchImpl: github.fetch, wait: async () => {}, ...options })

  test("a release is named by its day and instance", () => {
    expect(AircraftReleaseFetch.tagOf("2025-12-30", "readsb-prod-0")).toBe(prod)
  })

  test("the first instance is used when it has the day, with its parts in order", async () => {
    github.releases.set(prod, { [`${prod}.tar.ab`]: "BBB", [`${prod}.tar.aa`]: "AAAA" })
    github.releases.set(staging, { [`${staging}.tar.aa`]: "other" })
    const result = await fetcher().fetchDay("2025-12-30")
    expect(AircraftReleaseFetch.isMissing(result)).toBe(false)
    if (AircraftReleaseFetch.isMissing(result)) return
    expect(result.instance).toBe("readsb-prod-0")
    expect(result.files.map(file => path.basename(file))).toEqual([`${prod}.tar.aa`, `${prod}.tar.ab`])
    expect(result.files.map(file => readFileSync(file, "utf8"))).toEqual(["AAAA", "BBB"])
    expect(github.requests.some(request => request.url.includes("staging"))).toBe(false)
  })

  test("a day the first instance lacks comes from the next", async () => {
    github.releases.set(staging, { [`${staging}.tar`]: "staged" })
    const result = await fetcher().fetchDay("2025-12-30")
    expect(result).toMatchObject({ day: "2025-12-30", instance: "readsb-staging-0" })
    expect(readFileSync((result as { files: string[] }).files[0], "utf8")).toBe("staged")
  })

  test("an instance that answers with an error is skipped, not fatal", async () => {
    github.failing.set(prod, 502)
    github.releases.set(staging, { [`${staging}.tar`]: "staged" })
    expect(await fetcher().fetchDay("2025-12-30")).toMatchObject({ instance: "readsb-staging-0" })
  })

  test("a day none can give is reported missing, with a reason per instance", async () => {
    const result = await fetcher().fetchDay("2025-12-30")
    expect(result).toEqual({ day: "2025-12-30", failures: ["readsb-prod-0: no release", "readsb-staging-0: no release"] })
    expect(AircraftReleaseFetch.isMissing(result)).toBe(true)
  })

  test("a download cut by the network is resumed where it stopped, not restarted", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123456789" })
    github.breakNext = 2
    const result = await fetcher().fetchDay("2025-12-30")
    expect(readFileSync((result as { files: string[] }).files[0], "utf8")).toBe("0123456789")
    const ranges = github.requests.filter(request => request.url.includes("/download/")).map(request => request.range)
    expect(ranges[0]).toBeUndefined()
    expect(ranges.slice(1).every(range => range !== undefined)).toBe(true)
  })

  test("a server that ignores ranges does not leave a file with a part twice", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123456789" })
    github.breakNext = 1
    github.ignoresRanges = true
    const result = await fetcher().fetchDay("2025-12-30")
    expect(readFileSync((result as { files: string[] }).files[0], "utf8")).toBe("0123456789")
  })

  test("a part already complete on disk is not downloaded again", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123456789" })
    mkdirSync(path.join(dir, "2025-12-30", "readsb-prod-0"), { recursive: true })
    writeFileSync(path.join(dir, "2025-12-30", "readsb-prod-0", `${prod}.tar`), "0123456789")
    await fetcher().fetchDay("2025-12-30")
    expect(github.requests.filter(request => request.url.includes("/download/"))).toHaveLength(0)
  })

  test("a download that keeps failing gives up on that instance and falls back to the next", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123456789" })
    github.releases.set(staging, { [`${staging}.tar`]: "0123456789" })
    github.breakNext = 3
    const result = await fetcher({ retries: 2 }).fetchDay("2025-12-30")
    expect(result).toMatchObject({ instance: "readsb-staging-0" })
    expect(readFileSync((result as { files: string[] }).files[0], "utf8")).toBe("0123456789")
  })

  test("when every instance keeps failing the day is missing, with each reason", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123456789" })
    github.releases.set(staging, { [`${staging}.tar`]: "0123456789" })
    github.breakNext = 1000
    const result = await fetcher({ retries: 1 }).fetchDay("2025-12-30")
    expect(AircraftReleaseFetch.isMissing(result)).toBe(true)
    expect((result as { failures: string[] }).failures.map(failure => failure.split(":")[0])).toEqual(["readsb-prod-0", "readsb-staging-0"])
  })

  test("a file longer than the release says is refused, not trusted", async () => {
    github.releases.set(prod, { [`${prod}.tar`]: "0123" })
    mkdirSync(path.join(dir, "2025-12-30", "readsb-prod-0"), { recursive: true })
    writeFileSync(path.join(dir, "2025-12-30", "readsb-prod-0", `${prod}.tar`), "0123456789")
    const result = await fetcher({ instances: ["readsb-prod-0"] }).fetchDay("2025-12-30")
    expect((result as { failures: string[] }).failures[0]).toMatch(/more than the 4 published/)
  })

  test("a day is written YYYY-MM-DD", async () => {
    await expect(fetcher().fetchDay("30/12/2025")).rejects.toThrow(/YYYY-MM-DD/)
  })
})
