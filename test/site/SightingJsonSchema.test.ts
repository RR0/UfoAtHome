import { describe, expect, it } from "vitest"
import Ajv2020 from "ajv/dist/2020.js"
import schema from "../../src/generated/sighting.schema.json"

/**
 * The JSON Schema published at ufoathome.org/sighting.schema.json, generated from the types by
 * scripts/build-sighting-schema.ts (run by pretest). Every recording this project ships has to pass
 * it, or the schema would be telling authors that files the player plays are wrong.
 */
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema)
// Read through Vite rather than node:fs, which the tests' own types do not include.
const files = (import.meta as unknown as { glob: (pattern: string, options: object) => Record<string, Record<string, unknown>> })
  .glob("../../public/demo-data/*.json", { eager: true, import: "default" })
const recordings = Object.entries(files)
  .map(([path, json]) => ({ file: path.split("/").pop() ?? path, json }))
  // A case lists several observers' recordings; it is not one, and has its own format.
  .filter(({ json }) => "timeline" in json)

describe("sighting.schema.json", () => {
  it.each(recordings)("accepts $file", ({ json }) => {
    expect(validate(json), JSON.stringify(validate.errors?.slice(0, 3))).toBe(true)
  })

  it("rejects a misspelt key", () => {
    const [{ json }] = recordings
    expect(validate({ ...json, utcOffsetHour: 2 })).toBe(false)
  })

  it("rejects a word a closed list does not have", () => {
    expect(validate({ version: 1, timeline: { keyframes: [] }, account: { source: "rumour" } })).toBe(false)
  })

  it("accepts any value wrapped with its provenance", () => {
    expect(validate({
      version: 1,
      timeline: { keyframes: [] },
      durationSeconds: { value: 15, basis: "derived", rationale: "13-18 s in the synthesis" }
    })).toBe(true)
  })
})
