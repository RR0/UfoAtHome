import { describe, expect, it } from "vitest"
import { InterviewMedia } from "../../src/component/messages/InterviewMedia.js"

describe("InterviewMedia", () => {
  it("names every medium in every language the components speak, and no two the same in one language", () => {
    for (const language of ["en", "fr", "es", "it"] as const) {
      const labels = InterviewMedia.ALL.map(medium => InterviewMedia.label(medium, language))
      expect(labels.every(label => label !== "" && !InterviewMedia.ALL.includes(label as never) || label === "chat"), language).toBe(true)
      expect(new Set(labels).size, language).toBe(InterviewMedia.ALL.length)
    }
  })

  it("says them as people do", () => {
    expect(InterviewMedia.label("in-person", "fr")).toBe("Face à face")
    expect(InterviewMedia.label("video", "fr")).toBe("Visioconférence")
    expect(InterviewMedia.label("phone", "fr")).toBe("Téléphone")
    expect(InterviewMedia.label("email", "fr")).toBe("Mail")
  })

  it("gives back what it does not know, as it is", () => {
    expect(InterviewMedia.label("telepathy", "en")).toBe("telepathy")
  })
})
