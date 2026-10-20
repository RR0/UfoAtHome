import { describe, expect, it } from "vitest"
import { register } from "../../src/component/InputFileElement.js"
import type { InputFileElement, InputFilePick } from "../../src/component/InputFileElement.js"

register()

const make = (attributes: Record<string, string> = {}) => {
  const picks: InputFilePick[] = []
  const element = document.createElement("rr0-input-file") as InputFileElement
  element.setAttribute("name", "import")
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  element.addEventListener("filepick", event => picks.push((event as CustomEvent<InputFilePick>).detail))
  document.body.appendChild(element)
  return { element, picks, ...element.controls }
}

const pickFile = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, "files", { configurable: true, value: [file] })
  input.dispatchEvent(new Event("change"))
}

describe("InputFileElement", () => {
  it("names its controls after its name, and starts on a file", () => {
    const { element, file, url, load, mode } = make()
    expect([file.id, url.id, load.id, mode.id]).toEqual(["import-file", "import-url", "import-url-button", "import-mode"])
    expect(element.mode).toBe("file")
    expect(file.hidden).toBe(false)
    expect(url.hidden).toBe(true)
    expect(load.hidden).toBe(true)
    expect(mode.textContent).toBe("from your disk")
  })

  it("says the file picked, and empties the picker so that the same file picked again is said again", () => {
    const { picks, file } = make()
    const picked = new File(["{}"], "a.json")
    pickFile(file, picked)
    expect(picks).toEqual([{ file: picked }])
  })

  it("switches to an address and back, and says the address once loaded", () => {
    const { element, picks, file, url, load, mode } = make()
    mode.click()
    expect(element.mode).toBe("url")
    expect(file.hidden).toBe(true)
    expect(url.hidden).toBe(false)
    expect(mode.textContent).toBe("from an address")
    url.value = " https://example.org/a.json "
    load.click()
    expect(picks).toEqual([{ url: "https://example.org/a.json" }])
    url.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(picks).toHaveLength(2)
    mode.click()
    expect(element.mode).toBe("file")
  })

  it("says nothing of an empty address", () => {
    const { picks, load } = make({ mode: "url" })
    load.click()
    expect(picks).toEqual([])
  })

  it("shows an address set, telling nobody", () => {
    const { element, picks, url } = make()
    element.url = "https://example.org/b.json"
    expect(element.mode).toBe("url")
    expect(url.value).toBe("https://example.org/b.json")
    expect(picks).toEqual([])
  })

  it("reads an address as it is committed when it has no button, and keeps a file picked for a form to read", () => {
    const { element, picks, file, url, load } = make({ "no-button": "", "keep-file": "" })
    expect(load.hidden).toBe(true)
    const picked = new File(["{}"], "c.json")
    pickFile(file, picked)
    expect(element.value).toEqual({ file: picked })
    element.mode = "url"
    expect(load.hidden).toBe(true)
    url.value = "https://example.org/c.json"
    url.dispatchEvent(new Event("change"))
    expect(picks.at(-1)).toEqual({ url: "https://example.org/c.json" })
    expect(element.value).toEqual({ url: "https://example.org/c.json" })
  })

  it("disables all of itself", () => {
    const { element, file, url, load, mode } = make()
    element.disabled = true
    expect([file, url, load, mode].every(control => control.disabled)).toBe(true)
  })

  it("speaks the language it is given", () => {
    const { element, mode, load } = make()
    element.messages = { inputFileFromFile: "depuis votre disque", inputFileFromUrl: "depuis une adresse", inputFileModeHint: "…", inputFileLoad: "Charger" }
    expect(mode.textContent).toBe("depuis votre disque")
    expect(load.textContent).toBe("Charger")
  })
})
