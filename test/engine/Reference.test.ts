import { describe, expect, it } from "vitest"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SceneReference } from "../../src/engine/model/Reference.js"

const picture: SceneReference = {
  id: "vue-1968",
  kind: "photo",
  src: "https://rr0.org/time/1/9/6/8/08/Cussac_hebdo.jpg",
  title: { fr: "Vue depuis le lieu de l'observation, fin été 1968", en: "View from the spot, late summer 1968" },
  credit: "Claude de Saint Etienne, LDLN n° 25",
  creditUrl: "https://rr0.org/science/crypto/ufo/enquete/dossier/Cussac/",
  drawing: true,
  opacity: 0.5,
  registration: { headingDeg: 285, pitchDeg: 1, rollDeg: -0.5, fovDeg: 27 }
}

function recording(references?: SceneReference[]): SightingRecordingJson {
  return { version: 1, timeline: { keyframes: [] }, references }
}

describe("a recording's pictures of the place", () => {
  it("round-trip through the file exactly as written", () => {
    const sighting = fromSightingJson(recording([picture]))
    expect(sighting.references).toEqual([picture])
    expect(toSightingJson(sighting).references).toEqual([picture])
  })

  it("are absent from the file, not an empty list, when a recording carries none", () => {
    const sighting = fromSightingJson(recording())
    expect(sighting.references).toEqual([])
    expect("references" in toSightingJson(sighting)).toBe(true)
    expect(toSightingJson(sighting).references).toBeUndefined()
  })
})
