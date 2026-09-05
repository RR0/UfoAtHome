import { describe, expect, it } from "vitest"
import { EditorState } from "@codemirror/state"
import { CompletionContext } from "@codemirror/autocomplete"
import { json } from "@codemirror/lang-json"
import { SightingCompletion } from "../../site/scripts/sightingCompletion.js"

/**
 * What the Player page's editor offers, and where.
 *
 * The schema behind it is generated from `SightingRecordingJson` (scripts/build-sighting-schema.ts),
 * so what is guarded here is not the list of keys — that follows the model on its own — but the two
 * judgements this class makes over it: WHERE in the document the cursor is, and whether it stands
 * where a key goes or where a value goes. Both are read off a syntax tree in which the interesting
 * position, the whitespace after a colon, belongs to no node at all.
 */
describe("SightingCompletion", () => {
  const completion = new SightingCompletion()

  /** The document with | marking the caret. */
  const at = (marked: string, explicit = true) => {
    const pos = marked.indexOf("|")
    expect(pos).toBeGreaterThan(-1)
    const doc = marked.slice(0, pos) + marked.slice(pos + 1)
    const state = EditorState.create({ doc, extensions: [json()] })
    return completion.source(new CompletionContext(state, pos, explicit))
  }

  const labels = (marked: string, explicit = true): string[] =>
    (at(marked, explicit)?.options ?? []).map(option => option.label)

  describe("where a key goes", () => {
    it("offers the format's top-level keys in an empty recording", () => {
      const offered = labels('{ | }')
      expect(offered).toContain('"version"')
      expect(offered).toContain('"timeline"')
      expect(offered).toContain('"weatherTrack"')
    })

    it("offers the keys of the object the cursor is actually inside, not the top-level ones", () => {
      const offered = labels('{ "weather": { | } }')
      expect(offered).toContain('"cloudCover"')
      expect(offered).toContain('"precipitationType"')
      expect(offered).not.toContain('"timeline"')
    })

    it("sees through an array to the shape of one of its members", () => {
      // `place` is SightingLocation[], and what a reader needs inside it is the keys of one place.
      const offered = labels('{ "place": [ { | } ] }')
      expect(offered).toContain('"lat"')
      expect(offered).toContain('"lng"')
    })

    it("follows a path several objects deep", () => {
      const offered = labels('{ "witnessTrack": { "keyframes": [ { "pose": { | } } ] } }')
      expect(offered).toContain('"headingDeg"')
      expect(offered).toContain('"fovDeg"')
    })

    it("replaces a half-typed key rather than appending to it", () => {
      const result = at('{ "vers|" }')
      expect(result?.from).toBe(2)
      expect(result?.to).toBe(8)
      expect(result?.options.map(option => option.apply)).toContain('"version": ')
    })

    it("says nothing inside an object the format does not describe", () => {
      expect(at('{ "nonsense": { | } }')).toBe(null)
    })
  })

  describe("where a value goes", () => {
    it("offers only the words a key will accept", () => {
      expect(labels('{ "weather": { "precipitationType": | } }'))
        .toEqual(['"none"', '"rain"', '"snow"', '"hail"'])
    })

    it("offers them over a value already written, replacing it", () => {
      const result = at('{ "weather": { "precipitationType": "ra|" } }')
      expect(result?.options.map(option => option.label)).toContain('"rain"')
      expect(result?.from).toBe(36)
    })

    it("declines where the value is free — a number, a name, a URL", () => {
      expect(at('{ "weather": { "cloudCover": | } }')).toBe(null)
      expect(at('{ "caseId": "|" }')).toBe(null)
    })

    it("tells a value position from a key position by the colon behind the caret", () => {
      // Same object, same tree node (the gap belongs to none), two different answers.
      expect(labels('{ "weather": { "precipitationType": | } }')).toContain('"rain"')
      expect(labels('{ "weather": { "precipitationType": "rain", | } }')).toContain('"cloudCover"')
    })
  })

  // A Shape is a discriminated union — an oval or a polygon — and a union is where a schema read
  // from types is easiest to get wrong: describing one branch is a lie, and giving up leaves the
  // editor silent from `shape:` inwards, which is what it did.
  describe("a key whose type is a union of shapes", () => {
    const inShape = '{ "timeline": { "keyframes": [ { "shapes": [ { "shape": { | } } ] } ] } }'

    it("offers what either branch allows", () => {
      const offered = labels(inShape)
      expect(offered).toContain('"kind"')
      expect(offered).toContain('"color"')
      // Only a polygon has these, and a reader typing one needs to be told so.
      expect(offered).toContain('"points"')
    })

    it("offers the discriminant as the words that choose between the branches", () => {
      expect(labels('{ "timeline": { "keyframes": [ { "shapes": [ { "shape": { "kind": | } } ] } ] } }'))
        .toEqual(['"oval"', '"polygon"'])
    })

    it("keeps following the path underneath one", () => {
      expect(labels('{ "timeline": { "keyframes": [ { "shapes": [ { "shape": { "bounds": { | } } } ] } ] } }'))
        .toEqual(['"x"', '"y"', '"width"', '"height"'])
    })
  })

  // Two things the shape union turned up, both older than it.
  describe("what is not a key of a recording", () => {
    it("offers nothing out of Array's prototype", () => {
      // `groups` is an array of arrays, and descending into the inner one used to reach Array
      // itself: push, map, filter and toLocaleString were all offered as keys of a recording.
      const offered = labels('{ "timeline": { "groups": [ [ | ] ] } }')
      for (const method of ['"push"', '"map"', '"filter"', '"toLocaleString"']) {
        expect(offered).not.toContain(method)
      }
    })

    it("calls a boolean a boolean, and not free text", () => {
      // `boolean` IS a union in TypeScript, of true and false, so it fell through the union
      // handling and came out described as a string.
      const storm = at('{ "weather": { | } }')?.options.find(option => option.label === '"storm"')
      expect(storm?.detail).toBe("boolean")
    })
  })

  describe("what it says about a key", () => {
    it("carries the model's own comment, so the format explains itself as it is typed", () => {
      const intensity = at('{ "weather": { | } }')?.options.find(option => option.label === '"precipitationIntensity"')
      expect(intensity?.info).toBe('0-1; meaningless while precipitationType is "none".')
    })

    it("names the words an enum accepts without opening it", () => {
      const type = at('{ "weather": { | } }')?.options.find(option => option.label === '"precipitationType"')
      expect(type?.detail).toBe("none | rain | snow | hail")
    })
  })

  // Typing prose in a string, or sitting mid-object with nothing to go on, should not throw a
  // popup over the line being written — only an explicit Ctrl-Space asks for one there.
  it("keeps quiet where nothing was asked and nothing obviously follows", () => {
    expect(at('{ "version": 1, "caseId": "x" |}', false)).toBe(null)
  })
})
