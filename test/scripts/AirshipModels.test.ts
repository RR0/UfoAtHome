import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { AirshipTypes } from "../../src/modules/interpretations/airships/AirshipType.js"
import { AirshipFlight } from "../../src/modules/interpretations/airships/AirshipFlight.js"
import { GltfBounds } from "../../scripts/GltfWriter.js"

describe("Airship models", () => {
  const index = JSON.parse(readFileSync("public/models/index.json", "utf8")) as {
    models: { id: string, file: string, sizeM: { widthM: number, lengthM: number, heightM: number }, parameters: { bindings: Record<string, { materials: string[] }> } }[]
  }

  test("each type's model is in the catalogue at the size the type states, every light the flight states and every colour it sets a part of it", () => {
    for (const type of AirshipTypes.ALL) {
      const entry = index.models.find(model => model.id === type.modelId)!
      expect(entry, type.modelId).toBeDefined()
      expect(entry.sizeM).toEqual(type.sizeM)
      const gltf = JSON.parse(readFileSync(`public/models/${entry.file}`, "utf8")) as { materials: { name: string }[] }
      const [x, y, z] = GltfBounds.sizeOf(gltf)
      expect(x, type.id).toBeCloseTo(type.sizeM.widthM, 1)
      expect(y, type.id).toBeCloseTo(type.sizeM.heightM, 1)
      expect(z, type.id).toBeCloseTo(type.sizeM.lengthM, 1)
      const names = gltf.materials.map(material => material.name)
      const [body] = AirshipFlight.bodiesOf({ id: "a", airship: type.id, path: [{ t: 0, eastM: 0, northM: 0, altitudeM: 500 }, { t: 5000, eastM: 50, northM: 0, altitudeM: 500 }], sign: true })
      for (const light of Object.keys(body.track[0].lights ?? {})) expect(names, `${type.id} ${light}`).toContain(light)
      for (const key of Object.keys(body.modelParameters ?? {})) {
        const binding = entry.parameters.bindings[key]
        expect(binding, `${type.id} ${key}`).toBeDefined()
        expect(names.some(name => binding.materials.some(pattern => new RegExp(pattern).test(name))), `${type.id} ${key}`).toBe(true)
      }
    }
  })
})
