import { describe, expect, it } from "vitest"
import { RecordingSections } from "../../src/engine/model/FrozenData.js"

describe("RecordingSections", () => {
  const van = { id: "van", kind: "car" }
  const tree = { id: "ign-lidar-topo-1", kind: "tree", origin: "ign-lidar-topo" }
  const weatherTrack = { keyframes: [] }

  it("keeps in a scenery's annex only what a survey gave, and in the recording what the case states", () => {
    const json: Record<string, unknown> = { decor: [van, tree], weatherTrack }
    expect(RecordingSections.taken("decor", json)).toEqual({ decor: [tree] })
    RecordingSections.strip("decor", json)
    expect(json).toEqual({ decor: [van], weatherTrack })
  })

  it("leaves no scenery in a recording whose scenery is all surveyed", () => {
    const json: Record<string, unknown> = { decor: [tree] }
    RecordingSections.strip("decor", json)
    expect(json).toEqual({})
  })

  it("puts the annex's scenery back after the stated one, replacing any surveyed object the recording still holds", () => {
    const stale = { id: "ign-lidar-topo-9", kind: "tree", origin: "ign-lidar-topo" }
    const json: Record<string, unknown> = { decor: [van, stale] }
    RecordingSections.put("decor", json, { version: 3, decor: [tree] })
    expect(json.decor).toEqual([van, tree])
  })

  it("takes, strips and puts back the other sections' keys whole", () => {
    const json: Record<string, unknown> = { weatherTrack, weatherSource: { id: "era5" }, decor: [van] }
    const taken = RecordingSections.taken("weather", json)
    expect(taken).toEqual({ weatherTrack, weatherSource: { id: "era5" } })
    RecordingSections.strip("weather", json)
    expect(json).toEqual({ decor: [van] })
    RecordingSections.put("weather", json, taken)
    expect(json).toMatchObject(taken)
  })
})
