import { afterEach, describe, expect, it } from "vitest"
import { InterpretationKinds } from "../../src/modules/interpretations/InterpretationKind.js"
import type { InterpretationKind } from "../../src/modules/interpretations/InterpretationKind.js"
import { InterpretationRegistry } from "../../src/modules/interpretations/interpretationSources.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import { Messages } from "../../src/i18n/MessageCatalog.js"
import { CaseFile } from "../../src/engine/persistence/caseJson.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { BodyJson } from "../../src/engine/interpretation/Interpretation.js"

/** A weather balloon stated as its burst height, computed into one body. */
const BALLOON: InterpretationKind<{ id: string, burstM: number }> = {
  key: "balloons",
  messages: Messages.catalog({ en: async () => ({ title: "Weather balloons" }), fr: async () => ({ title: "Ballons-sondes" }), es: async () => ({ title: "Globos sonda" }), it: async () => ({ title: "Palloni sonda" }) }),
  compute: async () => balloon => [{ id: balloon.id, model: { id: "sphere" }, track: [{ t: 0, eastM: 0, northM: 0, altitudeAboveGroundM: balloon.burstM }] } as unknown as BodyJson]
}

const install = () => ModuleRegistry.install({
  id: "balloons", name: "Balloons",
  contributes: { interpretations: [{ id: "balloons", name: "Weather balloons", credit: "©", creditUrl: "https://example.org", create: () => BALLOON as InterpretationKind }] }
})

afterEach(() => ModuleRegistry.uninstall("balloons"))

describe("kinds of interpretation", () => {
  it("are the built-in flares, lanterns, birds and drones, then a module's", () => {
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns", "birds", "drones"])
    install()
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns", "birds", "drones", "balloons"])
  })

  it("compute their bodies beside the interpretation's own once their code has come, and leave one that states none as it is", async () => {
    install()
    const interpretation = { bodies: [{ id: "craft" } as unknown as BodyJson], balloons: [{ id: "b", burstM: 30000 }] }
    await InterpretationKinds.load(interpretation, InterpretationRegistry.kinds())
    expect(InterpretationKinds.loaded(interpretation, InterpretationRegistry.kinds())).toBe(true)
    const expanded = InterpretationKinds.expand(interpretation, InterpretationRegistry.kinds())
    expect(expanded.bodies.map(body => body.id)).toEqual(["craft", "b"])
    const plain = { bodies: [] }
    expect(InterpretationKinds.expand(plain, InterpretationRegistry.kinds())).toBe(plain)
  })

  it("say which kind computed each body they add, so that one with no name is called by its kind under the pointer", async () => {
    install()
    const stated = { bodies: [{ id: "craft" } as unknown as BodyJson], balloons: [{ id: "b", burstM: 1 }] }
    await InterpretationKinds.load(stated, InterpretationRegistry.kinds())
    const { interpretation, kindOf } = InterpretationKinds.expandWithKinds(stated, InterpretationRegistry.kinds())
    expect(interpretation?.bodies.map(body => body.id)).toEqual(["craft", "b"])
    expect([...kindOf.keys()]).toEqual(["b"])
    expect(kindOf.get("b")?.key).toBe("balloons")
    const birds = InterpretationRegistry.kinds().find(kind => kind.key === "birds")!
    expect((await birds.messages.load("fr")).name).toBe("Oiseau")
  })

  it("say which known phenomenon of Poher's matrix each body they compute is an instance of, when its kind says", async () => {
    const kind = { ...BALLOON, phenomenon: (balloon: { burstM: number }) => balloon.burstM > 1000 ? "StratosphericBalloons" : undefined } as unknown as InterpretationKind
    const stated = { bodies: [{ id: "craft" } as unknown as BodyJson], balloons: [{ id: "high", burstM: 30000 }, { id: "low", burstM: 1 }] }
    await InterpretationKinds.load(stated, [kind])
    const { phenomenonOf } = InterpretationKinds.expandWithKinds(stated, [kind])
    expect([...phenomenonOf]).toEqual([["high", "StratosphericBalloons"]])
  })

  it("built in, are each the column of RR0's matrix that scores them, a drone by its airframe", () => {
    const phenomenon = (key: string, item: unknown) => InterpretationRegistry.kinds().find(kind => kind.key === key)!.phenomenon?.(item)
    expect(phenomenon("flares", {})).toBe("DecoyFlare")
    expect(phenomenon("lanterns", {})).toBe("SkyLantern")
    expect(phenomenon("birds", {})).toBe("Birds")
    expect(phenomenon("drones", { airframe: "quadcopter" })).toBe("ConsumerDrone")
    expect(phenomenon("drones", { airframe: "saucer" })).toBe("ConsumerDrone")
    expect(phenomenon("drones", { airframe: "fixed-wing" })).toBe("MilitaryDrone")
  })

  it("load the code of a kind only when an interpretation states one of it, and compute nothing of it before", async () => {
    let loads = 0
    const kind = { ...BALLOON, compute: async () => { loads++; return (item: { id: string }) => [{ id: item.id, model: { id: "sphere" }, track: [] } as unknown as BodyJson] } } as unknown as InterpretationKind
    await InterpretationKinds.load({ bodies: [] }, [kind])
    expect(loads).toBe(0)
    const stated = { bodies: [], balloons: [{ id: "x" }] }
    expect(InterpretationKinds.loaded(stated, [kind])).toBe(false)
    expect(InterpretationKinds.expand(stated, [kind]).bodies).toEqual([])
    await Promise.all([InterpretationKinds.load(stated, [kind]), InterpretationKinds.load(stated, [kind])])
    expect(loads).toBe(1)
    expect(InterpretationKinds.expand(stated, [kind]).bodies.map(body => body.id)).toEqual(["x"])
  })

  it("keep an interpretation that states only what a kind computes", () => {
    install()
    expect(InterpretationKinds.saysNothing({ bodies: [], balloons: [{ id: "b", burstM: 1 }] }, InterpretationRegistry.kinds())).toBe(false)
    expect(InterpretationKinds.saysNothing({ bodies: [] }, InterpretationRegistry.kinds())).toBe(true)
  })

  it("are read from a case's interpretation and from a recording, and written back", async () => {
    install()
    const read = await CaseFile.interpretationOf({ eventType: "interpretation", bodies: [], balloons: [{ id: "b", burstM: 2 }] } as never, "https://example.org/case.json", async () => ({}))
    expect(read.balloons).toEqual([{ id: "b", burstM: 2 }])
    const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 4, timeline: { keyframes: [] }, interpretation: { bodies: [], balloons: [{ id: "b", burstM: 2 }] } } as never))))
    expect(written.interpretation.balloons).toEqual([{ id: "b", burstM: 2 }])
  })
})
