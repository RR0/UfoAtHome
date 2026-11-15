import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { BirdSpecies } from "../../src/modules/interpretations/birds/BirdSpecies.js"
import type { BirdBuildId } from "../../src/modules/interpretations/birds/BirdSpecies.js"

/** What scripts/build-birds.ts wrote is what the species stretch, and what the catalogue states. */
describe("bird models", () => {
  const catalogue = JSON.parse(readFileSync("public/models/index.json", "utf8")) as { models: { id: string, sizeM: { widthM: number, lengthM: number, heightM: number } }[] }

  for (const build of Object.keys(BirdSpecies.BUILDS) as BirdBuildId[]) {
    test(`${build}: one wingbeat named "flap", its rest size the catalogue's`, () => {
      const gltf = JSON.parse(readFileSync(`public/models/ufoathome-bird-${build}/bird.gltf`, "utf8")) as { animations: { name: string }[], materials: { name: string }[] }
      expect(gltf.animations.map(animation => animation.name)).toEqual(["flap"])
      expect(gltf.materials.map(material => material.name)).toEqual(["upper", "under", "tip-upper", "tip-under", "head", "neck", "bill"])
      const entry = catalogue.models.find(model => model.id === `ufoathome-bird-${build}`)!
      const rest = BirdSpecies.BUILDS[build].restM
      expect(entry.sizeM.widthM).toBeCloseTo(rest.widthM, 2)
      expect(entry.sizeM.heightM).toBeCloseTo(rest.heightM, 2)
      expect(entry.sizeM.lengthM).toBeCloseTo(rest.lengthM, 2)
    })
  }
})
