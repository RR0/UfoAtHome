import { describe, expect, it } from "vitest"
import Ajv2020 from "ajv/dist/2020.js"
import { EditorState } from "@codemirror/state"
import { CompletionContext } from "@codemirror/autocomplete"
import { json } from "@codemirror/lang-json"
import schema from "../../src/generated/case.schema.json"
import caseFields from "../../src/generated/caseSchema.json"
import { SightingCompletion } from "../../src/component/SightingCompletion.js"

/**
 * The description of a case, generated from `CaseJson` as a recording's is from `SightingRecordingJson` (scripts/build-sighting-schema.ts, run
 * by pretest): the JSON Schema published at ufoathome.org/case.schema.json, and what the case editor's text completes from. A case holds more
 * than UFO@home reads (RR0 defines it), so what the schema does not know passes; every case this project ships has to pass it.
 */
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema)
const files = (import.meta as unknown as { glob: (pattern: string, options: object) => Record<string, Record<string, unknown>> })
  .glob("../../public/demo-data/case-*.json", { eager: true, import: "default" })
const cases = Object.entries(files).map(([path, json]) => ({ file: path.split("/").pop() ?? path, json }))

describe("case.schema.json", () => {
  it("has the cases the project ships", () => {
    expect(cases.length).toBeGreaterThan(5)
  })

  it.each(cases)("accepts $file", ({ json: sample }) => {
    expect(validate(sample), JSON.stringify(validate.errors?.slice(0, 3))).toBe(true)
  })

  it("accepts what a case holds beyond what UFO@home reads, and rejects a wrong kind of value", () => {
    expect(validate({ id: "X", classification: "A", events: [{ eventType: "sighting", people: ["Someone"] }] })).toBe(true)
    expect(validate({ id: "X", events: "none" })).toBe(false)
    expect(validate({ id: "X", events: [{ eventType: "sighting", url: 3 }] })).toBe(false)
  })

  it("describes the interview an event may be: whom it was held with, who held it, what it established", () => {
    const events = (caseFields as unknown as Record<string, { fields: Record<string, { doc?: string, suggest?: string[] }> }>).events.fields
    expect(Object.keys(events)).toEqual(expect.arrayContaining(["eventType", "interviewOf", "by", "summary", "url", "time"]))
    expect(events.eventType.suggest).toEqual(expect.arrayContaining(["sighting", "interview"]))
    // What an interview was held through is one of a list, which the editor offers and the schema checks.
    expect(Object.keys(events)).toContain("medium")
    expect([...(events.medium as unknown as { values: string[] }).values].sort()).toEqual(["chat", "email", "in-person", "letter", "other", "phone", "video"])
    expect(validate({ id: "X", events: [{ eventType: "interview", medium: "video" }] })).toBe(true)
    expect(validate({ id: "X", events: [{ eventType: "interview", medium: "telepathy" }] })).toBe(false)
    expect(events.interviewOf.doc).toBeTruthy()
  })
})

describe("The completion of a case's text", () => {
  const completion = new SightingCompletion([], caseFields as never)
  const labels = (marked: string, explicit = true): string[] => {
    const pos = marked.indexOf("|")
    const state = EditorState.create({ doc: marked.slice(0, pos) + marked.slice(pos + 1), extensions: [json()] })
    return (completion.source(new CompletionContext(state, pos, explicit))?.options ?? []).map(option => option.label)
  }

  it("offers a case's keys, not a recording's", () => {
    const offered = labels("{ | }")
    expect(offered).toEqual(expect.arrayContaining(['"events"', '"title"', '"summary"']))
    expect(offered).not.toContain('"timeline"')
  })

  it("offers an event's keys inside the events, the interview's among them", () => {
    expect(labels('{ "events": [ { | } ] }')).toEqual(expect.arrayContaining(['"eventType"', '"interviewOf"', '"by"', '"summary"']))
  })

  it("suggests the kinds of event, without closing the list", () => {
    expect(labels('{ "events": [ { "eventType": | } ] }')).toEqual(expect.arrayContaining(['"sighting"', '"interview"']))
  })
})
