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
          // The directions said, as a report gives them: only what a recording traces to the witness is compared (see
          // ReadingSensitivity.forAccount). The size is drawn, not said.
          angular: { widthDeg: 1, heightDeg: 1 }, aim: { value: { azimuthDeg, altitudeDeg: 10 }, basis: "stated", rationale: "the report" }
        }
      }]
    }))
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

const diameter = 2 * 100 * Math.tan(0.5 * DEG)

/** A reading placing `count` spheres 100 m off where the phenomenon is said, or `offDeg` east of it, their tracks supposed; `explains`
 * empty to explain nothing. */
const reading = (count = 1, explains = ["ufo"], offDeg = 0): SightingRecordingJson => ({
  version: 4,
  timeline: { keyframes: [] },
  interpretation: {
    bodies: Array.from({ length: count }, (_, i) => ({
      id: `b${i}`, title: { en: `Balloon ${i + 1}` }, model: { id: "ellipsoid" }, explains,
      track: {
        value: [0, 1000, 2000].map(t => ({ t, azimuthDeg: offDeg, altitudeDeg: 10, distanceM: 100, sizeM: { widthM: diameter, lengthM: diameter, heightM: diameter } })),
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

  it("says how much of what the witness said it reproduces and whether its margin is sufficient, then each margin", async () => {
    const element = await shown(account(), reading())
    expect(element.hidden).toBe(false)
    expect(line(element)).toMatch(/^Sensitivity: reproduces all the witness's 2 indications · sufficient margin\?/)
    // One body supposed: its name goes without saying. No size said: neither its distance nor its size is turned.
    expect(rows(element).map(row => row!.split(":")[0]).sort()).toEqual(["direction", "height", "time"])
    expect(rows(element).join()).not.toContain("Balloon")
  })

  it("judges each margin against how uncertain the value is, and says the margin is sufficient when it covers half of it", async () => {
    const element = await shown(account(), reading())
    expect(line(element)).toContain("sufficient margin")
    // A direction estimated by a witness is good to about 45° either way (see ConsolidatedErrorModel).
    expect(rows(element).find(row => row!.startsWith("direction"))).toMatch(/for an uncertainty of -45° to \+45° \(\d+ % covered\)/)
    expect(rows(element).find(row => row!.startsWith("time"))).toContain("no law says how uncertain it is")
  })

  it("says a reading is fine-tuned when it agrees only at the edge of what the witness could be off by", async () => {
    // 44° east of where it was said: still within a witness's 45°, but moved a degree further it is not.
    const element = await shown(account(), reading(1, ["ufo"], 44))
    expect(line(element)).toMatch(/fine-tuned: direction covers only \d+ % of its uncertainty/)
  })

  it("names the body a margin is of when the reading supposed several", async () => {
    const element = await shown(account(), reading(2))
    expect(rows(element).join()).toContain("(Balloon 1)")
  })

  it("says one comparison in the singular", async () => {
    // Said due north, then 60° east, beyond the 45° a witness's estimated heading may be off: a body that stays north reproduces the first.
    const element = await shown(account([0, 60]), reading())
    expect(line(element)).toContain("reproduces 1 of the witness's 2 indications")
  })

  it("says when there is nothing to set against the account, with no arrow that opens nothing", async () => {
    const element = await shown(account(), reading(1, []))
    expect(line(element)).toContain("no body of the reading says which phenomenon it is")
    expect(element.shadowRoot!.querySelector("details")).toBeNull()
  })

  it("says when the account traces nothing to the witness", async () => {
    const bare = account()
    for (const key of (bare.timeline as unknown as { keyframes: { shapes: { shape: { aim: unknown } }[] }[] }).keyframes) {
      key.shapes[0].shape.aim = { azimuthDeg: 0, altitudeDeg: 10 }
    }
    const element = await shown(bare, reading())
    expect(line(element)).toContain("it traces no direction and no size to the witness")
  })

  it("measures no robustness for a reading that reproduces less than half of what was said", async () => {
    const element = await shown(account([0, 60, 60]), reading())
    expect(line(element)).toContain("reproduces 1 of the witness's 3 indications · too few to measure how robust it is")
    expect(rows(element)).toEqual([])
  })

  it("is hidden for a reading that places no body", () => {
    const element = ReadingSensitivityElement.create()
    document.body.append(element)
    element.show(account(), { version: 4, timeline: { keyframes: [] } } as unknown as SightingRecordingJson)
    expect(element.hidden).toBe(true)
  })
})
