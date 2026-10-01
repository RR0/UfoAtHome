import { describe, expect, test } from "vitest"
import { ReentryArchive } from "../../../src/engine/astronomy/ReentryArchive.js"
import type { ReentryRecord } from "../../../src/engine/astronomy/ReentryArchive.js"

const owensboro = { lat: 37.77, lng: -87.11 }
/** 3 March 1968, 21:45 EST, for 200 s. */
const start = Date.parse("1968-03-04T02:45:00Z")
const end = start + 200_000

const zond: ReentryRecord = { name: "SL-12 R/B", cosparId: "1968-013C", norad: 3136, type: "rocket", time: "1968-03-04", precision: "day", inclinationDeg: 51.54, source: "satcat" }

describe("ReentryArchive.match", () => {
  test("a decay day covering the observation is a candidate", () => {
    expect(ReentryArchive.match([zond], start, end, owensboro).map(c => c.record.cosparId)).toEqual(["1968-013C"])
  })

  test("a decay day two days off is not", () => {
    expect(ReentryArchive.match([{ ...zond, time: "1968-03-06" }], start, end, owensboro)).toEqual([])
  })

  test("an orbit that never comes within sight of this latitude is never a candidate", () => {
    // Inclined 20°: its track stays under 20° of latitude, and 37.8° is further than it can be seen from.
    expect(ReentryArchive.match([{ ...zond, inclinationDeg: 20 }], start, end, owensboro)).toEqual([])
  })

  test("a prediction counts when its window overlaps the observation", () => {
    const predicted: ReentryRecord = { name: "X", type: "rocket", time: "1968-03-04T05:00Z", precision: "hours", uncertaintyHours: 2, source: "cords" }
    expect(ReentryArchive.match([predicted], start, end, owensboro)).toHaveLength(1)
    expect(ReentryArchive.match([{ ...predicted, uncertaintyHours: 0.5 }], start, end, owensboro)).toEqual([])
  })

  test("a sighting on record counts near enough in time and place, with how far", () => {
    const seen: ReentryRecord = { name: "Y", type: "rocket", time: "1968-03-04T03:10Z", precision: "minute", seenFrom: "Lexington", seenLat: 38.04, seenLng: -84.5, source: "cords" }
    const [candidate] = ReentryArchive.match([seen], start, end, owensboro)
    expect(candidate.offsetMinutes).toBe(22)
    expect(candidate.seenKm).toBeGreaterThan(220)
    expect(candidate.seenKm).toBeLessThan(240)
    // Seen from Germany: not this sky.
    expect(ReentryArchive.match([{ ...seen, seenLat: 53.2, seenLng: 10.4 }], start, end, owensboro)).toEqual([])
    // Two hours off: not this observation.
    expect(ReentryArchive.match([{ ...seen, time: "1968-03-04T05:00Z" }], start, end, owensboro)).toEqual([])
  })

  test("the most precise come first", () => {
    const seen: ReentryRecord = { name: "Y", type: "rocket", time: "1968-03-04T02:46Z", precision: "minute", source: "cords" }
    const predicted: ReentryRecord = { name: "X", type: "rocket", time: "1968-03-04T03:00Z", precision: "hours", uncertaintyHours: 1, source: "cords" }
    expect(ReentryArchive.match([zond, predicted, seen], start, end, owensboro).map(c => c.record.name)).toEqual(["Y", "X", "SL-12 R/B"])
  })
})

describe("ReentryArchive.candidates", () => {
  test("fetches the index, then only the years around the observation", async () => {
    const asked: string[] = []
    const files: Record<string, unknown> = {
      "https://example.org/reentries/index.json": { credit: "test", years: ["1967", "1968", "1969"] },
      "https://example.org/reentries/1968.json": [zond]
    }
    const fetchImpl = (async (url: string) => {
      asked.push(url)
      return url in files ? new Response(JSON.stringify(files[url])) : new Response("", { status: 404 })
    }) as typeof fetch
    const archive = new ReentryArchive({ fetchImpl, indexUrls: ["https://example.org/reentries/index.json"] })
    const candidates = await archive.candidates(start, end, owensboro)
    expect(candidates?.map(c => c.record.norad)).toEqual([3136])
    expect(asked).toEqual(["https://example.org/reentries/index.json", "https://example.org/reentries/1968.json"])
  })

  test("says when the archive cannot be reached, rather than that nothing came down", async () => {
    const archive = new ReentryArchive({ fetchImpl: (async () => { throw new Error("offline") }) as typeof fetch, indexUrls: ["https://example.org/x.json"] })
    expect(await archive.candidates(start, end, owensboro)).toBeUndefined()
  })
})
