import { afterEach, describe, expect, it, vi } from "vitest"
import { ReadingsComparisonElement, type ComparedReading } from "../../src/component/ReadingsComparisonElement.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const DEG = Math.PI / 180

/** A phenomenon a degree across, 10° up, due north at two instants, its directions said as a report gives them. */
const account = (): SightingRecordingJson => ({
  version: 4,
  place: { locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: [0, 1000].map(t => ({
      t,
      shapes: [{
        sourceId: "ufo",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          angular: { widthDeg: 1, heightDeg: 1 },
          aim: { value: { azimuthDeg: 0, altitudeDeg: 10 }, basis: "stated", rationale: "the report" }
        }
      }]
    }))
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

const diameter = 2 * 100 * Math.tan(0.5 * DEG)

/** A reading placing a sphere `offDeg` east of where it was said, its track supposed; or one that explains nothing. */
const reading = (offDeg = 0, explains = ["ufo"]): SightingRecordingJson => ({
  version: 4,
  timeline: { keyframes: [] },
  interpretation: {
    bodies: [{
      id: "b", model: { id: "ellipsoid" }, explains,
      track: {
        value: [0, 1000].map(t => ({ t, azimuthDeg: offDeg, altitudeDeg: 10, distanceM: 100, sizeM: { widthM: diameter, lengthM: diameter, heightM: diameter } })),
        basis: "assumed"
      }
    }]
  }
} as unknown as SightingRecordingJson)

const table = async (rows: ComparedReading[], load?: () => Promise<ComparedReading[]>) => {
  const element = ReadingsComparisonElement.create()
  document.body.append(element)
  element.show(rows, load)
  await expect.poll(() => element.shadowRoot!.querySelector("details")).not.toBeNull()
  return element
}
const unfold = (element: ReadingsComparisonElement) => {
  const details = element.shadowRoot!.querySelector("details")!
  details.open = true
  details.dispatchEvent(new Event("toggle"))
}
const cells = (element: ReadingsComparisonElement) =>
  [...element.shadowRoot!.querySelectorAll("tbody tr")].map(row => [...(row as HTMLTableRowElement).cells].map(cell => cell.textContent))

describe("A case's readings side by side, as its player and its editor show them", () => {
  afterEach(() => document.body.replaceChildren())

  it("groups the readings of one hypothesis for each witness under one title, each with how it fares", async () => {
    const shared = account()
    const element = await table([
      { title: "Balloon", witness: "A", account: shared, reading: reading(0) },
      { title: "Bird", witness: "A", account: shared, reading: reading(0, []) },
      { title: "Balloon", witness: "B", account: shared, reading: reading(44) }
    ])
    expect(element.shadowRoot!.querySelector("summary")!.textContent).toMatch(/^Readings compared \(3\)/)
    expect(cells(element)).toEqual([
      ["Balloon", "A", "2 / 2", "0°", "sufficient", "1"],
      ["B", "2 / 2", expect.stringMatching(/^4\d(\.\d)?°$/), "fine-tuned (direction)", "1"],
      ["Bird", "A", "nothing to compare", "1"]
    ])
  })

  it("loads its recordings only when it is unfolded, and opens a reading from its witness", async () => {
    const open = vi.fn()
    const load = vi.fn(async () => [{ title: "Balloon", witness: "A", account: account(), reading: reading(), open }])
    const element = await table([{ title: "Balloon", witness: "A", open }], load)
    expect(load).not.toHaveBeenCalled()
    expect(cells(element)[0].slice(2)).toEqual(["…", "…", "…", "…"])
    unfold(element)
    await expect.poll(() => cells(element)[0][2]).toBe("2 / 2")
    expect(load).toHaveBeenCalledOnce()
    ;(element.shadowRoot!.querySelector("button.link") as HTMLButtonElement).click()
    expect(open).toHaveBeenCalledOnce()
  })

  it("is hidden for a case without readings", async () => {
    const element = ReadingsComparisonElement.create()
    document.body.append(element)
    element.show([])
    expect(element.hidden).toBe(true)
  })
})
