import { PlayerIcons } from "./PlayerIcons.js"

/** Whoever can film the recording on show: the 3D scene (see SceneElement.film). */
export interface SceneFilmer {
  /** The film, as a file. Rejects with the signal's reason once aborted. */
  film(onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob>
  /** What the file is called when saved, extension included. */
  fileName(): string
}

/** What the button says (see UfoMessages). */
export interface VideoButtonTexts {
  readonly recordVideo: string
  /** {percent} of the film made: a click stops it. */
  readonly recordingVideo: string
  /** {reason}. */
  readonly videoFailed: string
}

/**
 * The player's button that films the recording and saves the film (see SceneFilmer). While the film is being made it shows how far it
 * has got, and a click on it gives the film up.
 */
export class VideoButton {
  readonly element: HTMLButtonElement
  private texts?: VideoButtonTexts
  private filming?: AbortController
  private share = 0
  private failure?: string

  constructor(private readonly filmer: SceneFilmer) {
    this.element = document.createElement("button")
    this.element.type = "button"
    this.element.id = "video-button"
    this.element.addEventListener("click", event => {
      // Not a click on the picture, which plays.
      event.stopPropagation()
      if (this.filming) this.filming.abort()
      else void this.film()
    })
    this.update()
  }

  set messages(texts: VideoButtonTexts) {
    this.texts = texts
    this.update()
  }

  private async film(): Promise<void> {
    const filming = new AbortController()
    this.filming = filming
    this.share = 0
    this.failure = undefined
    this.update()
    try {
      const film = await this.filmer.film(share => {
        this.share = share
        this.update()
      }, filming.signal)
      this.save(film)
    } catch (error) {
      if (!filming.signal.aborted) {
        this.failure = error instanceof Error ? error.message : String(error)
        console.error(error)
      }
    } finally {
      this.filming = undefined
      this.update()
    }
  }

  private save(film: Blob): void {
    const url = URL.createObjectURL(film)
    const link = document.createElement("a")
    link.href = url
    link.download = this.filmer.fileName()
    link.click()
    // Once the download has taken it.
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  private update(): void {
    const percent = Math.floor(this.share * 100)
    if (this.filming) {
      this.element.textContent = `${percent} %`
      this.element.classList.add("filming")
    } else {
      this.element.innerHTML = PlayerIcons.VIDEO
      this.element.classList.remove("filming")
    }
    const texts = this.texts
    const label = !texts ? "" :
      this.filming ? texts.recordingVideo.replace("{percent}", String(percent)) :
        this.failure ? `${texts.recordVideo}. ${texts.videoFailed.replace("{reason}", this.failure)}` : texts.recordVideo
    this.element.title = label
    this.element.setAttribute("aria-label", label)
  }
}
