import { describe, expect, it } from "vitest"
import { BestCaseSearch } from "../../../src/engine/interpretation/BestCaseSearch.js"
import { ReadingCheck } from "../../../src/engine/interpretation/ReadingCheck.js"
import { readingCheckTexts_en } from "../../../src/engine/interpretation/messages/ReadingCheckTexts_en.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"
import concorde from "../../../public/demo-data/observer-concorde-1976.json"

/** An account whose phenomenon is where `at` says at each of ten instants, filmed by a camera looking north, level. */
const accountOf = (at: (i: number) => { azimuthDeg: number, altitudeDeg: number }) => ({
  version: 4, time: "1976-06-15T16:00:00", instrument: "cine-35mm-broadcast",
  place: { locations: [{ lat: 51, lng: -1.5 }] },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 51, lng: -1.5, elevationM: 3000, headingDeg: 0, pitchDeg: 0, rollDeg: 0, fovDeg: 20 } }] },
  timeline: {
    keyframes: Array.from({ length: 10 }, (_, i) => ({ t: i * 100, shapes: [{ sourceId: "orb", shape: { kind: "oval", aim: at(i), angular: { widthDeg: 0.4, heightDeg: 0.4 } } }] })),
    order: ["orb"], groups: []
  }
}) as unknown as SightingRecordingJson
const readingOf = (account: SightingRecordingJson, kind: string) =>
  ({ ...account, interpretation: { bodies: [], mechanism: { kind, explains: "orb" } } }) as unknown as SightingRecordingJson
const search = new BestCaseSearch(readingCheckTexts_en)

describe("BestCaseSearch", () => {
  it("finds a phenomenon that stands still in the frame where it stands, and holds it there", () => {
    const account = accountOf(() => ({ azimuthDeg: 3, altitudeDeg: 2 }))
    const [finding] = search.findingsOf(account, readingOf(account, "fixed-in-frame"))
    expect(finding).toMatchObject({ outcome: "holds", against: "established", path: "interpretation.mechanism" })
    expect(finding.text).toContain("0.00° from it at the median")
  })

  it("leaves one that crosses the frame as far from a still point as half its way", () => {
    const account = accountOf(i => ({ azimuthDeg: 0, altitudeDeg: 8 - i }))
    const [finding] = search.findingsOf(account, readingOf(account, "fixed-in-frame"))
    expect(finding.outcome).toBe("fails")
    expect(finding.text).toMatch(/stays 2\.\d° from it at the median, 4\.\d° at most, for a phenomenon of 0\.40° that travels 9\.0°/)
  })

  it("drives one way what goes one way, and not what comes back", () => {
    const down = accountOf(i => ({ azimuthDeg: 0, altitudeDeg: 5 - i }))
    expect(search.findingsOf(down, readingOf(down, "driven-one-way"))[0]).toMatchObject({ outcome: "holds" })
    expect(search.findingsOf(down, readingOf(down, "driven-one-way"))[0].text).toContain("towards 180° from the top of the frame")
    const back = accountOf(i => ({ azimuthDeg: 0, altitudeDeg: Math.abs(i - 5) - 2 }))
    expect(search.findingsOf(back, readingOf(back, "driven-one-way"))[0].outcome).toBe("fails")
  })

  it("never lets values go back, staying nearest them", () => {
    expect(BestCaseSearch.neverBack([1, 3, 2, 4])).toEqual([1, 2.5, 2.5, 4])
    expect(BestCaseSearch.neverBack([3, 2, 1])).toEqual([2, 2, 2])
  })

  it("says so when no Sun the account allows is in the lens's reach", () => {
    // Lit from straight behind and high: the Sun is never within reach of a lens looking level ahead.
    const account = { ...accountOf(() => ({ azimuthDeg: 0, altitudeDeg: 0 })), lighting: { sunFromViewDeg: { fromDeg: 170, toDeg: 190 }, sunAltitudeDeg: { minDeg: 40, maxDeg: 90 } } }
    const findings = search.findingsOf(account, readingOf(account, "lens-ghost"))
    expect(findings[0]).toMatchObject({ outcome: "fails", text: readingCheckTexts_en.bestNoGhost })
    // And what it would need, leaving the light aside.
    expect(findings[1]).toMatchObject({ outcome: "fails", path: "lighting" })
  })

  it("is part of what the check of a reading finds, once for a reading as it is", () => {
    const account = accountOf(() => ({ azimuthDeg: 3, altitudeDeg: 2 }))
    const reading = readingOf(account, "fixed-in-frame")
    const check = new ReadingCheck(readingCheckTexts_en)
    const first = check.findingsOf(account, reading)
    expect(first.some(finding => finding.path === "interpretation.mechanism")).toBe(true)
    expect(check.findingsOf(account, reading).find(finding => finding.path === "interpretation.mechanism"))
      .toBe(first.find(finding => finding.path === "interpretation.mechanism"))
  })

  it("finds, for the Concorde's orb, how near each thing on the film the readings name can come to it", () => {
    const account = concorde as unknown as SightingRecordingJson
    const of = (kind: string) => search.findingsOf(account, { ...readingOf(account, kind), lens: { reachDeg: 90 } } as SightingRecordingJson)
    // A speck: 2.2° from the orb at the median, for an orb of 0.35° that travels 13.9°.
    expect(of("fixed-in-frame")[0].text).toMatch(/stays 2\.2° from it at the median, .* for a phenomenon of 0\.35° that travels 13\.9°/)
    // A drop: driven down, it cannot follow the orb back up.
    expect(of("driven-one-way")[0]).toMatchObject({ outcome: "fails" })
    // A ghost of the lens, in daylight: tens of degrees off; only a Sun on the horizon ahead would bring one near.
    const ghost = of("lens-ghost")
    expect(ghost.map(finding => finding.outcome)).toEqual(["fails", "fails"])
    expect(ghost[1].path).toBe("lighting")
  })

  it("lays a still speck at the one point of the frame nearest the phenomenon, carried with the camera", () => {
    const account = accountOf(i => ({ azimuthDeg: i % 2 === 0 ? 2 : 4, altitudeDeg: 1 }))
    const scene = search.bestSceneOf(account, readingOf(account, "fixed-in-frame"))!
    const body = scene.interpretation!.bodies[0]
    expect(body.explains).toEqual(["orb"])
    expect(body.track[0]).toMatchObject({ present: true, distanceM: 1000 })
    for (const keyframe of body.track.slice(0, -1)) {
      expect(keyframe.azimuthDeg!).toBeGreaterThanOrEqual(2)
      expect(keyframe.azimuthDeg!).toBeLessThanOrEqual(4)
      expect(keyframe.altitudeDeg).toBeCloseTo(1, 1)
    }
    expect(body.track.at(-1)).toMatchObject({ present: false })
  })

  it("lays one drop on the glass that follows the phenomenon one way, and holds where it turns back", () => {
    const account = accountOf(i => ({ azimuthDeg: 0, altitudeDeg: [4, 3, 2, 1, 0, 1, 2, 3, 4, 5][i] }))
    const scene = search.bestSceneOf(account, readingOf(account, "driven-one-way"))!
    const drop = scene.lens!.placedDrops![0]
    expect(drop.track).toHaveLength(10)
    const ys = drop.track.map(point => point.y)
    // One way only, whichever: never back.
    const steps = ys.slice(1).map((y, i) => y - ys[i])
    expect(steps.every(step => step >= -1e-4) || steps.every(step => step <= 1e-4)).toBe(true)
    expect(new Set(ys).size).toBeGreaterThan(2)
    expect(drop.track.every(point => Math.abs(point.x - 0.5) < 1e-3)).toBe(true)
    expect(BestCaseSearch.lays({ kind: "lens-ghost", explains: "orb" })).toBe(false)
  })
})
