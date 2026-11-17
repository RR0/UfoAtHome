import { afterEach, describe, expect, test } from "vitest"
import { BirdEditor } from "../../src/modules/interpretations/birds/BirdEditor.js"
import { BirdFlock } from "../../src/modules/interpretations/birds/BirdFlock.js"
import type { BirdFlockJson } from "../../src/modules/interpretations/birds/BirdFlock.js"
import { BirdParameters } from "../../src/modules/interpretations/birds/BirdParameters.js"
import type { InterpretationJson } from "../../src/engine/interpretation/Interpretation.js"
import { SaidTexts } from "../../src/engine/model/SaidText.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

describe("BirdEditor", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = async (interpretation?: InterpretationJson, place = true, language = "en") => {
    const sighting = {
      interpretation,
      event: { place: place ? [{ lat: 48, lng: 2 }] : [] },
      observerTrack: { getInterpolatedPoseAt: () => ({ headingDeg: 90, lat: 48, lng: 2 }) }
    } as unknown as Sighting
    let changes = 0
    let time = 5000
    const seeks: number[] = []
    const editor = new BirdEditor(container, {
      sighting: () => sighting, said: () => new SaidTexts([language]), writingLanguage: () => language, shapes: () => [{ id: "light-1", label: "Light 1" }],
      currentTime: () => time, duration: () => 60000, seekTo: t => { seeks.push(t); time = t },
      changed: () => changes++
    }, language)
    await editor.ready
    editor.sync()
    return { sighting, editor, changes: () => changes, seeks, at: (t: number) => { time = t } }
  }
  const typed = (target: Element, value: string) => {
    ;(target as HTMLInputElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const chosen = (target: Element, value: string) => {
    ;(target as HTMLSelectElement).value = value
    target.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const flock = (): BirdFlockJson => ({
    id: "f", species: "canada-goose", count: 9, formation: { kind: "v" },
    path: [{ t: 0, eastM: 0, northM: 500, altitudeM: 100 }, { t: 30000, eastM: 400, northM: 500, altitudeM: 120 }]
  })
  const birdsOf = (sighting: Sighting) => sighting.interpretation!.birds!

  test("adds a dozen gulls crossing in front of the observer from the playhead, read into the account beside its bodies", async () => {
    const body = { id: "b", model: { id: "sphere" }, track: [] }
    const { sighting, changes } = await build({ bodies: [body] })
    container.querySelector<HTMLButtonElement>("#bird-add")!.click()
    const added = birdsOf(sighting)
    expect(added).toHaveLength(1)
    expect(added[0].count).toBe(12)
    expect(added[0].species).toBe("herring-gull")
    // The observer faces east: 300 m east, crossing from north to south, from the playhead for 20 s.
    const [from, to] = added[0].path as { t: number, eastM: number, northM: number }[]
    expect(from.t).toBe(5000)
    expect(to.t).toBe(25000)
    expect(from.eastM).toBeCloseTo(300, -1)
    expect(from.northM).toBeGreaterThan(100)
    expect(to.northM).toBeLessThan(-100)
    expect(sighting.interpretation!.bodies).toEqual([body])
    expect(changes()).toBe(1)
    expect(BirdFlock.bodiesOf(added[0])).toHaveLength(12)
  })

  test("writes an edit as a new flock in a new interpretation, so that the scene computes the birds again", async () => {
    const stated = flock()
    const { sighting } = await build({ bodies: [], birds: [stated] })
    const before = sighting.interpretation
    typed(container.querySelector('[data-key="count"]')!, "5")
    expect(sighting.interpretation).not.toBe(before)
    expect(birdsOf(sighting)[0].count).toBe(5)
    expect(stated.count).toBe(9)
    chosen(container.querySelector('[data-key="species"]')!, "snow-goose")
    expect(birdsOf(sighting)[0].species).toBe("snow-goose")
  })

  test("shows what is in force when a field is empty: the species' wingbeat, its colours", async () => {
    await build({ bodies: [], birds: [flock()] })
    const hz = container.querySelector<HTMLInputElement>('[data-key="wingbeatHz"]')!
    expect(hz.value).toBe("")
    expect(Number(hz.placeholder.replace(",", "."))).toBeGreaterThan(2)
    expect(container.querySelector<HTMLInputElement>('[data-key="colours.headColor"]')!.value).toBe("#1d1c1b")
  })

  test("completes what a field leaves half said, so that the birds can still be computed", async () => {
    const stated = { ...flock(), formation: undefined, flight: undefined }
    const { sighting } = await build({ bodies: [], birds: [stated] })
    chosen(container.querySelector('[data-key="flight.kind"]')!, "bursts")
    expect(birdsOf(sighting)[0].flight).toEqual({ kind: "bursts", ...BirdParameters.BURST })
    typed(container.querySelector('[data-key="formation.spacing"]')!, "2")
    expect(birdsOf(sighting)[0].formation).toEqual({ kind: "cluster", spacing: 2 })
    expect(BirdFlock.bodiesOf(birdsOf(sighting)[0]).every(body => body.track.every(key => Number.isFinite(key.eastM)))).toBe(true)
  })

  test("puts a point of the path at the playhead where the flock is then, and edits it", async () => {
    const { sighting, seeks, at } = await build({ bodies: [], birds: [flock()] })
    at(15000)
    container.querySelector<HTMLButtonElement>("#bird-timeline .track-add")!.click()
    const path = birdsOf(sighting)[0].path
    expect(path).toHaveLength(3)
    expect(path[1]).toEqual({ t: 15000, eastM: 200, northM: 500, altitudeM: 110 })
    expect(seeks).toContain(15000)
    typed(container.querySelector('#bird-point-parameters [data-key="altitudeM"]')!, "150")
    expect((birdsOf(sighting)[0].path[1] as { altitudeM: number }).altitudeM).toBe(150)
  })

  test("a point held past either end of the path, and a path said as directions shown as such", async () => {
    expect(BirdParameters.waypointAt(flock(), 60000)).toEqual({ t: 60000, eastM: 400, northM: 500, altitudeM: 120 })
    expect(BirdParameters.waypointAt(flock(), -1000)).toEqual({ t: -1000, eastM: 0, northM: 500, altitudeM: 100 })
    const angular: BirdFlockJson = { id: "a", species: "brown-pelican", path: [{ t: 0, azimuthDeg: 120, altitudeDeg: 2, distanceM: 5000 }] }
    await build({ bodies: [], birds: [angular] })
    const points = container.querySelector("#bird-point-parameters")!
    expect(points.querySelector<HTMLInputElement>('[data-key="azimuthDeg"]')!.value).toBe("120")
    expect(points.querySelector<HTMLElement>('[data-key="altitudeM"]')!.closest("label")!.hidden).toBe(true)
  })

  test("deleting the last birds leaves no interpretation behind when it says nothing else", async () => {
    const { sighting } = await build({ bodies: [], birds: [flock()] })
    container.querySelector<HTMLButtonElement>("#bird-delete")!.click()
    expect(sighting.interpretation).toBeUndefined()
  })

  test("adds none to a recording with no place to put them in, and speaks French", async () => {
    const { sighting } = await build(undefined, false, "fr")
    container.querySelector<HTMLButtonElement>("#bird-add")!.click()
    expect(sighting.interpretation).toBeUndefined()
    container.replaceChildren()
    await build({ bodies: [], birds: [flock()] }, true, "fr")
    const species = container.querySelector<HTMLSelectElement>('[data-key="species"]')!
    expect([...species.options].map(option => option.textContent)).toContain("Bernache du Canada")
  })
})
