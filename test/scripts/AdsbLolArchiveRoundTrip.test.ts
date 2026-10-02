// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { AircraftArchiveBuild } from "../../scripts/AircraftArchiveBuild.js"
import { AdsbLolArchiveProvider } from "../../src/engine/traffic/providers/AdsbLolArchiveProvider.js"
import type { AircraftTraffic } from "../../src/engine/traffic/AircraftProvider.js"
import { TarFixture } from "./TarFixture.js"

const MIDNIGHT = Date.UTC(2025, 11, 30) / 1000
const NOON_MS = (MIDNIGHT + 12 * 3600) * 1000
const BASE = "https://archive.test/aircraft/"
const paris = { lat: 48.85, lng: 2.35, heightM: 35 }

class Release {
  static trace(hex: string, points: (number | string | null)[][], extra: Record<string, unknown> = {}) {
    return { name: `./traces/${hex.slice(-2)}/trace_full_${hex}.json`, content: gzipSync(JSON.stringify({ icao: hex, timestamp: MIDNIGHT, trace: points, ...extra })) }
  }
}

/** The archive's files served as a static host does, ranges included, and failing on demand. */
class FakeHost {
  readonly requests: { path: string; range?: string }[] = []
  ignoresRanges = false
  /** Number of the next pack requests answered 500. */
  failPacks = 0
  unreachable = false
  /** Hosts that do not answer, by URL prefix. */
  readonly down = new Set<string>()

  constructor(private readonly root: string) {}

  readonly fetch: typeof fetch = async (input, init) => {
    const url = String(input)
    if (this.unreachable || [...this.down].some(prefix => url.startsWith(prefix))) throw new TypeError("fetch failed")
    const relative = url.slice(BASE.length)
    const range = (init?.headers as Record<string, string> | undefined)?.Range
    this.requests.push({ path: relative, range })
    const file = path.join(this.root, relative)
    if (!existsSync(file) || !statSync(file).isFile()) return new Response("", { status: 404 })
    const content = readFileSync(file)
    if (relative.endsWith(".pack") && this.failPacks > 0) {
      this.failPacks--
      return new Response("", { status: 500 })
    }
    if (range && !this.ignoresRanges) {
      const [, from, to] = /bytes=(\d+)-(\d+)/.exec(range)!
      return new Response(content.subarray(Number(from), Number(to) + 1), { status: 206 })
    }
    return new Response(content, { status: 200 })
  }
}

describe("AdsbLolArchiveProvider reading what build-aircraft-archive.ts writes", () => {
  let dir: string
  let host: FakeHost
  const hhmmss = (h: number, m: number, s: number) => h * 3600 + m * 60 + s

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "aircraft-provider-"))
    const tar = new TarFixture().file("./README.txt", "x")
    // Near Paris, flying east, then three aircraft that test the radius, the tile boundary and the hour.
    tar.file(...Object.values(Release.trace("aaaaaa", [0, 5, 10, 15, 20, 25, 30].map(s => [hhmmss(12, 0, s), 48.9, 2.0 + s / 300, 35000, 450, 90]), { r: "F-GAAA", t: "A320" })) as [string, Buffer])
    tar.file(...Object.values(Release.trace("bbbbbb", [[hhmmss(12, 0, 10), 49.5, 2.4, 20000, 300, 180], [hhmmss(12, 0, 20), 49.49, 2.4, 19000, 300, 180]])) as [string, Buffer])
    tar.file(...Object.values(Release.trace("cccccc", [[hhmmss(12, 0, 10), 51.6, 2.4, 30000, 400, 180]])) as [string, Buffer])
    tar.file(...Object.values(Release.trace("dddddd", [[hhmmss(12, 59, 50), 48.9, 2.3, 10000, 250, 0], [hhmmss(13, 0, 10), 48.91, 2.3, 10500, 250, 0]])) as [string, Buffer])
    writeFileSync(path.join(dir, "release.tar"), tar.build())
    await new AircraftArchiveBuild(path.join(dir, "out"), 5).run([path.join(dir, "release.tar")])
    host = new FakeHost(path.join(dir, "out"))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const provider = (options: { indexUrls?: string[] } = {}) => new AdsbLolArchiveProvider({ fetchImpl: host.fetch, indexUrls: [`${BASE}index.json`], ...options })
  const tracks = (traffic: AircraftTraffic) => {
    expect(traffic.status).toBe("found")
    return traffic.status === "found" ? traffic.tracks : []
  }
  const hex = (track: { icao: number }) => track.icao.toString(16)

  test("the aircraft within the radius are returned with their positions, those beyond are not", async () => {
    const found = tracks(await provider().between(paris, NOON_MS, NOON_MS + 60_000))
    expect(found.map(hex)).toEqual(["aaaaaa", "bbbbbb"])
    const [a] = found
    expect(a.points).toHaveLength(7)
    expect(a.points[0]).toMatchObject({ t: NOON_MS, lat: 48.9, altitudeFt: 35000, groundSpeedKt: 450, trackDeg: 90 })
    expect(a.points.map(point => point.t)).toEqual([...a.points.map(point => point.t)].sort((x, y) => x - y))
  })

  test("a narrower radius leaves out the farther one", async () => {
    expect((tracks(await provider().between(paris, NOON_MS, NOON_MS + 60_000, 50))).map(hex)).toEqual(["aaaaaa"])
  })

  test("only the positions of the window are kept", async () => {
    const [a] = tracks(await provider().between(paris, NOON_MS + 10_000, NOON_MS + 20_000))
    expect(a.points.map(point => point.t - NOON_MS)).toEqual([10_000, 15_000, 20_000])
  })

  test("an aircraft seen across an hour boundary is one track", async () => {
    const found = tracks(await provider().between(paris, NOON_MS + 59 * 60_000, NOON_MS + 61 * 60_000))
    const d = found.find(track => hex(track) === "dddddd")!
    expect(d.points).toHaveLength(2)
    expect(d.points[1].t - d.points[0].t).toBe(20_000)
  })

  test("a tile is one ranged read of the pack, and only the tiles that hold aircraft are read", async () => {
    await provider().between(paris, NOON_MS, NOON_MS + 60_000)
    const packs = host.requests.filter(request => request.path.endsWith(".pack"))
    expect(packs.length).toBeGreaterThan(0)
    expect(packs.every(request => request.range?.startsWith("bytes="))).toBe(true)
    // Tiles 48_2 and 49_2 hold aircraft; 51_2 (beyond the radius) is never asked for.
    expect(packs).toHaveLength(2)
  })

  test("what was fetched is not fetched again", async () => {
    const source = provider()
    await source.between(paris, NOON_MS, NOON_MS + 60_000)
    const before = host.requests.length
    await source.between(paris, NOON_MS + 10_000, NOON_MS + 30_000)
    expect(host.requests.length).toBe(before)
  })

  test("a host that ignores ranges gives the same answer", async () => {
    host.ignoresRanges = true
    expect(tracks(await provider().between(paris, NOON_MS, NOON_MS + 60_000)).map(hex)).toEqual(["aaaaaa", "bbbbbb"])
  })

  test("a covered hour with nothing near is found empty, which is not outside", async () => {
    expect(await provider().between({ lat: -33, lng: 151, heightM: 0 }, NOON_MS, NOON_MS + 60_000)).toEqual({ status: "found", tracks: [] })
  })

  test("a day the archive does not hold is outside, as is a window half held", async () => {
    const day = 24 * 3600_000
    expect(await provider().between(paris, NOON_MS + 5 * day, NOON_MS + 5 * day + 60_000)).toEqual({ status: "outside" })
    expect(await provider().between(paris, NOON_MS, NOON_MS + 14 * 3600_000)).toEqual({ status: "outside" })
  })

  test("an archive that cannot be reached is failed, not outside", async () => {
    host.unreachable = true
    expect(await provider().between(paris, NOON_MS, NOON_MS + 60_000)).toEqual({ status: "failed" })
  })

  test("the next index is tried when the first does not answer", async () => {
    host.down.add("https://down.test/")
    const source = provider({ indexUrls: ["https://down.test/aircraft/index.json", `${BASE}index.json`] })
    expect(tracks(await source.between(paris, NOON_MS, NOON_MS + 60_000))).toHaveLength(2)
  })

  test("a failure is not remembered: the next ask reads the pack again", async () => {
    host.failPacks = 10
    const source = provider()
    expect(await source.between(paris, NOON_MS, NOON_MS + 60_000)).toEqual({ status: "failed" })
    host.failPacks = 0
    expect(tracks(await source.between(paris, NOON_MS, NOON_MS + 60_000))).toHaveLength(2)
  })

  test("an aircraft is described by the registration and type of its day", async () => {
    const source = provider()
    const [a, b] = tracks(await source.between(paris, NOON_MS, NOON_MS + 60_000))
    expect(await source.describe(a, "2025-12-30")).toEqual({ registration: "F-GAAA", type: "A320" })
    expect((await source.describe(b, "2025-12-30"))).toEqual(undefined)
    expect(await source.describe(a, "2025-01-01")).toBeUndefined()
  })

  test("it states where the positions come from, and under what licence", () => {
    expect(provider().citation).toMatch(/adsb\.lol/)
    expect(provider().citation).toMatch(/Open Database License/)
  })
})
