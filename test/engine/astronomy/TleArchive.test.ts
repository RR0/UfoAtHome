import { describe, expect, it } from "vitest"
import { TleArchive } from "../../../src/engine/astronomy/TleArchive.js"
import type { ElementSet } from "../../../src/engine/astronomy/TleArchive.js"

const DAY = 86_400_000
const BIN = 7 * DAY
const RECORD_BYTES = 44

function set(norad: number, epoch: string): ElementSet {
  return {
    norad, epochMs: Date.parse(epoch), bstar: 1e-4, inclinationDeg: 51.6, raanDeg: 48.5, eccentricity: 0.0007,
    argOfPerigeeDeg: 20.6, meanAnomalyDeg: 339.5, meanMotion: 15.4937
  }
}

/** The same layout scripts/build-tle-archive.ts writes. */
function encode(sets: ElementSet[]): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(sets.length * RECORD_BYTES))
  sets.forEach((s, i) => {
    const o = i * RECORD_BYTES
    view.setUint32(o, s.norad, true)
    view.setFloat64(o + 4, s.epochMs, true)
    ;[s.bstar, s.inclinationDeg, s.raanDeg, s.eccentricity, s.argOfPerigeeDeg, s.meanAnomalyDeg]
      .forEach((value, k) => view.setFloat32(o + 12 + 4 * k, value, true))
    view.setFloat64(o + 36, s.meanMotion, true)
  })
  return view.buffer
}

function binName(epoch: string): string {
  return new Date(Math.floor(Date.parse(epoch) / BIN) * BIN).toISOString().slice(0, 10)
}

/** An archive of one list with two objects, a hole of three weeks, and a satellite launched late. */
function archive(requests: string[] = []) {
  const sets = [
    set(25544, "2025-09-01T12:00:00Z"), set(25544, "2025-09-02T12:00:00Z"), set(25544, "2025-09-10T12:00:00Z"),
    set(20580, "2025-09-02T00:00:00Z"),
    set(99001, "2025-09-03T00:00:00Z"),
    set(25544, "2025-10-05T12:00:00Z")
  ]
  const bins = new Map<string, ElementSet[]>()
  for (const s of sets) {
    const name = binName(new Date(s.epochMs).toISOString())
    bins.get(name)?.push(s) ?? bins.set(name, [s])
  }
  const files: Record<string, unknown> = {
    "https://host/tle/index.json": {
      credit: "archive credit", source: "https://source/", binDays: 7, recordBytes: RECORD_BYTES,
      kinds: { visual: { from: "2025-09-01T00:00:00Z", to: "2025-10-06T00:00:00Z", bins: [...bins.keys()] } }
    },
    "https://host/tle/objects-visual.json": {
      25544: { name: "ISS (ZARYA)", launch: "1998-11-20", stdMag: -2.5 },
      20580: { name: "HST", launch: "1990-04-24", stdMag: 1.5 },
      99001: { name: "LATE", launch: "2025-09-05" }
    }
  }
  for (const [name, binSets] of bins) files[`https://host/tle/visual/${name}.bin`] = encode(binSets)
  const fetchImpl = (async (url: string) => {
    requests.push(url)
    const body = files[url]
    if (body === undefined) return new Response(null, { status: 404 })
    return body instanceof ArrayBuffer ? new Response(body) : new Response(JSON.stringify(body))
  }) as typeof fetch
  return new TleArchive({ fetchImpl, indexUrls: ["https://host/beside/index.json", "https://host/tle/index.json"] })
}

describe("TleArchive", () => {
  it("gives each object the element set nearest the instant, with its age", async () => {
    const snapshot = (await archive().at(new Date("2025-09-02T09:00:00Z")))!
    const iss = snapshot.objects.find(o => o.norad === 25544)!
    expect(new Date(iss.elements.epochMs).toISOString()).toBe("2025-09-02T12:00:00.000Z")
    expect(iss.ageDays).toBeCloseTo(0.125, 5)
    expect(iss).toMatchObject({ name: "ISS (ZARYA)", stdMag: -2.5, kind: "visual" })
    expect(iss.elements.inclinationDeg).toBeCloseTo(51.6, 4)
    expect(iss.elements.meanMotion).toBe(15.4937)
    expect(snapshot.coverage).toEqual([{ kind: "visual", status: "covered", from: "2025-09-01T00:00:00Z", to: "2025-10-06T00:00:00Z" }])
    expect(snapshot.credit).toBe("archive credit")
  })

  it("reaches into the neighbouring week for a set just across a bin boundary", async () => {
    // 2025-09-10 12:00 is in the bin after 2025-09-02's; an instant at the very start of that later
    // bin must still find the 09-10 set rather than stop at the edge.
    const start = new Date(Math.floor(Date.parse("2025-09-10T12:00:00Z") / BIN) * BIN)
    const snapshot = (await archive().at(new Date(start.getTime() + 3600_000)))!
    const iss = snapshot.objects.find(o => o.norad === 25544)!
    expect(iss.ageDays).toBeLessThan(TleArchive.MAX_ELEMENT_AGE_DAYS)
  })

  it("refuses to carry elements across a hole, and says it is one", async () => {
    // 2025-09-24 is twelve days from the nearest set on either side.
    const snapshot = (await archive().at(new Date("2025-09-24T00:00:00Z")))!
    expect(snapshot.objects).toEqual([])
    expect(snapshot.coverage[0].status).toBe("gap")
  })

  it("says a date outside the archive is outside it, not a gap", async () => {
    expect((await archive().at(new Date("2021-01-01T00:00:00Z")))!.coverage[0].status).toBe("before")
    expect((await archive().at(new Date("2027-01-01T00:00:00Z")))!.coverage[0].status).toBe("after")
    expect(await archive().covers(new Date("2021-01-01T00:00:00Z"))).toBe(false)
    expect(await archive().covers(new Date("2025-09-24T00:00:00Z"))).toBe(true)
  })

  it("does not put an object in orbit before its launch", async () => {
    const snapshot = (await archive().at(new Date("2025-09-03T00:00:00Z")))!
    expect(snapshot.objects.map(o => o.norad).sort()).toEqual([20580, 25544])
  })

  it("looks beside the page first, then falls back, and reads each file once", async () => {
    const requests: string[] = []
    const tle = archive(requests)
    await tle.at(new Date("2025-09-02T09:00:00Z"))
    await tle.at(new Date("2025-09-02T10:00:00Z"))
    expect(requests[0]).toBe("https://host/beside/index.json")
    expect(new Set(requests).size).toBe(requests.length)
  })

  it("answers undefined when no archive can be reached", async () => {
    const tle = new TleArchive({ fetchImpl: (async () => { throw new TypeError("offline") }) as typeof fetch, indexUrls: ["https://nowhere/index.json"] })
    expect(await tle.at(new Date())).toBeUndefined()
  })
})
