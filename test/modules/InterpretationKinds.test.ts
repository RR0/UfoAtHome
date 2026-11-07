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
  bodiesOf: balloon => [{ id: balloon.id, model: { id: "sphere" }, track: [{ t: 0, eastM: 0, northM: 0, altitudeAboveGroundM: balloon.burstM }] } as unknown as BodyJson]
}

const install = () => ModuleRegistry.install({
  id: "balloons", name: "Balloons",
  contributes: { interpretations: [{ id: "balloons", name: "Weather balloons", credit: "©", creditUrl: "https://example.org", create: () => BALLOON as InterpretationKind }] }
})

afterEach(() => ModuleRegistry.uninstall("balloons"))

describe("kinds of interpretation", () => {
  it("are the built-in flares and lanterns, then a module's", () => {
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns"])
    install()
    expect(InterpretationRegistry.kinds().map(kind => kind.key)).toEqual(["flares", "lanterns", "balloons"])
  })

  it("compute their bodies beside the interpretation's own, and leave one that states none as it is", () => {
    install()
    const interpretation = { bodies: [{ id: "craft" } as unknown as BodyJson], balloons: [{ id: "b", burstM: 30000 }] }
    const expanded = InterpretationKinds.expand(interpretation, InterpretationRegistry.kinds())
    expect(expanded.bodies.map(body => body.id)).toEqual(["craft", "b"])
    const plain = { bodies: [] }
    expect(InterpretationKinds.expand(plain, InterpretationRegistry.kinds())).toBe(plain)
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
    const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 3, timeline: { keyframes: [] }, interpretation: { bodies: [], balloons: [{ id: "b", burstM: 2 }] } } as never))))
    expect(written.interpretation.balloons).toEqual([{ id: "b", burstM: 2 }])
  })
})
