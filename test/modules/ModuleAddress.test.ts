import { describe, expect, it } from "vitest"
import { ModuleAddress } from "../../src/modules/ModuleAddress.js"

describe("ModuleAddress", () => {
  it("writes a module on the recording's host relative to the recording, and any other as it is", () => {
    expect(ModuleAddress.of("https://a.example/case/acme/ufoathome-module.json", "https://a.example/case/sighting.json")).toBe("acme/ufoathome-module.json")
    expect(ModuleAddress.of("https://a.example/modules/acme.json", "https://a.example/case/x/sighting.json")).toBe("../../modules/acme.json")
    expect(ModuleAddress.of("https://b.example/acme.json", "https://a.example/case/sighting.json")).toBe("https://b.example/acme.json")
    expect(ModuleAddress.of("https://b.example/acme.json", undefined)).toBe("https://b.example/acme.json")
  })

  it("recognises a module however the recording wrote its address", () => {
    const base = "https://a.example/case/sighting.json"
    expect(ModuleAddress.names(["acme/ufoathome-module.json"], "https://a.example/case/acme/ufoathome-module.json", base)).toBe(true)
    expect(ModuleAddress.names(["https://a.example/case/acme/ufoathome-module.json"], "https://a.example/case/acme/ufoathome-module.json", base)).toBe(true)
    expect(ModuleAddress.names(undefined, "https://a.example/x.json", base)).toBe(false)
  })
})
