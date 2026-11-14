import { afterEach, describe, expect, it } from "vitest"
import { ReadingSensitivityElement } from "../../src/component/ReadingSensitivityElement.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const DEG = Math.PI / 180

/** A phenomenon a degree across, 10° up, due north, at each of as many seconds as `azimuths` has, at those azimuths. */
const account = (azimuths = [0, 0]): SightingRecordingJson => ({
  version: 4,
  place: { locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: azimuths.map((azimuthDeg, i) => ({
      t: i * 1000,
      shapes: [{
        sourceId: "ufo",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          angular: { widthDeg: 1, heightDeg: 1 }, aim: { azimuthDeg, altitudeDeg: 10 }
        }
      }]
    }))
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

const diameter = 2 * 100 * Math.tan(0.5 * DEG)

/** A reading placing `count` spheres 100 m off where the phenomenon is said, their tracks supposed; `explains` empty to explain nothing. */
const reading = (count = 1, explains = ["ufo"]): SightingRecordingJson => ({
  version: 4,
  timeline: { keyframes: [] },
  interpretation: {
    bodies: Array.from({ length: count }, (_, i) => ({
      id: `b${i}`, title: { en: `Balloon ${i + 1}` }, model: { id: "ellipsoid" }, explains,
      track: {
        value: [0, 1000, 2000].map(t => ({ t, azimuthDeg: 0, altitudeDeg: 10, distanceM: 100, sizeM: { widthM: diameter, lengthM: diameter, heightM: diameter } })),
        basis: "assumed"
      }
    }))
  }
} as unknown as SightingRecordingJson)

const shown = async (accountJson: SightingRecordingJson, readingJson: SightingRecordingJson): Promise<ReadingSensitivityElement> => {
  const element = ReadingSensitivityElement.create()
  document.body.append(element)
  element.show(accountJson, readingJson)
  await expect.poll(() => element.shadowRoot!.textContent).not.toBe("")
  return element
}
const line = (element: ReadingSensitivityElement) => element.shadowRoot!.querySelector("summary, p")!.textContent!
const rows = (element: ReadingSensitivityElement) => [...element.shadowRoot!.querySelectorAll("li")].map(row => row.textContent)

describe("A reading's sensitivity, as the case's player and editor say it", () => {
  afterEach(() => document.body.replaceChildren())

  it("says how much of the account it reproduces and the value it is the most tied to, then each margin", async () => {
    const element = await shown(account(), reading())
    expect(element.hidden).toBe(false)
    expect(line(element)).toMatch(/^Sensitivity: reproduces all 2 comparisons · most fragile: \w+, from /)
    // One body supposed: its name goes without saying.
    expect(rows(element)).toHaveLength(5)
    expect(rows(element).join()).not.toContain("Balloon")
    expect(rows(element).find(row => row!.startsWith("distance"))).toMatch(/×0\.6\d to ×1\.(49|5)/)
  })

  it("names the body a margin is of when the reading supposed several", async () => {
    const element = await shown(account(), reading(2))
    expect(rows(element).join()).toContain("(Balloon 1)")
  })

  it("says one comparison in the singular", async () => {
    // Said due north, then 5° east: a body that stays north reproduces the first only.
    const element = await shown(account([0, 5]), reading())
    expect(line(element)).toContain("reproduces 1 of 2 comparisons")
  })

  it("says when there is nothing to set against the account, with no arrow that opens nothing", async () => {
    const element = await shown(account(), reading(1, []))
    expect(line(element)).toContain("no body of the reading says which phenomenon it is")
    expect(element.shadowRoot!.querySelector("details")).toBeNull()
  })

  it("is hidden for a reading that places no body", () => {
    const element = ReadingSensitivityElement.create()
    document.body.append(element)
    element.show(account(), { version: 4, timeline: { keyframes: [] } } as unknown as SightingRecordingJson)
    expect(element.hidden).toBe(true)
  })
})
