import { afterEach, describe, expect, it, vi } from "vitest"
import { ScenarioSweepElement } from "../../src/component/ScenarioSweepElement.js"
import type { CaseJson } from "../../src/engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

const said = (value: unknown) => ({ value, basis: "stated", rationale: "the witness's sketch" })
const account = {
  version: 4, id: "2020-04-15-Test", time: "2020-04-15T22:00:00", utcOffsetHours: 2, place: { name: "Home", locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: [0, 5000, 10000].map(t => ({ t, shapes: [{ sourceId: "light", shape: {
      kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
      angular: { widthDeg: 0.1, heightDeg: 0.1 }, aim: said({ azimuthDeg: 90, altitudeDeg: 10 }) } }] })), order: ["light"], groups: []
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 90, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson
const gossamer = {
  version: 4, id: "2020-04-15-Test-gossamer", time: "2020-04-15T22:00:00", place: { name: "Home", locations: [{ lat: 48, lng: 2 }] },
  interpretation: { title: { en: "Gossamer" }, bodies: [{ id: "tuft", explains: ["light"], model: { id: "ellipsoid" }, drifting: true,
    track: [0, 10000].map(t => ({ t, eastM: 100, northM: t / 1000, altitudeM: 17.6, sizeM: { widthM: 0.2, lengthM: 0.2, heightM: 0.2 } })) }] }
} as unknown as SightingRecordingJson
const kase: CaseJson = {
  conditions: { time: { from: "2020-04-15T12:00", to: "2020-04-16T23:00" }, places: { candidates: [{ id: "far", place: { name: "Far away", locations: [{ lat: 30, lng: 2 }] } }] } },
  events: [
    { type: "event", eventType: "sighting", id: "w1", title: "The light", url: "account.json" },
    { type: "event", eventType: "sighting", interpretationOf: "w1", title: { en: "Gossamer" }, url: "gossamer.json" }
  ]
}

/** The archive's answer: calm at home, 40 m/s north far away. */
const answer = (url: string) => {
  const params = new URL(url).searchParams
  const day = params.get("start_date")!
  const time = Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, "0")}:00`)
  const far = Number(params.get("latitude")) < 40
  return { latitude: Number(params.get("latitude")), longitude: 2, elevation: 0, hourly: { time, wind_speed_10m: time.map(() => far ? 40 : 0.2), wind_direction_10m: time.map(() => 180) } }
}

describe("The sweep of a case's uncertain place and date, in its editor", () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it("is hidden for a case that leaves nothing open", async () => {
    ScenarioSweepElement.register()
    const element = document.createElement(ScenarioSweepElement.TAG) as ScenarioSweepElement
    document.body.append(element)
    element.show({ caseJson: () => ({ events: [] }), load: async () => account, keep: () => 0 })
    expect(element.hidden).toBe(true)
  })

  it("plays every scenario, says each reading's verdict and the sky's alerts, and keeps the scenarios ticked", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("open-meteo") ? new Response(JSON.stringify(answer(String(url)))) : new Response("", { status: 404 })))
    ScenarioSweepElement.register()
    const element = document.createElement(ScenarioSweepElement.TAG) as ScenarioSweepElement
    document.body.append(element)
    const kept: { recording: SightingRecordingJson, readingUrl: string }[] = []
    const files: Record<string, SightingRecordingJson> = { "account.json": account, "gossamer.json": gossamer }
    element.show({ caseJson: () => kase, load: async url => files[url], keep: readings => { kept.push(...readings); return readings.length } })
    await expect.poll(() => element.shadowRoot!.querySelector("button.pill")?.textContent).toBe("Play every scenario")
    expect(element.hidden).toBe(false)
    expect(element.shadowRoot!.textContent).toContain("Open: 1 candidate places")
    element.shadowRoot!.querySelector<HTMLButtonElement>("button.pill")!.click()
    await expect.poll(() => element.shadowRoot!.querySelector(".verdict")?.textContent, { timeout: 10_000 }).toBeTruthy()
    const text = element.shadowRoot!.textContent!
    expect(element.shadowRoot!.querySelector(".verdict")!.textContent).toBe("conditional (only if at the place assumed): plausible as written, becomes conditional (holds in 2 of 4 scenarios)")
    expect(text).toContain("depends on the wind")
    expect(text).toContain("Sky alerts")
    expect(text).toMatch(/Mars incompatible in every scenario: w1/)
    // The telling scenarios are ticked: the best where it holds, the worst where it fails.
    const ticks = [...element.shadowRoot!.querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
    expect(ticks.filter(tick => tick.checked)).toHaveLength(2)
    const keep = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Keep the ticked scenarios as readings")!
    keep.click()
    await expect.poll(() => kept.length).toBe(2)
    expect(kept.map(k => k.recording.interpretation?.scenario?.id).sort()).toEqual(["far@2020-04-16T22:00", "own@2020-04-15T22:00"].sort())
    const title = kept.find(k => k.recording.interpretation?.scenario?.id.startsWith("far"))!.recording.interpretation!.title as Record<string, string>
    expect(Object.keys(title).sort()).toEqual(["en", "es", "fr", "it"])
    expect(title.fr).toMatch(/^Gossamer, jouée à Far away le 16 avril 2020/)
    expect(kept.find(k => k.recording.interpretation?.scenario?.id.startsWith("own"))!.recording.interpretation!.title).toMatchObject({ fr: expect.stringMatching(/^Gossamer, jouée au lieu supposé le 15 avril 2020/) })
    await expect.poll(() => element.shadowRoot!.textContent).toContain("2 readings added to the case.")
  })
})
