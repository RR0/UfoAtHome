import { describe, expect, it, vi } from "vitest"
import { VideoButton } from "../../src/component/VideoButton.js"
import type { SceneFilmer, VideoButtonTexts } from "../../src/component/VideoButton.js"

const TEXTS: VideoButtonTexts = {
  recordVideo: "Record",
  recordingVideo: "Filming {percent}",
  videoFailed: "Failed: {reason}"
}

/** A film made by hand: its progress told and its end decided by the test. */
class FakeFilmer implements SceneFilmer {
  progress?: (share: number) => void
  signal?: AbortSignal
  private settle?: { resolve: (film: Blob) => void, reject: (error: unknown) => void }

  film(onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob> {
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

  end(film: Blob): void {
    this.settle?.resolve(film)
  }

  fail(error: Error): void {
    this.settle?.reject(error)
  }
}

describe("VideoButton", () => {
  it("says what it does, then how far the film has got", () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    expect(button.element.title).toBe("Record")
    expect(button.element.querySelector("svg")).not.toBeNull()
    button.element.click()
    filmer.progress!(0.427)
    expect(button.element.textContent).toBe("42 %")
    expect(button.element.classList.contains("filming")).toBe(true)
    expect(button.element.title).toBe("Filming 42")
  })

  it("gives the film up on a second click, and is ready for another", async () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    button.element.click()
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
    button.element.click()
    filmer.end(new Blob(["film"], { type: "video/mp4" }))
    await vi.waitFor(() => expect(clicked).toEqual(["observation.mp4"]))
    click.mockRestore()
  })

  it("says why a film could not be made", async () => {
    const filmer = new FakeFilmer()
    const button = new VideoButton(filmer)
    button.messages = TEXTS
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    button.element.click()
    filmer.fail(new Error("No video codec"))
    await vi.waitFor(() => expect(button.element.title).toBe("Record. Failed: No video codec"))
    error.mockRestore()
  })
})
