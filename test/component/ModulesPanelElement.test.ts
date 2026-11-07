import { afterEach, describe, expect, it } from "vitest"
import { ModulesPanelElement, register } from "../../src/component/ModulesPanelElement.js"
import { ModuleLoader } from "../../src/modules/ModuleLoader.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import { ModuleSession } from "../../src/modules/ModuleSession.js"

register()

const MANIFEST = "https://acme.example/ufoathome-module.json"
const manifest = {
  format: 1, id: "acme", name: "ACME", credit: "© ACME", script: "module.js",
  contributes: { imagery: [{ id: "acme-ortho", name: "ACME ortho", credit: "©", creditUrl: "https://acme.example", tiles: "t/{z}/{x}/{y}.jpg" }] }
}
const fetchImpl = (async (input: RequestInfo | URL) => String(input) === MANIFEST
  ? new Response(JSON.stringify(manifest)) : new Response("", { status: 404 })) as typeof fetch
const session = () => new ModuleSession(new ModuleLoader({ fetchImpl, importImpl: async () => ({ default: () => ({}) }) }), sessionStorage)

const mount = async (modules: ModuleSession): Promise<ModulesPanelElement> => {
  const panel = document.createElement("rr0-modules-panel") as ModulesPanelElement
  panel.moduleSession = modules
  document.body.append(panel)
  await panel.setLanguage("en")
  return panel
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const until = async (check: () => boolean): Promise<void> => {
  for (let i = 0; i < 400 && !check(); i++) await new Promise(resolve => setTimeout(resolve, 5))
}

afterEach(() => {
  document.body.replaceChildren()
  sessionStorage.clear()
  for (const module of ModuleRegistry.installed()) ModuleRegistry.uninstall(module.id)
})

describe("ModulesPanelElement", () => {
  it("adds a module by its address and says what it brings and that it runs code", async () => {
    const panel = await mount(session())
    const input = panel.querySelector<HTMLInputElement>("#module-url")!
    input.value = MANIFEST
    input.dispatchEvent(new Event("input"))
    panel.querySelector("form")!.requestSubmit()
    await until(() => panel.querySelector(`.mp-module[data-url="${MANIFEST}"] .mp-name`)?.textContent === "ACME")

    const item = panel.querySelector<HTMLElement>(`.mp-module[data-url="${MANIFEST}"]`)!
    expect(item.querySelector(".mp-name")!.textContent).toBe("ACME")
    expect(item.querySelector(".mp-status")!.textContent).toBe("Brings: imagery (1)")
    expect(item.querySelector(".mp-code")!.textContent).toBe("Runs code.")
    expect(panel.querySelector<HTMLInputElement>("#module-url")!.value).toBe("")
  })

  it("lists what the recording names, without running its code, and lets the recording stop naming it", async () => {
    const modules = session()
    const panel = await mount(modules)
    panel.base = "https://acme.example/case/sighting.json"
    panel.recordingModules = ["../ufoathome-module.json"]
    await modules.require(panel.recordingModules, "https://acme.example/case/sighting.json")
    await settle()

    const item = panel.querySelector<HTMLElement>(`.mp-module[data-url="${MANIFEST}"]`)!
    expect(item.querySelector(".mp-code")!.textContent).toBe("Its code was not run: add it to your modules to run it.")
    expect(item.querySelector(".mp-remove")!.textContent).toBe("Add to my modules")
    const named = item.querySelector<HTMLInputElement>(".mp-named")!
    expect(named.checked).toBe(true)

    let told = 0
    panel.addEventListener("recordingmoduleschange", () => told++)
    named.checked = false
    named.dispatchEvent(new Event("change"))
    expect(told).toBe(1)
    expect(panel.recordingModules).toEqual([])
  })

  it("shows why a file is not a list of modules", async () => {
    const panel = await mount(session())
    const input = panel.querySelector<HTMLInputElement>("#modules-import")!
    Object.defineProperty(input, "files", { value: [new Blob(["{}"])] })
    input.dispatchEvent(new Event("change"))
    await settle(); await settle()

    expect(panel.querySelector("#modules-note")!.textContent).toMatch(/^This file is not a list of modules/)
  })
})
