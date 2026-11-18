import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { DroneAirframes } from "../../src/modules/interpretations/drones/DroneAirframe.js"

describe("Drone models", () => {
  test("its models are in the catalogue at the size the airframes state, their lights named as the airframes name them", () => {
    const index = JSON.parse(readFileSync("public/models/index.json", "utf8")) as { models: { id: string, file: string, sizeM: object, parameters: { parameters: { key: string }[] } }[] }
    for (const airframe of DroneAirframes.ALL) {
      const entry = index.models.find(model => model.id === airframe.modelId)!
      expect(entry, airframe.modelId).toBeDefined()
      expect(entry.sizeM).toEqual(airframe.sizeM)
      const gltf = JSON.parse(readFileSync(`public/models/${entry.file}`, "utf8")) as { materials: { name: string }[] }
      expect(entry.parameters.parameters.map(parameter => parameter.key)).toEqual(["bodyColor", ...Object.keys(airframe.lights).map(DroneAirframes.colourKeyOf)])
      const names = gltf.materials.map(material => material.name)
      for (const [name, light] of Object.entries(airframe.lights)) {
        light.leds.forEach((_, i) => expect(names).toContain(DroneAirframes.materialOf(name, i, light.leds.length)))
      }
    }
  })
})
