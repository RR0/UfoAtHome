import { describe, expect, it } from "vitest"
import type { SceneNames } from "../../src/component/messages/SceneNames.js"
import { SceneNaming } from "../../src/component/messages/SceneNames.js"
import { sceneNames_fr } from "../../src/component/messages/SceneNames_fr.js"
import { sceneNames_es } from "../../src/component/messages/SceneNames_es.js"
import { sceneNames_it } from "../../src/component/messages/SceneNames_it.js"
import { loadSceneNames } from "../../src/component/messages/index.js"
import { BRIGHT_STARS } from "../../src/engine/astronomy/brightStarCatalog.js"
import { BRIGHT_COMETS } from "../../src/engine/astronomy/cometCatalog.js"
import { STELLAR_OUTBURSTS } from "../../src/engine/astronomy/novaCatalog.js"
import { SATELLITE_CLASSES } from "../../src/engine/astronomy/satelliteCatalog.js"
import { METEOR_SHOWERS } from "../../src/engine/astronomy/MeteorShowers.js"
import { INSTRUMENTS } from "../../src/engine/instrument/Instrument.js"
import { LIGHT_RIGS } from "../../src/engine/model/LightRig.js"

const languages: Record<string, SceneNames> = { fr: sceneNames_fr, es: sceneNames_es, it: sceneNames_it }

describe("SceneNames", () => {
  for (const [language, names] of Object.entries(languages)) {
    describe(language, () => {
      /*
       * The catalogues are generated with their English name only, so a catalogue entry this table
       * forgot would silently read in English in the middle of a sentence in another language — the
       * wart the tables exist to avoid. Stars are exempt: most read the same everywhere.
       */
      it("names every entry of the catalogues whose names are translated", () => {
        for (const [table, ids] of [
          ["comets", BRIGHT_COMETS.map(entry => entry.id)],
          ["novae", STELLAR_OUTBURSTS.map(entry => entry.id)],
          ["satelliteClasses", SATELLITE_CLASSES.map(entry => entry.id)],
          ["showers", METEOR_SHOWERS.map(entry => entry.id)],
          ["instruments", INSTRUMENTS.map(entry => entry.id)],
          ["lightRigs", LIGHT_RIGS.map(entry => entry.id)]
        ] as const) {
          for (const id of ids) expect(names[table][id], `${table}.${id}`).toBeTruthy()
        }
      })

      it("names nothing the catalogues do not hold", () => {
        const known = {
          comets: BRIGHT_COMETS.map(entry => entry.id),
          novae: STELLAR_OUTBURSTS.map(entry => entry.id),
          satelliteClasses: SATELLITE_CLASSES.map(entry => entry.id),
          showers: METEOR_SHOWERS.map(entry => entry.id),
          instruments: INSTRUMENTS.map(entry => entry.id),
          lightRigs: LIGHT_RIGS.map(entry => entry.id),
          stars: BRIGHT_STARS.map(star => star.name),
          bodies: ["sun", "moon", "Venus", "Mars", "Jupiter", "Saturn"]
        }
        for (const [table, ids] of Object.entries(known)) {
          for (const key of Object.keys(names[table as keyof typeof known])) expect(ids, `${table}.${key}`).toContain(key)
        }
      })

      it("has sixteen compass points, starting at north", () => {
        expect(names.compassPoints).toHaveLength(16)
        expect(names.compassPoints[0]).toBe("N")
        expect(names.compassPoints[8]).toBe("S")
      })

      it("keeps every placeholder of the tooltips", () => {
        for (const template of [names.starTooltip, names.starTooltipBelow]) {
          expect(template).toContain("{name}")
          expect(template).toContain("{mag}")
          expect(template).toContain("{alt}")
        }
        expect(names.satelliteTooltip).toContain("{height}")
      })
    })
  }

  it("is loaded for the languages that have one, and not for English", async () => {
    expect(await loadSceneNames("en")).toBeUndefined()
    expect(await loadSceneNames("fr")).toBe(sceneNames_fr)
    expect(await loadSceneNames("es")).toBe(sceneNames_es)
    expect(await loadSceneNames("it")).toBe(sceneNames_it)
  })

  describe("SceneNaming", () => {
    it("names in English without names, which is what every reader has until theirs arrive", () => {
      const naming = new SceneNaming()
      expect(naming.star({ name: "Vega" })).toBe("Vega")
      expect(naming.shower(METEOR_SHOWERS.find(shower => shower.id === "perseids")!)).toBe("Perseids")
      expect(naming.towards(315)).toBe("to the NW")
    })

    it("falls back to the catalogue's name where a language writes it the same", () => {
      const naming = new SceneNaming(sceneNames_fr)
      expect(naming.star({ name: "Vega" })).toBe("Véga")
      expect(naming.star({ name: "Sirius" })).toBe("Sirius")
      expect(naming.body("Mars", "Mars")).toBe("Mars")
      expect(naming.body("sun", "Sun")).toBe("Soleil")
    })
  })
})
