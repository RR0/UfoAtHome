import { describe, expect, it } from "vitest"
import { RecordingRules } from "../../../src/engine/narrative/RecordingRules.js"
import { tagNames_fr } from "../../../src/component/messages/TagNames_fr.js"
import schema from "../../../src/generated/sightingSchema.json"

describe("RecordingRules", () => {
  it("offers exactly the tags a translation is known for", () => {
    expect([...RecordingRules.KNOWN_TAGS].sort()).toEqual(Object.keys(tagNames_fr).sort())
  })

  it("numbers each audience's rules from one, with no placeholder left", () => {
    for (const audience of ["draft", "file"] as const) {
      const text = RecordingRules.text(audience)
      expect(text.startsWith("1. ")).toBe(true)
      expect(text).not.toContain("{tags}")
      expect(text).toContain("landing")
    }
  })

  it("tells a draft to leave the offset and the account to the editor, and a file to write both", () => {
    const draft = RecordingRules.text("draft")
    const file = RecordingRules.text("file")
    expect(draft).toContain("NEVER `utcOffsetHours`")
    expect(draft).toContain("NEVER write `description`")
    expect(file).toContain("AND `utcOffsetHours`")
    expect(file).toContain("`description` is the account itself")
  })

  it("puts elevation above the ground, where the renderer puts it", () => {
    for (const audience of ["draft", "file"] as const) {
      expect(RecordingRules.text(audience)).toContain("above the local ground")
      expect(RecordingRules.text(audience)).not.toContain("above sea level")
    }
  })

  it("names only account fields the format has", () => {
    const fields = Object.keys((schema as Record<string, { fields?: Record<string, unknown> }>).account.fields ?? {})
    for (const audience of ["draft", "file"] as const) {
      // `observerSide` is a decor object's, not the account's: only the account's own are checked.
      const named = [...RecordingRules.text(audience).matchAll(/`(observer(?:Count|Age|Occupation)\w*)`/g)].map(match => match[1])
      expect(named.length).toBeGreaterThan(0)
      for (const name of named) expect(fields).toContain(name)
    }
  })
})
