import { describe, expect, it, vi } from "vitest"
import { CaseTemplates, LocalCaseTemplate } from "../../../src/engine/questionnaire/CaseTemplate.js"
import { QuestionnaireTemplates } from "../../../src/engine/questionnaire/QuestionnaireTemplate.js"
import form from "../../fixtures/questionnaires/sighting-form.json"

describe("CaseTemplates", () => {
  it("reads a template, its modules and questionnaires named by address made whole, the ids of known questionnaires kept", () => {
    const template = CaseTemplates.check({
      format: 1, id: "org", title: { en: "Org" }, modules: ["module/ufoathome-module.json"],
      starts: [{ id: "qt", title: { en: "QT" }, questionnaires: ["sighting-form", "forms/own.json"], modules: ["https://cdn.example/m.json"] }, { id: "blank", title: { en: "Blank" } }]
    }, "https://org.example/ufo/template.json")
    expect(template.modules).toEqual(["https://org.example/ufo/module/ufoathome-module.json"])
    expect(template.starts[0].questionnaires).toEqual(["sighting-form", "https://org.example/ufo/forms/own.json"])
    expect(template.starts[0].modules).toEqual(["https://cdn.example/m.json"])
    expect(CaseTemplates.step(template.starts[0])).toBe("questionnaire")
    expect(CaseTemplates.step(template.starts[1])).toBe("observation")
  })

  it("refuses what is no template, one offering nothing to start, and a newer format", () => {
    expect(() => CaseTemplates.check({ id: "x" }, "https://a.example/t.json")).toThrow(/not a UFO@home case template/)
    expect(() => CaseTemplates.check({ starts: [] }, "https://a.example/t.json")).toThrow(/no start/)
    expect(() => CaseTemplates.check({ format: 2, starts: [{ id: "a" }] }, "https://a.example/t.json")).toThrow(/newer/)
  })

  it("reads a template once per page, and again after it failed", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ format: 1, id: "t", title: "T", starts: [{ id: "a", title: "A" }] }) })
    await expect(CaseTemplates.load("https://b.example/t.json", fetchImpl as typeof fetch)).rejects.toThrow(/404/)
    expect((await CaseTemplates.load("https://b.example/t.json", fetchImpl as typeof fetch)).id).toBe("t")
    await CaseTemplates.load("https://b.example/t.json", fetchImpl as typeof fetch)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("brings its own questionnaires, which a template read from a file needs, their pictures whole", async () => {
    const own = structuredClone(form)
    own.id = "own-form"
    ;(own.sections[0] as { images?: unknown[] }).images = [{ src: "rose.png", alt: { en: "A rose" } }, { src: "data:image/png;base64,AA==", alt: { en: "Inline" } }]
    const template = CaseTemplates.check({ format: 1, id: "t", title: "T", questionnaires: [own], starts: [{ id: "a", title: "A", questionnaires: ["own-form"] }] },
      "https://org.example/ufo/template.json")
    expect(template.questionnaires![0].sections[0].images!.map(image => image.src)).toEqual(["https://org.example/ufo/rose.png", "data:image/png;base64,AA=="])
    expect(template.origin).toBe("page")
    expect(await QuestionnaireTemplates.load("own-form")).toBeUndefined()
    await CaseTemplates.install(template)
    expect((await QuestionnaireTemplates.load("own-form"))?.title).toEqual({ en: "Sighting form" })
  })

  it("keeps a template the reader gave from a file of theirs, reads it back on another visit, and forgets it", () => {
    const storage = new Map<string, string>()
    const store = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) } as unknown as Storage
    expect(LocalCaseTemplate.read(store)).toBeUndefined()
    const text = JSON.stringify({ format: 1, id: "mine", title: { en: "Mine" }, modules: ["https://cdn.example/m.json"], questionnaires: [form], starts: [{ id: "a", title: "A", questionnaires: ["sighting-form"] }] })
    expect(() => LocalCaseTemplate.keep("{ not json", "bad.json", store)).toThrow()
    expect(LocalCaseTemplate.read(store)).toBeUndefined()
    const kept = LocalCaseTemplate.keep(text, "mine.json", store)
    expect([kept.origin, kept.fileName]).toEqual(["file", "mine.json"])
    const again = LocalCaseTemplate.read(store)!
    expect([again.id, again.origin, again.fileName, again.questionnaires?.[0].id]).toEqual(["mine", "file", "mine.json", "sighting-form"])
    LocalCaseTemplate.forget(store)
    expect(LocalCaseTemplate.read(store)).toBeUndefined()
  })
})
