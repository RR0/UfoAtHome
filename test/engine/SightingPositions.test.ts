import { describe, expect, it } from "vitest"
import type { Sighting } from "../../src/engine/model/Sighting.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

describe("SightingPositions", () => {
  it("writes how a place was said with the numbers of where it now is, and forgets a reference that is gone", () => {
    const sighting = fromSightingJson({ version: 1, timeline: { keyframes: [] } } as unknown as SightingRecordingJson)
    sighting.observerTrack.addKeyframe(0, { lat: 44, lng: 5, elevationM: 0, pitchDeg: 0, fovDeg: 60 })
    sighting.decor = [
      { id: "house", kind: "building", eastM: 100, northM: 0 },
      // Said 20 m north of the house, then dragged 5 m east.
      { id: "car", kind: "car", eastM: 105, northM: 20, saidPosition: { relativeTo: "house", eastM: 0, northM: 20 } },
      { id: "tree", kind: "tree", eastM: 1, northM: 1, saidPosition: { relativeTo: "gone", eastM: 1, northM: 1 } }
    ] as Sighting["decor"]
    const json = toSightingJson(sighting)
    expect(json.decor![1].saidPosition).toEqual({ relativeTo: "house", eastM: 5, northM: 20 })
    expect(json.decor![2].saidPosition).toBeUndefined()
    // Memory is left as it is.
    expect(sighting.decor[1].saidPosition).toEqual({ relativeTo: "house", eastM: 0, northM: 20 })
  })
})
