import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { TrafficModels } from "../../src/engine/traffic/TrafficModels.js"

const MODELS = join(__dirname, "../../public/models")
const catalogue = JSON.parse(readFileSync(join(MODELS, "index.json"), "utf8")) as {
  models: { id: string; file: string; kind: string; credit?: { license?: string; sourceUrl?: string }; sizeM?: object }[]
}

describe("the decor model catalogue shipped with the site", () => {
  it("has a file for every entry, and a licence with it: a model with no credit is not drawn", () => {
    for (const entry of catalogue.models) {
      expect(existsSync(join(MODELS, entry.file)), entry.id).toBe(true)
      expect(entry.credit?.license, entry.id).toBeTruthy()
    }
  })

  it("has unique ids", () => {
    const ids = catalogue.models.map(entry => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has every model the traffic is drawn with, as an aircraft with the size of the real thing", () => {
    for (const id of ["amvlab-a320", "amvlab-b737"]) {
      const entry = catalogue.models.find(model => model.id === id)!
      expect(entry, id).toBeDefined()
      expect(entry.kind).toBe("aircraft")
      expect(entry.sizeM).toBeDefined()
    }
    for (const type of ["A320", "B738"]) expect(catalogue.models.some(model => model.id === TrafficModels.idOf(type))).toBe(true)
  })

  it("keeps the licence of the models it re-hosts beside them", () => {
    expect(existsSync(join(MODELS, "amvlab-aircraft/LICENSE"))).toBe(true)
    expect(readFileSync(join(MODELS, "amvlab-aircraft/LICENSE"), "utf8")).toContain("CC BY 4.0")
  })
})
