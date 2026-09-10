/// <reference types="vite/client" />
import demoHtml from "../../index.html?raw"
import { expect, it, vi } from "vitest"
import { setupCloudDemo } from "../../src/demo/clouds.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
it("loads cloud scenarios into the actual weather editor", async () => {
  document.body.innerHTML = demoHtml
  const fixture = { version: 1 }
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => fixture })))
  const editor = { setCloudRendering: vi.fn(), showWeatherEditor: vi.fn(), scrollIntoView: vi.fn(), sightingData: undefined }
  setupCloudDemo(editor as unknown as SightingEditorElement)
  document.getElementById("cloud-load")!.click()
  await vi.waitFor(() => expect(editor.sightingData).toEqual(fixture))
  expect(editor.showWeatherEditor).toHaveBeenCalled()
  expect(document.getElementById("cloud-cover")).toBeNull()
  vi.unstubAllGlobals()
})
