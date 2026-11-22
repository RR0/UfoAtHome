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
    const cases = BalloonTypes.ALL.flatMap(type => type.shapes
      ? Object.keys(type.shapes).map(shape => ({ type: BalloonFlight.typeOf({ balloon: type.id, shape: shape as never }), shape }))
      : [{ type, shape: undefined }])
    for (const { type, shape } of cases) {
      const entry = index.models.find(model => model.id === type.modelId)!
      expect(entry, type.modelId).toBeDefined()
      const gltf = JSON.parse(readFileSync(`public/models/${entry.file}`, "utf8")) as { materials: { name: string }[] }
      const [x, y, z] = GltfBounds.sizeOf(gltf)
      expect(y / x, type.id).toBeCloseTo(type.aspect, 2)
      expect(z / x, type.id).toBeCloseTo(type.depthRatio ?? 1, 2)
      const names = gltf.materials.map(material => material.name)
      for (const light of Object.keys(BalloonFlight.lightsOf(type, true, type.lamp, 1, 9, 1) ?? {})) expect(names, `${type.id} ${light}`).toContain(light)
      const parts = shape === "figure" ? { hair: "#000000", skin: "#000000", bottom: "#000000", shoes: "#000000" } : undefined
      const [body] = BalloonFlight.bodiesOf({ id: "b", balloon: type.id, shape: shape as never, partColors: parts, site: { eastM: 0, northM: 0 }, durationS: 5, lit: true })
      for (const key of Object.keys(body.modelParameters ?? {})) {
        const binding = entry.parameters.bindings[key]
        expect(binding, `${type.id} ${key}`).toBeDefined()
        expect(names.some(name => binding.materials.some(pattern => new RegExp(pattern).test(name))), `${type.id} ${key}`).toBe(true)
      }
    }
  })

  test("an anti-hail balloon's torch is in the catalogue at the size the flight states, its flame the light the flight lights", () => {
    const entry = index.models.find(model => model.id === "ufoathome-balloon-torch")!
    const gltf = JSON.parse(readFileSync(`public/models/${entry.file}`, "utf8")) as { materials: { name: string }[] }
    const [x, y, z] = GltfBounds.sizeOf(gltf)
    expect([x, y, z].map(v => Math.round(v * 10) / 10)).toEqual([BalloonFlight.TORCH_SIZE.widthM, BalloonFlight.TORCH_SIZE.heightM, BalloonFlight.TORCH_SIZE.lengthM])
    expect(gltf.materials.map(material => material.name)).toContain("light-flame")
    expect(entry.parameters.bindings.flameColor).toBeDefined()
  })
})
