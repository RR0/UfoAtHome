import { describe, expect, test } from "vitest"
import { FireballArchive } from "../../../src/engine/astronomy/FireballArchive.js"
import type { FireballRecord } from "../../../src/engine/astronomy/FireballArchive.js"
import { ReentrySighting } from "../../../src/engine/interpretation/Reentry.js"

/** The Scottish fireball of 27 December 2025, as the archive holds it. */
const scottish: FireballRecord = {
  id: "20251227031631_xiL2Z", t: Date.parse("2025-12-27T03:16:31.844Z"),
  from: [55.126, -2.8551, 99.8], to: [54.7187, -3.9938, 39], durationS: 2.78, peakMagnitude: -7.45, peakHeightKm: 50.4, stations: 13
}
const edinburgh = { lat: 55.953, lng: -3.189, heightM: 50 }

describe("FireballArchive", () => {
  test("nothing is asked before the archive begins", () => {
    expect(FireballArchive.mayCover(Date.parse("1968-03-04T02:45Z"))).toBe(false)
    expect(FireballArchive.mayCover(Date.parse("2018-12-10T01:00Z"))).toBe(true)
  })

  test("a fireball is seen at its peak, as bright as its distance makes it", () => {
    const seen = FireballArchive.seenFrom(scottish, edinburgh)!
    expect(seen.peak.azimuthDeg).toBeGreaterThan(190)
    expect(seen.peak.azimuthDeg).toBeLessThan(205)
    expect(seen.peak.altitudeDeg).toBeGreaterThan(15)
    expect(seen.peak.altitudeDeg).toBeLessThan(25)
    expect(seen.magnitude).toBeCloseTo(-7.45 + 5 * Math.log10(seen.peak.distanceKm / 100), 6)
  })

  test("one under the horizon is not seen", () => {
    expect(FireballArchive.seenFrom(scottish, { lat: 45, lng: 5, heightM: 0 })).toBeUndefined()
  })

  test("drawn as a one-piece re-entry along its path, at its own instant of the recording", () => {
    const start = Date.parse("2025-12-27T03:16:00Z")
    const reentry = FireballArchive.asReentry(scottish, start)
    expect(reentry.track[0].t).toBe(31844)
    expect(reentry.track[1].t).toBe(31844 + 2780)
    expect(ReentrySighting.viewsAt([reentry], 31000, edinburgh)).toEqual([])
    const [view] = ReentrySighting.viewsAt([reentry], 33000, edinburgh)
    expect(view.magnitude).toBeLessThan(-6)
    expect(ReentrySighting.viewsAt([reentry], 35000, edinburgh)).toEqual([])
  })

  test("fetches only the month asked for, and keeps the fireballs inside the span", async () => {
    const asked: string[] = []
    const later = { ...scottish, id: "later", t: scottish.t + 3_600_000 }
    const files: Record<string, unknown> = {
      "https://example.org/fireballs/index.json": { credit: "test", from: "2018-12", to: "2026-09", months: ["2025-11", "2025-12"] },
      "https://example.org/fireballs/2025-12.json": [scottish, later]
    }
    const fetchImpl = (async (url: string) => {
      asked.push(url)
      return url in files ? new Response(JSON.stringify(files[url])) : new Response("", { status: 404 })
    }) as typeof fetch
    const archive = new FireballArchive({ fetchImpl, indexUrls: ["https://example.org/fireballs/index.json"] })
    const start = Date.parse("2025-12-27T03:16:00Z")
    expect((await archive.between(start, start + 60_000))?.map(record => record.id)).toEqual([scottish.id])
    expect(asked).toEqual(["https://example.org/fireballs/index.json", "https://example.org/fireballs/2025-12.json"])
    expect(await archive.between(Date.parse("1990-01-01Z"), Date.parse("1990-01-02Z"))).toBeUndefined()
  })
})
