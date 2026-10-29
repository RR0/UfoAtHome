import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"

describe("a recording's lens", () => {
  it("is read and written back as stated, and absent when nothing is said of it", () => {
    const json = JSON.parse(readFileSync("public/demo-data/sky-test-lens-ghosts-rain.json", "utf8"))
    const sighting = fromSightingJson(json)
    expect(sighting.lens).toEqual({ glass: "window" })
    expect(toSightingJson(sighting).lens).toMatchObject({ glass: "window" })
    const dry = fromSightingJson(JSON.parse(readFileSync("public/demo-data/sky-test-lens-ghosts.json", "utf8")))
    expect(dry.lens).toBeUndefined()
    expect("lens" in toSightingJson(dry) && toSightingJson(dry).lens !== undefined).toBe(false)
  })
})

describe("a recording's metering", () => {
  it("is read and written back as stated, and absent when the device's own", () => {
    const json = JSON.parse(readFileSync("public/demo-data/sky-test-lanterns.json", "utf8"))
    expect(fromSightingJson(json).metering).toBeUndefined()
    const sighting = fromSightingJson({ ...json, metering: "average" })
    expect(sighting.metering).toBe("average")
    expect(toSightingJson(sighting).metering).toBe("average")
  })
})
