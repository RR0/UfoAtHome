import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { LIGHT_RIGS } from "../../src/engine/model/LightRig.js"
import type { ModelParameters } from "../../src/engine/model/DecorTraits.js"

interface IndexEntry { id: string, kind: string | string[], file: string, parameters?: ModelParameters }

const MODELS = join(__dirname, "..", "..", "public", "models")
const catalogue: IndexEntry[] = JSON.parse(readFileSync(join(MODELS, "index.json"), "utf8")).models

/** The names a glTF binary gives its materials and its parts: what a published setting is bound by. */
function namesOf(file: string): { materials: string[], nodes: string[] } {
  const bytes = readFileSync(join(MODELS, file))
  // A binary glTF carries its description in its first chunk; a text one is that description.
  const text = bytes.subarray(0, 4).toString("latin1") === "glTF" ? bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8") : bytes.toString("utf8")
  const json = JSON.parse(text) as { materials?: Array<{ name?: string }>, nodes?: Array<{ name?: string }> }
  return { materials: (json.materials ?? []).map(material => material.name ?? ""), nodes: (json.nodes ?? []).map(node => node.name ?? "") }
}

const published = catalogue.filter(entry => entry.parameters?.parameters?.length)

describe("the settings the catalogue's models publish", () => {
  test("there are some, for figures, for trees, for an airliner and for the project's own crafts", () => {
    const keys = new Set(published.flatMap(entry => entry.parameters!.parameters!.map(spec => spec.key)))
    expect([...keys].sort()).toEqual(["costumeColor", "foliageColor", "gearUp", "hullColor", "legsUp"])
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

  test("what an object is drawn as when it names no model offers that model's settings: a tree its foliage, an aircraft its gear", async () => {
    const { DecorParameterSets } = await import("../../src/engine/model/DecorParameterSets.js")
    const { decorModelOf } = await import("../../src/engine/model/Decor.js")
    const byId = new Map(catalogue.map(entry => [entry.id, entry]))
    const offered = (kind: "tree" | "aircraft" | "entity" | "observer") => {
      const object = { id: "x", kind }
      return DecorParameterSets.of(object, byId.get(decorModelOf(object)!.id!)?.parameters)?.parameters.map(spec => spec.key)
    }
    expect(offered("tree")).toEqual(["modelParameters.foliageColor"])
    expect(offered("aircraft")).toEqual(["aircraftSound", "modelParameters.gearUp"])
    expect(offered("entity")).toEqual(["modelParameters.costumeColor"])
    expect(offered("observer")).toEqual(["sightingUrl", "modelParameters.costumeColor"])
  })

  test("the noise a model makes in flight is one a machine can make, and a stand-in for a phenomenon is silent", async () => {
    const { AircraftHearing } = await import("../../src/engine/traffic/AircraftHearing.js")
    const withSound = catalogue.filter(entry => entry.parameters?.sound)
    expect(withSound.length).toBeGreaterThan(0)
    for (const entry of withSound) {
      const sound = entry.parameters!.sound!
      if (sound !== "silent") expect(AircraftHearing.noiseOfKind(sound), `${entry.id}: ${sound}`).toBeDefined()
    }
    for (const entry of catalogue.filter(candidate => candidate.id.startsWith("ufoathome-") && candidate.kind === "aircraft")) expect(entry.parameters?.sound, entry.id).toBe("silent")
    for (const id of ["amvlab-a350", "amvlab-a380", "amvlab-b787"]) expect(catalogue.find(entry => entry.id === id)!.parameters!.sound).toBe("airliner-wide")
  })

  test("the lamps a model offers are sets that exist and suit its kind: an airliner's are not a helicopter's", () => {
    const withRigs = catalogue.filter(entry => entry.parameters?.lightRigs)
    expect(withRigs.length).toBeGreaterThan(0)
    for (const entry of withRigs) {
      const kinds = ([] as string[]).concat(entry.kind)
      for (const id of entry.parameters!.lightRigs!) {
        const rig = LIGHT_RIGS.find(candidate => candidate.id === id)
        expect(rig, `${entry.id}: ${id} exists`).toBeDefined()
        expect(kinds.some(kind => (rig!.kinds as string[]).includes(kind)), `${entry.id}: ${id} suits ${kinds}`).toBe(true)
      }
    }
    const airliners = catalogue.filter(entry => /^(amvlab-|poly-google-airliner)/.test(entry.id))
    for (const entry of airliners) expect(entry.parameters?.lightRigs, entry.id).toEqual(["airliner"])
    expect(catalogue.find(entry => entry.id === "kenney-car-kit-sedan")!.parameters!.lightRigs).not.toContain("emergency-beacons")
  })
})

