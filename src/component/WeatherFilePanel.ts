import type { FrozenData, WeatherAnnex } from "../engine/model/FrozenData.js"
import { FrozenGroups } from "../engine/model/FrozenData.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { WeatherTrackJson } from "../engine/model/WeatherTrack.js"
import { WeatherTrack } from "../engine/model/WeatherTrack.js"
import type { WeatherSource } from "../engine/model/Weather.js"
import type { InputFileElement, InputFilePick } from "./InputFileElement.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { MessageStyle } from "./MessageStyle.js"

/** What the panel needs of the editor holding it. */
export interface WeatherFileHost {
  sighting(): Sighting
  /** Where the recording was read from, which its annex is relative to. */
  documentUrl(): string | undefined
  /** The recording's own file name without `.json` (see FrozenDataHost.base). */
  base(): string
  download(blob: Blob, fileName: string): void
  /** Told when the weather or where it is kept changed: an edit of the recording. */
  changed(): void
}

/**
 * The Files group's account of the recording's weather: kept inside the recording (its `weatherTrack` and `weatherSource`, as it always
 * was), or in an annex beside it (see FrozenData.weather), which the players put back in the recording as they load it (see
 * SightingFetch.recording). A file of the author's, or one at an address, gives the recording its weather; Save gives the annex.
 *
 * Its text is the recording's own, under `weatherTrack`: the recording is edited as one text, whichever way its weather is kept.
 */
export class WeatherFilePanel {
  private messages!: SightingEditorMessages

  constructor(private readonly root: HTMLElement, private readonly host: WeatherFileHost) {
    this.sourceInput.addEventListener("filepick", event => void this.take((event as CustomEvent<InputFilePick>).detail))
    for (const radio of this.root.querySelectorAll<HTMLInputElement>("input[name=weather-storage]")) {
      radio.addEventListener("change", () => this.setStorage(radio.value === "inline"))
    }
    this.root.querySelector("#weather-annex-export")!.addEventListener("click", () => this.exportAnnex())
  }

  private get sourceInput(): InputFileElement {
    return this.root.querySelector<InputFileElement>("#weather-annex-source")!
  }

  private get note(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#weather-annex-note")!
  }

  localize(messages: SightingEditorMessages): void {
    this.messages = messages
    const text = (id: string, value: string): void => { this.root.querySelector(`#${id}`)!.textContent = value }
    text("label-weather-annex-source", messages.annexSource)
    text("label-weather-storage", messages.annexStorage)
    text("label-weather-storage-url", messages.annexStorageUrl)
    text("label-weather-storage-inline", messages.annexStorageInline)
    text("weather-annex-export", messages.export)
    this.sourceInput.messages = messages
    this.render()
  }

  /** Where the weather is kept: an annex's address, or undefined inside the recording. */
  private get src(): string | undefined {
    return this.host.sighting().frozen?.weather?.src
  }

  /** What the Files group's picker says of the weather: where it is. */
  itemLabel(): string {
    return `${this.messages.fileItemWeather} · ${this.src ?? this.messages.annexStorageInline}`
  }

  render(): void {
    if (!this.messages) return
    const src = this.src
    for (const radio of this.root.querySelectorAll<HTMLInputElement>("input[name=weather-storage]")) radio.checked = (radio.value === "inline") === (src === undefined)
    this.sourceInput.url = src ? new URL(src, this.host.documentUrl() ?? location.href).href : ""
    const source = this.host.sighting().weatherSource
    this.root.querySelector("#weather-annex-state")!.textContent = source ? source.name : this.messages.weatherStatedByObserver
  }

  /** Keeps the weather inside the recording, or in an annex beside it named after the recording. */
  setStorage(inline: boolean): void {
    const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
    if (inline === (frozen.weather === undefined)) return
    if (inline) delete frozen.weather
    else frozen.weather = { src: `${this.host.base()}.weather.json` }
    this.host.sighting().frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
    this.render()
    this.host.changed()
  }

  /** The annex of the weather as it now stands: what Save writes beside the recording when the weather is kept there. */
  annex(): { src: string; bytes: Uint8Array } | undefined {
    const src = this.src
    if (src === undefined) return undefined
    const sighting = this.host.sighting()
    const annex: WeatherAnnex = {
      version: 1,
      attribution: sighting.weatherSource?.name,
      weatherTrack: sighting.weatherTrack.toJSON(),
      weatherSource: sighting.weatherSource
    }
    return { src, bytes: new TextEncoder().encode(JSON.stringify(annex)) }
  }

  private exportAnnex(): void {
    const annex = this.annex() ?? { src: `${this.host.base()}.weather.json`, bytes: this.annexBytesInline() }
    this.host.download(new Blob([annex.bytes as BlobPart], { type: "application/json" }), decodeURIComponent(annex.src.split("/").pop() ?? annex.src))
  }

  private annexBytesInline(): Uint8Array {
    const sighting = this.host.sighting()
    const annex: WeatherAnnex = { version: 1, weatherTrack: sighting.weatherTrack.toJSON(), weatherSource: sighting.weatherSource }
    return new TextEncoder().encode(JSON.stringify(annex))
  }

  /**
   * Gives the recording the weather of a file: a weather annex, or any recording whose weather it is to take. From an address, the weather
   * is then kept there.
   */
  async take(pick: InputFilePick): Promise<void> {
    let annex: { weatherTrack?: WeatherTrackJson; weatherSource?: WeatherSource }
    try {
      const { InputFileElement } = await import("./InputFileElement.js")
      const url = pick.url ? new URL(pick.url, this.host.documentUrl() ?? location.href).href : undefined
      const bytes = await InputFileElement.bytesOf(url ? { url } : pick)
      annex = JSON.parse(new TextDecoder().decode(bytes))
      if (typeof annex !== "object" || annex === null || annex.weatherTrack === undefined) throw new Error("No weather")
    } catch {
      MessageStyle.show(this.note, this.messages.annexUnreadable, "warning")
      return
    }
    const sighting = this.host.sighting()
    sighting.weatherTrack.clear()
    for (const keyframe of WeatherTrack.fromJSON(annex.weatherTrack!).allKeyframes) sighting.weatherTrack.addKeyframe(keyframe.t, keyframe.weather)
    sighting.weatherSource = annex.weatherSource
    if (pick.url) sighting.frozen = { ...(sighting.frozen ?? {}), weather: { src: pick.url } }
    MessageStyle.show(this.note, undefined)
    this.render()
    this.host.changed()
  }
}
