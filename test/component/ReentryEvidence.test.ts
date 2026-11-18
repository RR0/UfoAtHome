import { describe, expect, it } from "vitest"
import { ReentryEvidence } from "../../src/modules/sky-events/reentries/ReentryEvidence.js"
import type { EvidenceArchives } from "../../src/modules/sky-events/reentries/ReentryEvidence.js"
import { ReentryParameters } from "../../src/modules/sky-events/reentries/ReentryParameters.js"
import { ReentrySighting } from "../../src/modules/sky-events/reentries/Reentry.js"
import type { ReentryJson } from "../../src/modules/sky-events/reentries/Reentry.js"
import type { FireballRecord } from "../../src/engine/astronomy/FireballArchive.js"
import type { ReentryCandidate } from "../../src/engine/astronomy/ReentryArchive.js"
import "../../src/modules/sky-events/reentries/types/reentryTypeSources.js"

// Near Paris, a winter night: the Sun far below the horizon.
const observer = { lat: 48.8, lng: 2.3, heightM: 0 }
const start = new Date("2023-01-15T22:00:00Z")

/** A fireball the witness saw where the network recorded one, 2 minutes later than it was. */
const recorded: FireballRecord = {
  id: "20230115_220200", t: start.getTime() + 2 * 60_000,
  from: [49.5, 3.0, 95], to: [49.6, 1.5, 60], durationS: 3, peakMagnitude: -6, peakHeightKm: 70, stations: 12
}

const stated = (overrides: Partial<ReentryJson> = {}): ReentryJson => {
  const from = ReentrySighting.seenFrom(observer, { lat: 49.5, lng: 3.0, heightM: 95_000 })
  const to = ReentrySighting.seenFrom(observer, { lat: 49.6, lng: 1.5, heightM: 60_000 })
  const reentry: ReentryJson = {
    id: "f", type: "fireball",
    track: [{ t: 0, lat: 0, lng: 0, altitudeKm: 95 }, { t: 1000, lat: 0, lng: 0, altitudeKm: 60 }],
    fragments: [{ absoluteMagnitude: -6 }],
    // The witness overestimates the heights and misjudges the heading by 20°.
    seen: { fromAzimuthDeg: from.azimuthDeg + 20, fromAltitudeDeg: from.altitudeDeg * 1.5, toAzimuthDeg: to.azimuthDeg + 20, toAltitudeDeg: to.altitudeDeg * 1.5, durationS: 4 },
    ...overrides
  }
  return { ...reentry, track: ReentryParameters.trackFromSeen(reentry, observer) ?? reentry.track }
}

const archives = (fireballs: FireballRecord[] | undefined, candidates: ReentryCandidate[] | undefined = []): EvidenceArchives => ({
  fireballs: { between: async (from: number, to: number) => fireballs?.filter(record => record.t >= from && record.t <= to) },
  reentries: { candidates: async () => candidates }
})

/** As many fireballs as a watched sky gives in a month, near here, on other nights. */
const month = Array.from({ length: 8 }, (_, i): FireballRecord => ({ ...recorded, id: `other-${i}`, t: Date.UTC(2023, 0, 2 + i, 2) }))

describe("a re-entry entered by hand, in the sources", () => {
  it("is known when a recorded fireball matches it within a witness's errors", async () => {
    const findings = await ReentryEvidence.check(stated(), start, observer, archives([recorded, ...month]))
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ verdict: "known", source: "gmn", match: { record: { id: recorded.id }, offsetMinutes: 2 } })
  })

  it("is not that one when its heading is off by more than a witness errs", async () => {
    const far = stated()
    far.seen = { ...far.seen, fromAzimuthDeg: far.seen!.fromAzimuthDeg! + 90, toAzimuthDeg: far.seen!.toAzimuthDeg! + 90 }
    const findings = await ReentryEvidence.check(far, start, observer, archives([recorded, ...month]))
    // Bright, at night, in a sky the network watches (nine fireballs that month, the other one among them): it should have been recorded.
    expect(findings).toEqual([{ verdict: "expectedAbsent", source: "gmn", absoluteMagnitude: -6, watchedCount: 9 }])
  })

  it("tells an absence that says nothing: a faint meteor, an unwatched sky, before the archive", async () => {
    expect(await ReentryEvidence.check(stated({ type: "meteor", fragments: [{ absoluteMagnitude: 1 }] }), start, observer, archives([...month])))
      .toEqual([{ verdict: "uninformative", source: "gmn", reason: "faint" }])
    expect(await ReentryEvidence.check(stated(), start, observer, archives([])))
      .toEqual([{ verdict: "uninformative", source: "gmn", reason: "unwatched" }])
    expect(await ReentryEvidence.check(stated(), new Date("1990-01-15T22:00:00Z"), observer, archives([])))
      .toEqual([{ verdict: "uninformative", source: "gmn", reason: "beforeArchive" }])
  })

  it("holds against something put in orbit that the catalogue has nothing of, and finds the object it names", async () => {
    const stage = stated({ type: "rocket-stage", object: { cosparId: "2023-001B" } })
    expect(await ReentryEvidence.check(stage, start, observer, archives([], []))).toEqual([{ verdict: "expectedAbsent", source: "catalogue" }])
    const candidate: ReentryCandidate = { record: { name: "CZ-2C R/B", cosparId: "2023-001B", type: "rocket", time: "2023-01-15", precision: "day", source: "satcat" }, timeMs: start.getTime() }
    expect(await ReentryEvidence.check(stage, start, observer, archives([], [candidate]))).toEqual([{ verdict: "known", source: "catalogue", candidate, by: "object" }])
    expect(await ReentryEvidence.check(stage, new Date("1950-01-01T22:00:00Z"), observer, archives([], []))).toEqual([{ verdict: "impossible", source: "catalogue" }])
  })

  it("says it could not be checked, rather than nothing, when a source cannot be reached", async () => {
    expect(await ReentryEvidence.check(stated(), start, observer, archives(undefined))).toEqual([{ verdict: "unchecked", source: "gmn", reason: "unreachable" }])
    expect(await ReentryEvidence.check(stated(), undefined, observer, archives([]))).toEqual([{ verdict: "unchecked", source: "none", reason: "noDateOrPlace" }])
  })
})
