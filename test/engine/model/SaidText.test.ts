import { describe, expect, it } from "vitest"
import { SaidTexts } from "../../../src/engine/model/SaidText.js"
import { SightingTags } from "../../../src/component/messages/TagNames.js"
import { tagNames_fr } from "../../../src/component/messages/TagNames_fr.js"

/**
 * What a recording says, to a reader who does not speak the language it was written in.
 *
 * The rule these guard is the one the site's addresses already obey: a file is handed from one
 * reader to another, so it has to be able to speak to both — and a missing translation must never
 * turn a stated fact into an unstated one.
 */
describe("SaidTexts", () => {

  describe("reading", () => {
    it("gives a bare string to everybody: it is all there is", () => {
      expect(new SaidTexts(["fr"]).read("Une lueur")).toBe("Une lueur")
      expect(new SaidTexts(["en"]).read("Une lueur")).toBe("Une lueur")
    })

    it("gives each reader their own language", () => {
      const said = { fr: "Zamora entend un rugissement", en: "Zamora hears a roar" }
      expect(new SaidTexts(["fr-FR", "en"]).read(said)).toBe("Zamora entend un rugissement")
      expect(new SaidTexts(["en-US", "fr"]).read(said)).toBe("Zamora hears a roar")
    })

    it("matches a regional tag against a base one, in both directions", () => {
      expect(new SaidTexts(["pt"]).read({ "pt-BR": "Um clarão" })).toBe("Um clarão")
      expect(new SaidTexts(["pt-PT"]).read({ pt: "Um clarão" })).toBe("Um clarão")
    })

    it("falls back to what the recording DOES have rather than to nothing", () => {
      // The whole point: an English reader in front of a French-only account can still read it into
      // a translator, where an empty field would tell them the witness said nothing.
      expect(new SaidTexts(["en"]).read({ fr: "Une lueur orange" })).toBe("Une lueur orange")
    })

    it("treats an empty string as unsaid", () => {
      expect(new SaidTexts(["en"]).read("")).toBeUndefined()
      expect(new SaidTexts(["en"]).read({ en: "", fr: "Une lueur" })).toBe("Une lueur")
    })
  })

  describe("writing", () => {
    const said = new SaidTexts(["fr"])

    it("keeps the languages the author is not writing in", () => {
      expect(said.write({ fr: "Une lueur", en: "A glow" }, "Une lueur orange", "fr"))
        .toEqual({ fr: "Une lueur orange", en: "A glow" })
    })

    it("adds the author's language to a recording that lacked it", () => {
      expect(said.write({ en: "A glow" }, "Une lueur", "fr")).toEqual({ en: "A glow", fr: "Une lueur" })
    })

    it("writes back into the very key it was read from, rather than beside it", () => {
      expect(said.write({ "pt-BR": "Um clarão" }, "Um clarão laranja", "pt"))
        .toEqual({ "pt-BR": "Um clarão laranja" })
    })

    it("replaces a bare string with a bare string: there is nothing else to keep", () => {
      expect(said.write("A glow", "Une lueur", "fr")).toBe("Une lueur")
    })

    it("stays a map when one language is left, because a bare string states none", () => {
      expect(said.write({ fr: "Une lueur", en: "A glow" }, "", "en")).toEqual({ fr: "Une lueur" })
    })

    it("is undefined once nothing is said at all", () => {
      expect(said.write({ fr: "Une lueur" }, "  ", "fr")).toBeUndefined()
      expect(said.write(undefined, "", "fr")).toBeUndefined()
    })
  })
})

/** A tag is stored in English so that two recordings can match on it, and named for the reader. */
describe("SightingTags", () => {
  const tags = new SightingTags(tagNames_fr)

  it("names a stored tag in the reader's language", () => {
    expect(tags.name("landing")).toBe("atterrissage")
  })

  it("shows a tag it has never heard of exactly as stored", () => {
    // Classification codes and case references read the same in every language, and a term nobody
    // has translated yet is still a tag.
    expect(tags.name("RR3")).toBe("RR3")
    expect(tags.name("Blue Book 8729")).toBe("Blue Book 8729")
  })

  it("stores the English term for what an author typed in their own language", () => {
    expect(tags.stored("atterrissage")).toBe("landing")
    expect(tags.stored("Observation Aérienne")).toBe("aerial observation")
  })

  it("stores an unknown term as typed rather than refusing it", () => {
    expect(tags.stored("Blue Book 8729")).toBe("Blue Book 8729")
  })

  it("leaves English alone when there is no dictionary at all", () => {
    expect(new SightingTags({}).name("landing")).toBe("landing")
  })
})
