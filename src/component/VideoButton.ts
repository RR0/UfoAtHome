import { PlayerIcons } from "./PlayerIcons.js"
import type { FilmOptions } from "./FilmChrome.js"

/** Whoever can film the recording on show: the 3D scene (see SceneElement.film). */
export interface SceneFilmer {
  /** The film, as a file. Rejects with the signal's reason once aborted. */
  film(options: FilmOptions, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob>
  /**
   * The kit for a video generator (see GenerativeKit), made as the film would be, over the same part and at the same size, as a zip file;
   * undefined where it cannot be made.
   */
  generativeKit?(options: FilmOptions, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob>
  /** What the file is called when saved, extension included. */
  fileName(): string
  /** What the kit's file is called when saved, extension included. */
  kitFileName?(): string
  /** The picture's size on screen, in device pixels: the film's own size by default, and the proportions of every other. */
  pictureSize(): { width: number, height: number }
  /** Whether the recording has a map of where the witness stood, to lay over the film. */
  hasMap(): boolean
  /** How long the observation lasts, and where its playback stands, in seconds from its start as the player's counter reads them. */
  durationS(): number
  positionS(): number
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
  /** The button that makes the kit for a video generator instead of the film (see SceneFilmer.generativeKit), and what it is for. */
  readonly videoKit: string
  readonly videoKitHint: string
  /** Where the film starts and ends, and the button that takes where the playback stands, with its hint. */
  readonly videoFrom: string
  readonly videoTo: string
  readonly videoHere: string
  readonly videoHereHint: string
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
  /** Where the film starts and ends: left empty, the observation's start and end. Not kept from one film to the next, which may well be of
   * another recording. */
  private readonly bounds: Record<"from" | "to", { label: HTMLElement, input: HTMLInputElement, here: HTMLButtonElement }>
  private readonly startButton: HTMLButtonElement
  private readonly kitButton: HTMLButtonElement
  private texts?: VideoButtonTexts
  private filming?: AbortController
  private share = 0
  private failure?: string

  /** @param element The button the player already shows (see UfoElement.filmer), which this takes over; a new one otherwise. */
  constructor(private readonly filmer: SceneFilmer, element?: HTMLButtonElement) {
    this.element = element ?? document.createElement("button")
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
      this.closeOptions()
      this.element.focus()
    })
    const size = document.createElement("label")
    size.className = "video-size"
    this.sizeLabel = document.createElement("span")
    this.sizeSelect = document.createElement("select")
    size.append(this.sizeLabel, this.sizeSelect)
    this.panel.append(size)
    const bound = (): { label: HTMLElement, input: HTMLInputElement, here: HTMLButtonElement } => {
      const row = document.createElement("div")
      row.className = "video-bound"
      const field = document.createElement("label")
      const label = document.createElement("span")
      const input = document.createElement("input")
      input.type = "text"
      input.inputMode = "numeric"
      input.size = 7
      input.addEventListener("input", () => this.checkBounds())
      field.append(label, input)
      const here = document.createElement("button")
      here.type = "button"
      here.className = "video-here"
      here.addEventListener("click", () => {
        input.value = VideoButton.formatSeconds(this.filmer.positionS())
        this.checkBounds()
      })
      row.append(field, here)
      this.panel.append(row)
      return { label, input, here }
    }
    this.bounds = { from: bound(), to: bound() }
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
    this.startButton.addEventListener("click", () => void this.film(this.options(), false))
    this.panel.append(this.startButton)
    this.kitButton = document.createElement("button")
    this.kitButton.type = "button"
    this.kitButton.className = "video-kit"
    this.kitButton.hidden = !this.filmer.generativeKit
    this.kitButton.addEventListener("click", () => void this.film(this.options(), true))
    this.panel.append(this.kitButton)
    this.restoreOptions()
    this.update()
  }

  set messages(texts: VideoButtonTexts) {
    this.texts = texts
    this.update()
  }

  /** Opens the options, as the click that loaded this module asked for. */
  open(): void {
    if (this.panel.hidden) this.openOptions()
  }

  private toggleOptions(): void {
    if (this.panel.hidden) this.openOptions()
    else this.closeOptions()
  }

  private openOptions(): void {
    this.fillSizes()
    this.fillBounds()
    this.panel.hidden = false
    this.element.setAttribute("aria-expanded", "true")
    this.startButton.focus()
    // Closed by a press anywhere else, as a menu is. Captured, since the picture and the controls stop what reaches them.
    document.addEventListener("pointerdown", this.closeOnOutside, true)
  }

  private closeOptions(): void {
    this.panel.hidden = true
    this.element.setAttribute("aria-expanded", "false")
    document.removeEventListener("pointerdown", this.closeOnOutside, true)
  }

  /** A press outside the options and their button: inside a shadow root, the event's path says where it really landed. */
  private readonly closeOnOutside = (event: Event): void => {
    const path = event.composedPath()
    if (!path.includes(this.panel) && !path.includes(this.element)) this.closeOptions()
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

  /** What the start and end say before they are set: the observation's own. */
  private fillBounds(): void {
    this.bounds.from.input.placeholder = VideoButton.formatSeconds(0)
    this.bounds.to.input.placeholder = VideoButton.formatSeconds(this.filmer.durationS())
    this.checkBounds()
  }

  /** The start and end as seconds: undefined for one left empty, NaN for one that says no time of the observation. */
  private boundsS(): { fromS?: number, toS?: number } {
    const duration = this.filmer.durationS()
    const read = (text: string): number | undefined => {
      const seconds = VideoButton.secondsOf(text)
      return seconds === undefined || (seconds >= 0 && seconds <= duration + 0.001) ? seconds : NaN
    }
    return { fromS: read(this.bounds.from.input.value), toS: read(this.bounds.to.input.value) }
  }

  /** Marks a start or an end that cannot be filmed, and holds the film back until they can. */
  private checkBounds(): void {
    const { fromS, toS } = this.boundsS()
    const reversed = (fromS ?? 0) >= (toS ?? this.filmer.durationS())
    const fromWrong = Number.isNaN(fromS) || (reversed && fromS !== undefined)
    const toWrong = Number.isNaN(toS) || (reversed && toS !== undefined)
    this.bounds.from.input.setAttribute("aria-invalid", String(fromWrong))
    this.bounds.to.input.setAttribute("aria-invalid", String(toWrong))
    this.startButton.disabled = fromWrong || toWrong || reversed
    this.kitButton.disabled = this.startButton.disabled
  }

  /** Seconds as the player's counter writes them: m:ss, or h:mm:ss past an hour. */
  static formatSeconds(seconds: number): string {
    const whole = Math.max(0, Math.round(seconds))
    const h = Math.floor(whole / 3600)
    const m = Math.floor(whole / 60) % 60
    const s = String(whole % 60).padStart(2, "0")
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
  }

  /** What `text` says in seconds: "1:05", "65", "1:02:03", "12.5"; undefined when it is empty, NaN when it is no duration. */
  static secondsOf(text: string): number | undefined {
    const trimmed = text.trim().replace(",", ".")
    if (trimmed === "") return undefined
    if (!/^\d+(\.\d+)?$|^\d+(:\d{1,2}){1,2}(\.\d+)?$/.test(trimmed)) return NaN
    return trimmed.split(":").reduce((total, part) => total * 60 + Number(part), 0)
  }

  private options(): FilmOptions {
    const height = Number(this.sizeSelect.value)
    const { fromS, toS } = this.boundsS()
    return {
      ...(height > 0 ? { height } : {}),
      ...(fromS !== undefined && !Number.isNaN(fromS) ? { fromS } : {}),
      ...(toS !== undefined && !Number.isNaN(toS) ? { toS } : {}),
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
      // Not where it starts and ends, which is of this recording alone.
      const { fromS: _from, toS: _to, ...kept } = options
      localStorage.setItem(VideoButton.STORAGE_KEY, JSON.stringify(kept))
    } catch {
      // Not kept: the next film starts from the defaults.
    }
  }

  /** Makes the film, or with `kit` the kit for a video generator made from it, and saves it. */
  private async film(options: FilmOptions, kit: boolean): Promise<void> {
    this.closeOptions()
    this.keepOptions(options)
    const filming = new AbortController()
    this.filming = filming
    this.share = 0
    this.failure = undefined
    this.update()
    try {
      const progress = (share: number) => {
        this.share = share
        this.update()
      }
      if (kit && this.filmer.generativeKit) this.save(await this.filmer.generativeKit(options, progress, filming.signal), this.filmer.kitFileName?.() ?? "kit.zip")
      else this.save(await this.filmer.film(options, progress, filming.signal), this.filmer.fileName())
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

  private save(file: Blob, name: string): void {
    const url = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = name
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
    this.kitButton.textContent = texts?.videoKit ?? ""
    this.kitButton.title = texts?.videoKitHint ?? ""
    this.bounds.from.label.textContent = texts?.videoFrom ?? ""
    this.bounds.to.label.textContent = texts?.videoTo ?? ""
    for (const { here } of Object.values(this.bounds)) {
      here.textContent = texts?.videoHere ?? ""
      here.title = texts?.videoHereHint ?? ""
    }
    if (!this.panel.hidden) this.fillSizes()
  }
}
