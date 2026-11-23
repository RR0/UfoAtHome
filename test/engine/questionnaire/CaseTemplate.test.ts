import { describe, expect, it, vi } from "vitest"
import { readFile } from "node:fs/promises"
import { CaseTemplates } from "../../../src/engine/questionnaire/CaseTemplate.js"

describe("CaseTemplates", () => {
  it("reads a template, its modules and questionnaires named by address made whole, the ids of known questionnaires kept", () => {
    const template = CaseTemplates.check({
      format: 1, id: "org", title: { en: "Org" }, modules: ["module/ufoathome-module.json"],
      starts: [{ id: "qt", title: { en: "QT" }, questionnaires: ["geipan-qt-2025", "forms/own.json"], modules: ["https://cdn.example/m.json"] }, { id: "blank", title: { en: "Blank" } }]
    }, "https://org.example/ufo/template.json")
    expect(template.modules).toEqual(["https://org.example/ufo/module/ufoathome-module.json"])
    expect(template.starts[0].questionnaires).toEqual(["geipan-qt-2025", "https://org.example/ufo/forms/own.json"])
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

  it("ships a template offering GEIPAN's questionnaire or a blank observation, titled in four languages", async () => {
    const json = JSON.parse(await readFile("public/case-templates/testimony.json", "utf8"))
    const template = CaseTemplates.check(json, "https://ufoathome.org/case-templates/testimony.json")
    expect(template.starts.map(start => start.id)).toEqual(["geipan-qt", "blank"])
    for (const start of template.starts) expect(Object.keys(start.title as object).sort()).toEqual(["en", "es", "fr", "it"])
  })
})
