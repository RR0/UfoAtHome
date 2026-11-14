import { PlayerIcons } from "./PlayerIcons.js"
import type { FilmOptions } from "./FilmChrome.js"

/** Whoever can film the recording on show: the 3D scene (see SceneElement.film). */
export interface SceneFilmer {
  /** The film, as a file. Rejects with the signal's reason once aborted. */
  film(options: FilmOptions, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob>
  /** What the file is called when saved, extension included. */
  fileName(): string
  /** The picture's size on screen, in device pixels: the film's own size by default, and the proportions of every other. */
  pictureSize(): { width: number, height: number }
  /** Whether the recording has a map of where the witness stood, to lay over the film. */
  hasMap(): boolean
}

/** What the button and its options say (see UfoMessages). */
export interface VideoButtonTexts {
  readonly recordVideo: string
  /** {percent} of the film made: a click stops it. */
  readonly recordingVideo: string
  /** {reason}. */
  readonly videoFailed: string
  readonly videoSize: string
  /** The film at the picture's size on screen: {size}. */
  readonly videoSizeScreen: string
  readonly videoCaption: string
  readonly videoTime: string
  readonly videoMap: string
  readonly videoStart: string
}

/**
 * The player's button that films the recording and saves the film (see SceneFilmer). A click opens what the film is made with (its size,
 * and which of the player's words and map are laid over it); while it is being made, the button shows how far it has got, and a click on
 * it gives the film up.
 */
export class VideoButton {
  /** The heights a film may be made at, besides the picture's own: the usual video formats. */
  static readonly HEIGHTS = [720, 1080, 2160]
  /** Where the reader's last choices are kept, so that the next film is made as the last one was. */
  static readonly STORAGE_KEY = "rr0-video-options"

  readonly element: HTMLButtonElement
  /** The options, laid over the picture by the player (see UfoElement.filmer). */
  readonly panel: HTMLElement
  private readonly sizeLabel: HTMLElement
  private readonly sizeSelect: HTMLSelectElement
  private readonly checks: Record<"caption" | "time" | "map", { input: HTMLInputElement, label: HTMLElement }>
  private readonly startButton: HTMLButtonElement
  private texts?: VideoButtonTexts
  private filming?: AbortController
  private share = 0
  private failure?: string

  constructor(private readonly filmer: SceneFilmer) {
    this.element = document.createElement("button")
    this.element.type = "button"
    this.element.id = "video-button"
    this.element.setAttribute("aria-haspopup", "true")
    this.element.addEventListener("click", event => {
      // Not a click on the picture, which plays.
      event.stopPropagation()
      if (this.filming) this.filming.abort()
      else this.toggleOptions()
    })
    this.panel = document.createElement("div")
    this.panel.className = "video-options"
    this.panel.hidden = true
    // Nothing done in it is a click on the picture.
    for (const type of ["click", "pointerdown", "pointerup", "dblclick"]) this.panel.addEventListener(type, event => event.stopPropagation())
    this.panel.addEventListener("keydown", event => {
      if (event.key !== "Escape") return
      this.panel.hidden = true
      this.element.focus()
    })
    const size = document.createElement("label")
    size.className = "video-size"
    this.sizeLabel = document.createElement("span")
    this.sizeSelect = document.createElement("select")
    size.append(this.sizeLabel, this.sizeSelect)
    this.panel.append(size)
    const check = (): { input: HTMLInputElement, label: HTMLElement } => {
      const row = document.createElement("label")
      const input = document.createElement("input")
      input.type = "checkbox"
      const label = document.createElement("span")
      row.append(input, label)
      this.panel.append(row)
      return { input, label }
    }
    this.checks = { caption: check(), time: check(), map: check() }
    this.startButton = document.createElement("button")
    this.startButton.type = "button"
    this.startButton.className = "video-start"
    this.startButton.addEventListener("click", () => void this.film(this.options()))
    this.panel.append(this.startButton)
    this.restoreOptions()
    this.update()
  }

  set messages(texts: VideoButtonTexts) {
    this.texts = texts
    this.update()
  }

  private toggleOptions(): void {
    const open = this.panel.hidden
    if (open) this.fillSizes()
    this.panel.hidden = !open
    this.element.setAttribute("aria-expanded", String(open))
    if (open) this.startButton.focus()
  }

  /** The sizes on offer, in the picture's proportions as it is now on screen. */
  private fillSizes(): void {
    const picture = this.filmer.pictureSize()
    const aspect = picture.height > 0 ? picture.width / picture.height : 16 / 9
    const chosen = this.sizeSelect.value
    const screen = `${picture.width} × ${picture.height}`
    const options = [{ value: "", text: (this.texts?.videoSizeScreen ?? "").replace("{size}", screen) }]
    for (const height of VideoButton.HEIGHTS) options.push({ value: String(height), text: `${Math.round(height * aspect / 2) * 2} × ${height}` })
    this.sizeSelect.replaceChildren(...options.map(({ value, text }) => {
      const option = document.createElement("option")
      option.value = value
      option.textContent = text
      return option
    }))
    this.sizeSelect.value = options.some(option => option.value === chosen) ? chosen : ""
    const map = this.checks.map
    map.input.disabled = !this.filmer.hasMap()
    map.label.parentElement!.classList.toggle("disabled", map.input.disabled)
  }

  private options(): FilmOptions {
    const height = Number(this.sizeSelect.value)
    return {
      ...(height > 0 ? { height } : {}),
      caption: this.checks.caption.input.checked,
      time: this.checks.time.input.checked,
      map: this.checks.map.input.checked && !this.checks.map.input.disabled
    }
  }

  private restoreOptions(): void {
    let kept: Partial<FilmOptions> = {}
    try {
      kept = JSON.parse(localStorage.getItem(VideoButton.STORAGE_KEY) ?? "{}") as Partial<FilmOptions>
    } catch {
      // No storage here (a private window, a sandboxed frame): the defaults.
    }
    this.checks.caption.input.checked = kept.caption ?? true
    this.checks.time.input.checked = kept.time ?? true
    this.checks.map.input.checked = kept.map ?? false
    this.sizeSelect.replaceChildren(new Option("", kept.height ? String(kept.height) : ""))
    this.sizeSelect.value = kept.height ? String(kept.height) : ""
  }

  private keepOptions(options: FilmOptions): void {
    try {
      localStorage.setItem(VideoButton.STORAGE_KEY, JSON.stringify(options))
    } catch {
      // Not kept: the next film starts from the defaults.
    }
  }

  private async film(options: FilmOptions): Promise<void> {
    this.panel.hidden = true
    this.element.setAttribute("aria-expanded", "false")
    this.keepOptions(options)
    const filming = new AbortController()
    this.filming = filming
    this.share = 0
    this.failure = undefined
    this.update()
    try {
      const film = await this.filmer.film(options, share => {
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
    this.sizeLabel.textContent = texts?.videoSize ?? ""
    this.checks.caption.label.textContent = texts?.videoCaption ?? ""
    this.checks.time.label.textContent = texts?.videoTime ?? ""
    this.checks.map.label.textContent = texts?.videoMap ?? ""
    this.startButton.textContent = texts?.videoStart ?? ""
    if (!this.panel.hidden) this.fillSizes()
  }
}
