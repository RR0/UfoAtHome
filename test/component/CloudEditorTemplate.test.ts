import { describe, expect, it } from "vitest"
import { CloudEditorTemplate, cloudEditorMessages_en } from "../../src/component/cloudEditorTemplate.js"
import { cloudEditorMessages_fr } from "../../src/component/messages/CloudEditorMessages_fr.js"
import { cloudEditorMessages_es } from "../../src/component/messages/CloudEditorMessages_es.js"
import { cloudEditorMessages_it } from "../../src/component/messages/CloudEditorMessages_it.js"

describe("CloudEditorTemplate", () => {
  function built(): HTMLElement {
    const root = document.createElement("div")
    root.innerHTML = CloudEditorTemplate.html()
    return root
  }

  it("is written in English, the language every reader has until theirs arrives", () => {
    const root = built()
    expect(root.querySelector("#cloud-layer-add")!.textContent).toBe("Add layer")
    expect((root.querySelector("#cloud-wind-speed") as HTMLInputElement).placeholder).toBe("General wind")
  })

  /*
   * Put in place rather than rebuilt: the controls are wired by then, and rebuilding them would
   * drop every listener the editor hung on them.
   */
  it("takes the reader's language in place, keeping its controls", () => {
    const root = built()
    const button = root.querySelector("#cloud-layer-add")!
    const input = root.querySelector("#cloud-base")!
    CloudEditorTemplate.localize(root, cloudEditorMessages_fr)
    expect(root.querySelector("#cloud-layer-add")).toBe(button)
    expect(root.querySelector("#cloud-base")).toBe(input)
    expect(button.textContent).toBe("Ajouter une couche")
    expect(input.closest("label")!.textContent).toBe("Base (m)")
    expect((root.querySelector("#instance-darkness") as HTMLInputElement).placeholder).toBe("Obscurité de la couche")
  })

  it("has every text in every language", () => {
    for (const messages of [cloudEditorMessages_fr, cloudEditorMessages_es, cloudEditorMessages_it]) {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(cloudEditorMessages_en).sort())
      expect(Object.values(messages).every(text => text.trim() !== "")).toBe(true)
    }
  })
})
