import { afterEach, describe, expect, it } from "vitest"
import { InterpretationKinds } from "../../src/modules/interpretations/InterpretationKind.js"
import type { InterpretationKind } from "../../src/modules/interpretations/InterpretationKind.js"
import { InterpretationRegistry } from "../../src/modules/interpretations/interpretationSources.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import { Messages } from "../../src/i18n/MessageCatalog.js"
import { CaseFile } from "../../src/engine/persistence/caseJson.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { BodyJson } from "../../src/engine/interpretation/Interpretation.js"

/** A kite stated as the height its line holds it at, computed into one body: a kind a module brings. */
const KITE: InterpretationKind<{ id: string, lineM: number }> = {
  key: "kites",
  messages: Messages.catalog({ en: async () => ({ title: "Kites" }), fr: async () => ({ title: "Cerfs-volants" }), es: async () => ({ title: "Cometas" }), it: async () => ({ title: "Aquiloni" }) }),
  compute: async () => kite => [{ id: kite.id, model: { id: "sphere" }, track: [{ t: 0, eastM: 0, northM: 0, altitudeAboveGroundM: kite.lineM }] } as unknown as BodyJson]
}

const install = () => ModuleRegistry.install({
  id: "kites", name: "Kites",
  contributes: { interpretations: [{ id: "kites", name: "Kites", credit: "©", creditUrl: "https://example.org", create: () => KITE as InterpretationKind }] }
})

afterEach(() => ModuleRegistry.uninstall("kites"))

describe("kinds of interpretation", () => {
  it("are the built-in flares, lanterns, birds and drones, then a module's", () => {
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns", "birds", "drones", "balloons", "airships"])
    install()
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns", "birds", "drones", "balloons", "airships", "kites"])
  })

  it("compute their bodies beside the interpretation's own once their code has come, and leave one that states none as it is", async () => {
    install()
    const interpretation = { bodies: [{ id: "craft" } as unknown as BodyJson], kites: [{ id: "b", lineM: 30000 }] }
    await InterpretationKinds.load(interpretation, InterpretationRegistry.kinds())
    expect(InterpretationKinds.loaded(interpretation, InterpretationRegistry.kinds())).toBe(true)
    const expanded = InterpretationKinds.expand(interpretation, InterpretationRegistry.kinds())
    expect(expanded.bodies.map(body => body.id)).toEqual(["craft", "b"])
    const plain = { bodies: [] }
    expect(InterpretationKinds.expand(plain, InterpretationRegistry.kinds())).toBe(plain)
  })

  it("say which kind computed each body they add, so that one with no name is called by its kind under the pointer", async () => {
    install()
    const stated = { bodies: [{ id: "craft" } as unknown as BodyJson], kites: [{ id: "b", lineM: 1 }] }
    await InterpretationKinds.load(stated, InterpretationRegistry.kinds())
    const { interpretation, kindOf } = InterpretationKinds.expandWithKinds(stated, InterpretationRegistry.kinds())
    expect(interpretation?.bodies.map(body => body.id)).toEqual(["craft", "b"])
    expect([...kindOf.keys()]).toEqual(["b"])
    expect(kindOf.get("b")?.key).toBe("kites")
    const birds = InterpretationRegistry.kinds().find(kind => kind.key === "birds")!
    expect((await birds.messages.load("fr")).name).toBe("Oiseau")
  })

  it("say which known phenomenon of Poher's matrix each body they compute is an instance of, when its kind says", async () => {
    const kind = { ...KITE, phenomenon: (kite: { lineM: number }) => kite.lineM > 1000 ? "Kite" : undefined } as unknown as InterpretationKind
    const stated = { bodies: [{ id: "craft" } as unknown as BodyJson], kites: [{ id: "high", lineM: 30000 }, { id: "low", lineM: 1 }] }
    await InterpretationKinds.load(stated, [kind])
    const { phenomenonOf } = InterpretationKinds.expandWithKinds(stated, [kind])
    expect([...phenomenonOf]).toEqual([["high", "Kite"]])
  })

  it("built in, are each the column of RR0's matrix that scores them, a drone by its airframe", () => {
    const phenomenon = (key: string, item: unknown) => InterpretationRegistry.kinds().find(kind => kind.key === key)!.phenomenon?.(item)
    expect(phenomenon("flares", {})).toBe("DecoyFlare")
    expect(phenomenon("lanterns", {})).toBe("SkyLantern")
    expect(phenomenon("birds", {})).toBe("Birds")
    expect(phenomenon("drones", { airframe: "quadcopter" })).toBe("ConsumerDrone")
    expect(phenomenon("drones", { airframe: "saucer" })).toBe("ConsumerDrone")
    expect(phenomenon("drones", { airframe: "fixed-wing" })).toBe("MilitaryDrone")
    expect(phenomenon("balloons", { balloon: "weather" })).toBe("WeatherBalloonsOrMongolfieres")
    expect(phenomenon("balloons", { balloon: "hot-air" })).toBe("WeatherBalloonsOrMongolfieres")
    expect(phenomenon("balloons", { balloon: { id: "stratospheric", massKg: 300 } })).toBe("StratosphericBalloons")
    expect(phenomenon("balloons", { balloon: "foil" })).toBe("FoilBalloon")
    expect(phenomenon("balloons", { balloon: "led" })).toBe("LedBalloon")
    expect(phenomenon("airships", { airship: "blimp" })).toBe("Airship")
    expect(phenomenon("airships", { airship: "aerostat" })).toBe("Airship")
  })

  it("load the code of a kind only when an interpretation states one of it, and compute nothing of it before", async () => {
    let loads = 0
    const kind = { ...KITE, compute: async () => { loads++; return (item: { id: string }) => [{ id: item.id, model: { id: "sphere" }, track: [] } as unknown as BodyJson] } } as unknown as InterpretationKind
    await InterpretationKinds.load({ bodies: [] }, [kind])
    expect(loads).toBe(0)
    const stated = { bodies: [], kites: [{ id: "x" }] }
    expect(InterpretationKinds.loaded(stated, [kind])).toBe(false)
    expect(InterpretationKinds.expand(stated, [kind]).bodies).toEqual([])
    await Promise.all([InterpretationKinds.load(stated, [kind]), InterpretationKinds.load(stated, [kind])])
    expect(loads).toBe(1)
    expect(InterpretationKinds.expand(stated, [kind]).bodies.map(body => body.id)).toEqual(["x"])
  })

  it("keep an interpretation that states only what a kind computes", () => {
    install()
    expect(InterpretationKinds.saysNothing({ bodies: [], kites: [{ id: "b", lineM: 1 }] }, InterpretationRegistry.kinds())).toBe(false)
    expect(InterpretationKinds.saysNothing({ bodies: [] }, InterpretationRegistry.kinds())).toBe(true)
  })

  it("are read from a case's interpretation and from a recording, and written back", async () => {
    install()
    const read = await CaseFile.interpretationOf({ eventType: "interpretation", bodies: [], kites: [{ id: "b", lineM: 2 }] } as never, "https://example.org/case.json", async () => ({}))
    expect(read.kites).toEqual([{ id: "b", lineM: 2 }])
    const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 4, timeline: { keyframes: [] }, interpretation: { bodies: [], kites: [{ id: "b", lineM: 2 }] } } as never))))
    expect(written.interpretation.kites).toEqual([{ id: "b", lineM: 2 }])
  })
})
