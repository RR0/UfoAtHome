import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { AircraftArchiveBuild } from "../../scripts/AircraftArchiveBuild.js"
import { AircraftTile } from "../../src/engine/traffic/providers/AircraftTile.js"
import type { AircraftPosition } from "../../src/engine/traffic/providers/AircraftTile.js"
import { TarFixture } from "./TarFixture.js"

/** 2025-12-30 00:00:00 UTC, as an ADSB.lol trace's `timestamp`. */
const MIDNIGHT = Date.UTC(2025, 11, 30) / 1000
const HOUR = 3600

class Release {
  /** A trace file as the source writes it: gzip-compressed JSON, named .json. */
  static trace(hex: string, points: (number | string | null)[][], extra: Record<string, unknown> = {}): { name: string; content: Buffer } {
    const body = JSON.stringify({ icao: hex, timestamp: MIDNIGHT, trace: points, ...extra })
    return { name: `./traces/${hex.replace("~", "").slice(-2)}/trace_full_${hex}.json`, content: gzipSync(body) }
  }

  static tar(...traces: { name: string; content: Buffer }[]): Buffer {
    const tar = new TarFixture().file("./README.txt", "readme").directory("./traces/").file("./heatmap/00.bin.ttf", "x".repeat(5000))
    for (const trace of traces) tar.file(trace.name, trace.content)
    return tar.build()
  }
}

class Archive {
  constructor(readonly dir: string) {}

  json<T>(...segments: string[]): T {
    return JSON.parse(readFileSync(path.join(this.dir, ...segments), "utf8"))
  }

  /** One tile of one hour, by a ranged read of its pack, as a client would do. */
  tile(day: string, hour: string, key: string): AircraftPosition[] {
    const [offset, length] = this.json<Record<string, [number, number]>>(day, `${hour}.json`)[key]
    const pack = readFileSync(path.join(this.dir, day, `${hour}.pack`))
    return AircraftTile.decode(gunzipSync(pack.subarray(offset, offset + length)))
  }

  hours(day: string): string[] {
    return readdirSync(path.join(this.dir, day)).filter(name => name.endsWith(".pack")).map(name => name.slice(0, 2)).sort()
  }
}

describe("AircraftArchiveBuild", () => {
  let dir: string
  let archive: Archive
  let source: string

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "aircraft-archive-"))
    archive = new Archive(path.join(dir, "out"))
    source = path.join(dir, "release.tar")
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  async function build(tar: Buffer, step = 5, parts = 1): Promise<void> {
    const files = TarFixture.split(tar, Math.ceil(tar.length / parts)).map((part, i) => {
      const file = `${source}.${String.fromCharCode(97 + i)}`
      writeFileSync(file, part)
      return file
    })
    await new AircraftArchiveBuild(archive.dir, step).run(files)
  }

  test("a position lands in the tile and hour it was in, and reads back with its aircraft's description", async () => {
    await build(Release.tar(Release.trace("44046d", [
      [12 * HOUR + 279.6, 48.86682, 2.9877, 35000, 447.8, 218.4]
    ], { r: "OE-ICI", t: "A320" })))
    expect(archive.hours("2025-12-30")).toEqual(["12"])
    const [position] = archive.tile("2025-12-30", "12", "48_2")
    expect(position).toMatchObject({ icao: 0x44046d, nonIcao: false, secondsInHour: 279.6, lat: 48.86682, lng: 2.9877, altitudeFt: 35000, groundSpeedKt: 447.8, trackDeg: 218.4 })
    expect(archive.json<Record<string, string[]>>("2025-12-30", "aircraft", "44.json")["44046d"]).toEqual(["OE-ICI", "A320", "", 0])
  })

  test("what is on the ground, or has no altitude, is not in the sky", async () => {
    await build(Release.tar(Release.trace("aaaaaa", [
      [0, 10.5, 20.5, "ground", 12, 90],
      [10, 10.5, 20.5, null, 12, 90],
      [20, 10.5, 20.5, 5000, 120, 90]
    ])))
    expect(archive.tile("2025-12-30", "00", "10_20").map(position => position.altitudeFt)).toEqual([5000])
  })

  test("an aircraft is thinned to one position per step, the first of each kept", async () => {
    const points = [0, 2, 4.9, 5, 7, 9.9, 10, 12].map(seconds => [seconds, 10.5, 20.5, 3000, 100, 0])
    await build(Release.tar(Release.trace("bbbbbb", points)), 5)
    expect(archive.tile("2025-12-30", "00", "10_20").map(position => position.secondsInHour)).toEqual([0, 5, 10])
    await rmSync(archive.dir, { recursive: true })
    await build(Release.tar(Release.trace("bbbbbb", points)), 0)
    expect(archive.tile("2025-12-30", "00", "10_20")).toHaveLength(8)
  })

  test("an aircraft crossing a tile boundary, or an hour, is filed in each, in order", async () => {
    await build(Release.tar(Release.trace("cccccc", [
      [HOUR - 10, 47.99, 2.5, 30000, 400, 0],
      [HOUR - 5, 48.01, 2.5, 30000, 400, 0],
      [HOUR, 48.02, 2.5, 30000, 400, 0]
    ])))
    expect(archive.hours("2025-12-30")).toEqual(["00", "01"])
    expect(archive.tile("2025-12-30", "00", "47_2").map(position => position.lat)).toEqual([47.99])
    expect(archive.tile("2025-12-30", "00", "48_2").map(position => position.lat)).toEqual([48.01])
    expect(archive.tile("2025-12-30", "01", "48_2")[0].secondsInHour).toBe(0)
  })

  test("a position past the release's day is left to the next release", async () => {
    await build(Release.tar(Release.trace("dddddd", [[24 * HOUR - 10, 10.5, 20.5, 3000, 100, 0], [24 * HOUR + 30, 10.5, 20.5, 3000, 100, 0]])))
    expect(archive.hours("2025-12-30")).toEqual(["23"])
    expect(archive.json<{ days: string[] }>("index.json").days).toEqual(["2025-12-30"])
  })

  test("the days come out the same in whichever order their releases are ingested", async () => {
    const day = (timestamp: number, hex: string) => Release.trace(hex, [[10, 10.5, 20.5, 3000, 100, 0], [24 * HOUR + 5, 10.6, 20.5, 3000, 100, 0]], { timestamp })
    const first = Release.tar(day(MIDNIGHT, "111111"))
    const second = Release.tar(day(MIDNIGHT + 24 * HOUR, "222222"))
    const ingest = async (name: string, order: Buffer[]) => {
      const out = new Archive(path.join(dir, name))
      for (const tar of order) {
        const file = path.join(dir, `${name}.tar`)
        writeFileSync(file, tar)
        await new AircraftArchiveBuild(out.dir, 5).run([file])
      }
      return out
    }
    const forward = await ingest("forward", [first, second])
    const backward = await ingest("backward", [second, first])
    for (const day of ["2025-12-30", "2025-12-31"]) {
      expect(readFileSync(path.join(forward.dir, day, "00.pack"))).toEqual(readFileSync(path.join(backward.dir, day, "00.pack")))
    }
    expect(forward.tile("2025-12-31", "00", "10_20").map(position => position.icao)).toEqual([0x222222])
    expect(forward.json<{ days: string[] }>("index.json").days).toEqual(["2025-12-30", "2025-12-31"])
  })

  test("western and southern tiles are named by their floor, not their truncation", async () => {
    await build(Release.tar(Release.trace("eeeeee", [[0, -33.5, -70.5, 3000, 100, 0]])))
    expect(Object.keys(archive.json("2025-12-30", "00.json"))).toEqual(["-34_-71"])
  })

  test("a non-ICAO address is flagged, and described in a shard of its own", async () => {
    await build(Release.tar(Release.trace("~123abc", [[0, 10.5, 20.5, 3000, 100, 0]], { r: "", t: "" })))
    const [position] = archive.tile("2025-12-30", "00", "10_20")
    expect(position).toMatchObject({ icao: 0x123abc, nonIcao: true })
    expect(Object.keys(archive.json("2025-12-30", "aircraft", "non-icao.json"))).toEqual(["~123abc"])
  })

  test("what an aircraft states of itself, and what the database says of it, is kept in its shard", async () => {
    const detail = { category: "A7" }
    await build(Release.tar(Release.trace("c0ffee", [[0, 10.5, 20.5, 1500, 80, 0, 0, 0, detail]], { r: "F-HABC", t: "EC35", dbFlags: 1 })))
    expect(archive.json<Record<string, unknown[]>>("2025-12-30", "aircraft", "c0.json")["c0ffee"]).toEqual(["F-HABC", "EC35", "A7", 1])
  })

  test("what states no category, type or flag is kept as the absence of them", async () => {
    await build(Release.tar(Release.trace("c1ffee", [[0, 10.5, 20.5, 1500, 80, 0]])))
    expect(archive.json<Record<string, unknown[]>>("2025-12-30", "aircraft", "c1.json")["c1ffee"]).toEqual(["", "", "", 0])
  })

  test("an airport's service vehicle, which broadcasts as an aircraft would, is not in a record of the sky", async () => {
    const vehicle = Release.trace("a0ffee", [[0, 10.5, 20.5, 20, 5, 0, 0, 0, { category: "C2" }], [10, 10.5, 20.5, 20, 5, 0]], { t: "SERV" })
    const obstacle = Release.trace("a1ffee", [[0, 10.5, 20.5, 90, 0, 0, 0, 0, { category: "C3" }]])
    await build(Release.tar(vehicle, obstacle, Release.trace("a2ffee", [[0, 10.5, 20.5, 3000, 100, 0]])))
    expect(archive.tile("2025-12-30", "00", "10_20").map(position => position.icao)).toEqual([0xa2ffee])
    // Nor described: neither of the vehicles has a shard of its own.
    expect(Object.keys(archive.json("2025-12-30", "aircraft", "a2.json"))).toEqual(["a2ffee"])
    expect(existsSync(path.join(archive.dir, "2025-12-30", "aircraft", "a0.json"))).toBe(false)
    expect(existsSync(path.join(archive.dir, "2025-12-30", "aircraft", "a1.json"))).toBe(false)
  })

  test("an unknown speed or track stays unknown", async () => {
    await build(Release.tar(Release.trace("ffffff", [[0, 10.5, 20.5, 3000, null, null]])))
    const [position] = archive.tile("2025-12-30", "00", "10_20")
    expect(position.groundSpeedKt).toBeUndefined()
    expect(position.trackDeg).toBeUndefined()
  })

  test("a release cut in parts is read as one, whatever falls where", async () => {
    const tar = Release.tar(
      Release.trace("111111", [[0, 10.5, 20.5, 3000, 100, 0], [10, 10.6, 20.5, 3000, 100, 0]]),
      Release.trace("222222", [[5, 10.7, 20.5, 4000, 100, 0]])
    )
    await build(tar, 5, 7)
    expect(archive.tile("2025-12-30", "00", "10_20").map(position => position.icao)).toEqual([0x111111, 0x111111, 0x222222])
  })

  test("a second release adds its days to the index, without forgetting the first's", async () => {
    await build(Release.tar(Release.trace("111111", [[0, 10.5, 20.5, 3000, 100, 0]])))
    const next = Release.trace("222222", [[0, 10.5, 20.5, 3000, 100, 0]], { timestamp: MIDNIGHT + 2 * 24 * HOUR })
    await build(Release.tar(next))
    expect(archive.json<{ days: string[]; from: string; to: string }>("index.json")).toMatchObject({
      days: ["2025-12-30", "2026-01-01"], from: "2025-12-30", to: "2026-01-01"
    })
  })

  test("something that is not a history release is refused", async () => {
    await expect(build(new TarFixture().file("./README.txt", "not a release").build())).rejects.toThrow(/No aircraft trace/)
  })
})
