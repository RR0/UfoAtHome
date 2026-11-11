import { describe, expect, it } from "vitest"
import { ReadingVerdicts } from "../../../src/engine/interpretation/ReadingVerdict.js"

describe("What a reading's findings come to", () => {
  const text = { en: "a test" }

  it("is nothing while nobody has tested it", () => {
    expect(ReadingVerdicts.of(undefined)).toBeUndefined()
    expect(ReadingVerdicts.of([])).toBeUndefined()
  })

  it("is incompatible as soon as it fails against what is established, whatever else holds", () => {
    expect(ReadingVerdicts.of([{ text, outcome: "holds" }, { text, outcome: "fails", against: "established" }])).toBe("incompatible")
  })

  it("is unsettled when it only fails against a supposition, or a test could not be made", () => {
    expect(ReadingVerdicts.of([{ text, outcome: "holds" }, { text, outcome: "fails", against: "supposed" }])).toBe("unsettled")
    expect(ReadingVerdicts.of([{ text, outcome: "holds" }, { text, outcome: "untested" }])).toBe("unsettled")
  })

  it("takes a failure that does not say against what as a failure against what is known", () => {
    expect(ReadingVerdicts.of([{ text, outcome: "fails" }])).toBe("incompatible")
  })

  it("is compatible when every test holds", () => {
    expect(ReadingVerdicts.of([{ text, outcome: "holds", against: "established" }, { text, outcome: "holds" }])).toBe("compatible")
  })
})
