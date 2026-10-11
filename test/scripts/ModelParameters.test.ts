import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import type { ModelParameters } from "../../src/engine/model/DecorTraits.js"

interface IndexEntry { id: string, kind: string | string[], file: string, parameters?: ModelParameters }

const MODELS = join(__dirname, "..", "..", "public", "models")
const catalogue: IndexEntry[] = JSON.parse(readFileSync(join(MODELS, "index.json"), "utf8")).models

/** The names a glTF binary gives its materials and its parts: what a published setting is bound by. */
function namesOf(file: string): { materials: string[], nodes: string[] } {
  const bytes = readFileSync(join(MODELS, file))
  const length = bytes.readUInt32LE(12)
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString("utf8")) as { materials?: Array<{ name?: string }>, nodes?: Array<{ name?: string }> }
  return { materials: (json.materials ?? []).map(material => material.name ?? ""), nodes: (json.nodes ?? []).map(node => node.name ?? "") }
}

const published = catalogue.filter(entry => entry.parameters?.parameters?.length)

describe("the settings the catalogue's models publish", () => {
  test("there are some, for figures, for trees and for an aircraft", () => {
    const keys = new Set(published.flatMap(entry => entry.parameters!.parameters!.map(spec => spec.key)))
    expect([...keys].sort()).toEqual(["costumeColor", "foliageColor", "gearUp"])
  })

  test.each(published.map(entry => [entry.id, entry] as const))("%s: every setting is bound, and bound to what the file holds", (_id, entry) => {
    const { parameters, bindings } = entry.parameters!
    const names = namesOf(entry.file)
    for (const spec of parameters!) {
      const binding = bindings?.[spec.key]
      expect(binding, `${spec.key} is bound`).toBeDefined()
      // A colour tints materials and a switch shows or hides parts: nothing else makes sense of either.
      if ("materials" in binding!) {
        expect(spec.type).toBe("colour")
        expect(binding.materials.some(source => names.materials.some(name => new RegExp(source).test(name))), `${spec.key}: a material of ${entry.file} matches`).toBe(true)
      } else {
        expect(spec.type).toBe("boolean")
        expect(binding!.nodes.some(source => names.nodes.some(name => new RegExp(source).test(name))), `${spec.key}: a part of ${entry.file} matches`).toBe(true)
      }
      for (const text of [spec.label, spec.hint].filter((value): value is Record<string, string> => typeof value === "object")) {
        expect(Object.keys(text).sort()).toEqual(["en", "es", "fr", "it"])
      }
    }
    expect(Object.keys(bindings ?? {}).sort()).toEqual(parameters!.map(spec => spec.key).sort())
  })

  test("a colour is never published for a model as a whole: it would paint what the model already colours", () => {
    for (const entry of published) {
      for (const binding of Object.values(entry.parameters!.bindings ?? {})) {
        if ("materials" in binding) {
          const all = namesOf(entry.file).materials
          expect(all.filter(name => binding.materials.some(source => new RegExp(source).test(name))).length, entry.id).toBeLessThan(all.length)
        }
      }
    }
  })
})
