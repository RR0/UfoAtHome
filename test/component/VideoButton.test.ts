import { beforeEach, describe, expect, it, vi } from "vitest"
import { VideoButton } from "../../src/component/VideoButton.js"
import type { SceneFilmer, VideoButtonTexts } from "../../src/component/VideoButton.js"
import type { FilmOptions } from "../../src/component/FilmChrome.js"

const TEXTS: VideoButtonTexts = {
  recordVideo: "Record",
  recordingVideo: "Filming {percent}",
  videoFailed: "Failed: {reason}",
  videoSize: "Size",
  videoSizeScreen: "Screen ({size})",
  videoCaption: "Caption",
  videoTime: "Time",
  videoMap: "Map",
  videoStart: "Start"
}

/** A film made by hand: its progress told and its end decided by the test. */
class FakeFilmer implements SceneFilmer {
  progress?: (share: number) => void
  signal?: AbortSignal
  options?: FilmOptions
  map = false
  private settle?: { resolve: (film: Blob) => void, reject: (error: unknown) => void }

  film(options: FilmOptions, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob> {
    this.options = options
    this.progress = onProgress
    this.signal = signal
    return new Promise((resolve, reject) => {
      this.settle = { resolve, reject }
      signal.addEventListener("abort", () => reject(signal.reason))
    })
  }

  fileName(): string {
    return "observation.mp4"
  }

  pictureSize(): { width: number, height: number } {
    return { width: 2048, height: 1152 }
  }

  hasMap(): boolean {
    return this.map
  }

  end(film: Blob): void {
    this.settle?.resolve(film)
  }

  fail(error: Error): void {
    this.settle?.reject(error)
  }
}

/** Opens the options and starts the film from them, as a reader does. */
function start(button: VideoButton): void {
  button.element.click()
  button.panel.querySelector<HTMLButtonElement>(".video-start")!.click()
}

describe("VideoButton", () => {
  beforeEach(() => localStorage.clear())

  it("opens what the film is made with: the sizes in the picture's proportions, the caption and the time, the map where there is one", () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    expect(button.panel.hidden).toBe(true)
    button.element.click()
    expect(button.panel.hidden).toBe(false)
    const sizes = [...button.panel.querySelectorAll("option")].map(option => option.textContent)
    expect(sizes).toEqual(["Screen (2048 × 1152)", "1280 × 720", "1920 × 1080", "3840 × 2160"])
    const checks = [...button.panel.querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
    expect(checks.map(check => [check.checked, check.disabled])).toEqual([[true, false], [true, false], [false, true]])
  })

  it("closes its options on a press anywhere else, as a menu does, and not on one inside them", () => {
    const button = new VideoButton(new FakeFilmer())
    document.body.append(button.element, button.panel)
    button.element.click()
    button.panel.querySelector("select")!.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    expect(button.panel.hidden).toBe(false)
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    expect(button.panel.hidden).toBe(true)
    button.element.remove()
    button.panel.remove()
  })

  it("makes the film with what was chosen, and makes the next one the same way", () => {
    const filmer = new FakeFilmer()
    filmer.map = true
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    button.element.click()
    const select = button.panel.querySelector("select")!
    select.value = "1080"
    const [caption, , map] = [...button.panel.querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
    caption.checked = false
    map.checked = true
    button.panel.querySelector<HTMLButtonElement>(".video-start")!.click()
    expect(filmer.options).toEqual({ height: 1080, caption: false, time: true, map: true })
    expect(button.panel.hidden).toBe(true)
    const next = new VideoButton(filmer)
    start(next)
    expect(filmer.options).toEqual({ height: 1080, caption: false, time: true, map: true })
  })

  it("says what it does, then how far the film has got", () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    expect(button.element.title).toBe("Record")
    expect(button.element.querySelector("svg")).not.toBeNull()
    start(button)
    filmer.progress!(0.427)
    expect(button.element.textContent).toBe("42 %")
    expect(button.element.classList.contains("filming")).toBe(true)
    expect(button.element.title).toBe("Filming 42")
  })

  it("gives the film up on a second click, and is ready for another", async () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    start(button)
    button.element.click()
    expect(filmer.signal!.aborted).toBe(true)
    await vi.waitFor(() => expect(button.element.classList.contains("filming")).toBe(false))
    // Given up is not failed.
    expect(button.element.title).toBe("Record")
  })

  it("saves the film under the filmer's name", async () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    const clicked: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download)
    })
    URL.createObjectURL ??= () => "blob:film"
    start(button)
    filmer.end(new Blob(["film"], { type: "video/mp4" }))
    await vi.waitFor(() => expect(clicked).toEqual(["observation.mp4"]))
    click.mockRestore()
  })

  it("says why a film could not be made", async () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    start(button)
    filmer.fail(new Error("No video codec"))
    await vi.waitFor(() => expect(button.element.title).toBe("Record. Failed: No video codec"))
    error.mockRestore()
  })
})
