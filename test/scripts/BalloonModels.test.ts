import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { BalloonTypes } from "../../src/modules/interpretations/balloons/BalloonType.js"
import { BalloonFlight } from "../../src/modules/interpretations/balloons/BalloonFlight.js"
import { GltfBounds } from "../../scripts/GltfWriter.js"

describe("Balloon models", () => {
  const index = JSON.parse(readFileSync("public/models/index.json", "utf8")) as {
    models: { id: string, file: string, parameters: { bindings: Record<string, { materials: string[] }> } }[]
  }

  test("each type's model is in the catalogue, shaped as the type says, every light the flight states and every colour it sets a part of it", () => {
    for (const type of BalloonTypes.ALL) {
      const entry = index.models.find(model => model.id === type.modelId)!
      expect(entry, type.modelId).toBeDefined()
      const gltf = JSON.parse(readFileSync(`public/models/${entry.file}`, "utf8")) as { materials: { name: string }[] }
      const [x, y, z] = GltfBounds.sizeOf(gltf)
      expect(y / x, type.id).toBeCloseTo(type.aspect, 2)
      expect(z / x, type.id).toBeCloseTo(type.depthRatio ?? 1, 2)
      const names = gltf.materials.map(material => material.name)
      for (const light of Object.keys(BalloonFlight.lightsOf(type, true, type.lamp, 1) ?? {})) expect(names, `${type.id} ${light}`).toContain(light)
      const [body] = BalloonFlight.bodiesOf({ id: "b", balloon: type.id, site: { eastM: 0, northM: 0 }, durationS: 5, lit: true })
      for (const key of Object.keys(body.modelParameters ?? {})) {
        const binding = entry.parameters.bindings[key]
        expect(binding, `${type.id} ${key}`).toBeDefined()
        expect(names.some(name => binding.materials.some(pattern => new RegExp(pattern).test(name))), `${type.id} ${key}`).toBe(true)
      }
    }
  })
})
