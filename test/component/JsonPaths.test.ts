import { describe, expect, it } from "vitest"
import { EditorState } from "@codemirror/state"
import { json } from "@codemirror/lang-json"
import { JsonPaths } from "../../src/component/JsonPaths.js"

const text = `{
  "id": "case",
  "decor": [
    { "id": "tree-1", "eastM": 1 },
    { "id": "tree-2", "eastM": 22 }
  ],
  "timeline": { "keyframes": [ { "t": 0, "shapes": [ { "sourceId": "a" } ] } ] }
}`
const state = EditorState.create({ doc: text, extensions: [json()] })
const at = (fragment: string, offset = 0) => text.indexOf(fragment) + offset

describe("JsonPaths", () => {
  it("names the place under the caret", () => {
    expect(JsonPaths.at(state, at("22", 1))).toEqual(["decor", 1, "eastM"])
    expect(JsonPaths.at(state, at('"tree-1"', 2))).toEqual(["decor", 0, "id"])
    expect(JsonPaths.at(state, at('"sourceId"', 3))).toEqual(["timeline", "keyframes", 0, "shapes", 0, "sourceId"])
  })

  it("names the object a caret is in, between its keys", () => {
    expect(JsonPaths.at(state, at('{ "id": "tree-2"', 1))).toEqual(["decor", 1])
  })

  it("finds the text of what a path names", () => {
    const range = JsonPaths.range(state, ["decor", 1])!
    expect(text.slice(range.from, range.to)).toBe('{ "id": "tree-2", "eastM": 22 }')
    const property = JsonPaths.range(state, ["decor", 0, "eastM"])!
    expect(text.slice(property.from, property.to)).toBe('"eastM": 1')
  })

  it("finds nothing for a path the text does not have", () => {
    expect(JsonPaths.range(state, ["decor", 5])).toBeUndefined()
    expect(JsonPaths.range(state, ["nothing"])).toBeUndefined()
  })
})
