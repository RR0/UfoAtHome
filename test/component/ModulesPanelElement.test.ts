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

  describe("checking a module", () => {
    const SCRIPTED = "https://acme.example/scripted/ufoathome-module.json"
    const weatherEntry = (windSpeed: number) => ({
      id: "acme-weather", name: "ACME", credit: "© ACME", creditUrl: "https://acme.example",
      create: () => ({
        getWeather: async ({ points }: { points: { time: Date }[] }) => ({
          source: { id: "acme-weather", name: "ACME", url: "https://acme.example/h" },
          samples: points.map(({ time }) => ({
            time, weather: { cloudCover: 0, cloudDarkness: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed, storm: false }
          }))
        })
      })
    })
    const scripted = (contributions: () => object) => {
      const fetching = (async () => new Response(JSON.stringify({ format: 1, id: "scripted", name: "Scripted", script: "module.js" }))) as unknown as typeof fetch
      return new ModuleSession(new ModuleLoader({ fetchImpl: fetching, importImpl: async () => ({ default: contributions }) }), sessionStorage)
    }
    const added = async (modules: ModuleSession): Promise<{ panel: ModulesPanelElement, item: () => HTMLElement }> => {
      const panel = await mount(modules)
      await modules.add(SCRIPTED)
      const item = () => panel.querySelector<HTMLElement>(`.mp-module[data-url="${SCRIPTED}"]`)!
      await until(() => item()?.querySelector(".mp-check") !== null)
      return { panel, item }
    }
    const QUERY = { points: [{ lat: 48.8, lng: 2.2, time: new Date("2026-10-09T18:00:00Z") }] }

    it("says nothing broke the contract, what that does not mean, and that nothing had been asked until then", async () => {
      let asked = 0
      const entry = weatherEntry(4)
      const counting = { ...entry, create: () => { const provider = entry.create(); return { getWeather: (query: { points: { time: Date }[] }) => { asked++; return provider.getWeather(query) } } } }
      const { panel, item } = await added(scripted(() => ({ weather: [counting] })))
      panel.checkContext = () => ({ weatherQuery: QUERY })
      expect(asked).toBe(0)

      item().querySelector<HTMLButtonElement>(".mp-check")!.click()
      await until(() => item().querySelector(".mp-check-result") !== null)

      expect(asked).toBe(1)
      expect(item().querySelector(".mp-check-result")!.textContent).toContain("says nothing of its data being right, or of it being safe")
      expect(item().querySelector(".mp-findings")).toBeNull()
    })

    it("names what breaks it, as an error, with the implementation it is about, and adds no pass", async () => {
      const { panel, item } = await added(scripted(() => ({ weather: [weatherEntry(-1)] })))
      panel.checkContext = () => ({ weatherQuery: QUERY })
      item().querySelector<HTMLButtonElement>(".mp-check")!.click()
      await until(() => item().querySelector(".mp-findings") !== null)

      const line = item().querySelector(".mp-findings li")!
      expect(line.textContent).toBe("acme-weather: A value is missing or out of its bounds: windSpeed = -1.")
      expect(line.classList).toContain("message-error")
      expect(item().querySelector(".mp-check-result")).toBeNull()
    })

    it("says what could not be tried, beside the pass", async () => {
      const { item } = await added(scripted(() => ({ weather: [weatherEntry(4)] })))
      item().querySelector<HTMLButtonElement>(".mp-check")!.click()
      await until(() => item().querySelector(".mp-findings") !== null)

      const line = item().querySelector(".mp-findings li")!
      expect(line.textContent).toContain("The service was not asked")
      expect(line.classList).toContain("message-info")
      expect(item().querySelector(".mp-check-result")).not.toBeNull()
    })

    it("names a misspelt point, which the list of what it brings shows as if it were one", async () => {
      const { item } = await added(scripted(() => ({ wether: [weatherEntry(4)] })))
      item().querySelector<HTMLButtonElement>(".mp-check")!.click()
      await until(() => item().querySelector(".mp-findings") !== null)
      expect(item().querySelector(".mp-findings li")!.textContent).toContain("\"wether\" is not a place a module can add to")
    })

    it("forgets a check when the module is loaded again", async () => {
      const modules = scripted(() => ({ weather: [weatherEntry(-1)] }))
      const { item } = await added(modules)
      item().querySelector<HTMLButtonElement>(".mp-check")!.click()
      await until(() => item().querySelector(".mp-findings") !== null)

      await modules.setEnabled(SCRIPTED, false)
      await modules.setEnabled(SCRIPTED, true)
      await until(() => item().querySelector(".mp-check") !== null)
      expect(item().querySelector(".mp-findings")).toBeNull()
    })

    it("offers no check for a module that is not installed", async () => {
      const modules = scripted(() => ({ weather: [weatherEntry(4)] }))
      const { item } = await added(modules)
      await modules.setEnabled(SCRIPTED, false)
      await until(() => item().querySelector(".mp-check") === null)
      expect(item().querySelector(".mp-check")).toBeNull()
    })
  })
})
