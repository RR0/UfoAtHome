import type { FrozenData, RecordingSectionName, SectionAnnex } from "../engine/model/FrozenData.js"
import { FrozenGroups, RecordingSections } from "../engine/model/FrozenData.js"
import type { Sighting } from "../engine/model/Sighting.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { InputFileElement, InputFilePick } from "./InputFileElement.js"
import type { JsonPath } from "./JsonPaths.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { MessageStyle } from "./MessageStyle.js"

/** What the panel needs of the editor holding it. */
export interface SectionFileHost {
  sighting(): Sighting
  /** Where the recording was read from, which its annexes are relative to. */
  documentUrl(): string | undefined
  /** The recording's own file name without `.json` (see FrozenDataHost.base). */
  base(): string
  /** The recording's own file, absolute: where a section kept inside it is. */
  masterUrl(): string
  download(blob: Blob, fileName: string): void
  /** Told when a section or where it is kept changed: an edit of the recording. */
  changed(name: RecordingSectionName): void
}

/**
 * The Files group's account of a part of the recording's own text (see RecordingSections): its weather, its place, its night sky, its
 * scenery. Each is
 * kept inside the recording, as it always was, or in an annex beside it (`frozen.<section>.src`), which the players put back in the
 * recording as they load it (see SightingFetch.recording). A file of the author's, or one at an address, gives the recording that part;
 * Save gives it as an annex, wherever it is kept.
 *
 * Its text is the recording's own: the recording is edited as one text, whichever way its parts are kept.
 */
export class SectionFilePanel {
  private messages!: SightingEditorMessages
  /** The section shown. */
  private shown: RecordingSectionName = "weather"

  constructor(private readonly root: HTMLElement, private readonly host: SectionFileHost) {
    this.sourceInput.addEventListener("filepick", event => void this.take(this.shown, (event as CustomEvent<InputFilePick>).detail))
    this.root.querySelector("#section-annex-export")!.addEventListener("click", () => this.exportAnnex(this.shown))
  }

  private get sourceInput(): InputFileElement {
    return this.root.querySelector<InputFileElement>("#section-annex-source")!
  }

  private get note(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#section-annex-note")!
  }

  localize(messages: SightingEditorMessages): void {
    this.messages = messages
    const text = (id: string, value: string): void => { this.root.querySelector(`#${id}`)!.textContent = value }
    text("label-section-annex-source", messages.annexSource)
    text("section-annex-export", messages.export)
    this.sourceInput.messages = messages
    this.render()
  }

  /** Shows the section `name`. */
  show(name: RecordingSectionName): void {
    this.shown = name
    MessageStyle.show(this.note, undefined)
    this.render()
  }

  /** Where the section is kept: an annex's address, or undefined inside the recording. */
  private srcOf(name: RecordingSectionName): string | undefined {
    return this.host.sighting().frozen?.[name]?.src
  }

  /** What the Files group's picker says of a section: what it is. Where it is is its source's to say. */
  itemLabel(name: RecordingSectionName): string {
    const labels: Record<RecordingSectionName, string> = {
      weather: this.messages.fileItemWeather, place: this.messages.fileItemPlace, lightPollution: this.messages.fileItemLightPollution,
      decor: this.messages.fileItemDecor
    }
    return labels[name]
  }

  /** Where a section is, in words. */
  where(name: RecordingSectionName): string {
    return this.srcOf(name) ?? this.messages.annexStorageInline
  }

  /** Whether a section is kept inside the recording. */
  isInline(name: RecordingSectionName): boolean {
    return this.srcOf(name) === undefined
  }

  /** Where a section kept inside the recording is in its text. */
  static pathOf(name: RecordingSectionName): JsonPath {
    return [RecordingSections.KEYS[name][0]]
  }

  render(): void {
    if (!this.messages) return
    const src = this.srcOf(this.shown)
    // Kept inside the recording, it is in the recording's own file.
    this.sourceInput.url = src ? this.resolve(src) : this.host.masterUrl()
    this.root.querySelector("#section-annex-state")!.textContent = this.state(this.shown)
  }

  /** Where the data of a section came from, as the recording says it. */
  private state(name: RecordingSectionName): string {
    const sighting = this.host.sighting()
    switch (name) {
      case "weather":
        return sighting.weatherSource?.name ?? this.messages.weatherStatedByObserver
      case "place":
        return sighting.event.place?.[0]?.name ?? ""
      case "lightPollution":
        return sighting.provenance.at("lightPollution")?.rationale ?? (sighting.lightPollution === undefined ? "" : String(sighting.lightPollution))
      case "decor":
        return ""
    }
  }

  /** Keeps a section inside the recording, or in an annex beside it named after the recording. Read from the file either way. */
  setStorage(name: RecordingSectionName, inline: boolean): void {
    const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
    if (inline === (frozen[name]?.src === undefined)) return
    const { src: _src, ...rest } = frozen[name] ?? {}
    frozen[name] = inline ? rest : { ...rest, src: RecordingSections.annexName(this.host.base(), name) }
    this.write(name, frozen)
  }

  /** The annex of a section kept beside the recording, as it now stands: what Save writes there. */
  annex(name: RecordingSectionName): { src: string; bytes: Uint8Array } | undefined {
    const src = this.srcOf(name)
    return src === undefined ? undefined : { src, bytes: this.bytesOf(name) }
  }

  /** The section's keys as the recording states them, with what it says of where they came from. */
  private bytesOf(name: RecordingSectionName): Uint8Array {
    const json = toSightingJson(this.host.sighting()) as unknown as Record<string, unknown>
    const annex: SectionAnnex = { version: 1 }
    for (const key of RecordingSections.KEYS[name]) if (json[key] !== undefined) annex[key] = json[key]
    return new TextEncoder().encode(JSON.stringify(annex))
  }

  private resolve(url: string): string {
    return new URL(url, this.host.documentUrl() ?? location.href).href
  }

  private exportAnnex(name: RecordingSectionName): void {
    const src = this.srcOf(name) ?? RecordingSections.annexName(this.host.base(), name)
    this.host.download(new Blob([this.bytesOf(name) as BlobPart], { type: "application/json" }), decodeURIComponent(src.split("/").pop() ?? src))
  }

  /**
   * Gives the recording a section from a file: an annex of it, or any recording whose section it is to take. From an address, it is then
   * kept there: the recording's own file keeps it inside the recording, and another file where there is none yet becomes where it is to be
   * written, as it is now.
   */
  async take(name: RecordingSectionName, pick: InputFilePick): Promise<void> {
    if (pick.url && this.resolve(pick.url) === this.resolve(this.host.masterUrl())) {
      this.setStorage(name, true)
      return
    }
    if (pick.url) {
      try {
        await fetch(this.resolve(pick.url), { method: "HEAD" }).then(response => { if (!response.ok) throw new Error(String(response.status)) })
      } catch {
        // Nothing there yet: the section goes there as it is.
        const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
        frozen[name] = { ...(frozen[name] ?? {}), src: pick.url }
        MessageStyle.show(this.note, undefined)
        this.write(name, frozen)
        return
      }
    }
    let given: Record<string, unknown>
    try {
      const { InputFileElement } = await import("./InputFileElement.js")
      const bytes = await InputFileElement.bytesOf(pick.url ? { url: this.resolve(pick.url) } : pick)
      given = JSON.parse(new TextDecoder().decode(bytes))
      if (typeof given !== "object" || given === null || RecordingSections.KEYS[name].every(key => given[key] === undefined)) throw new Error("Not this section")
    } catch {
      MessageStyle.show(this.note, this.messages.annexUnreadable, "warning")
      return
    }
    // Read as a recording would be, provenance and all, then put into this one.
    const sighting = this.host.sighting()
    const merged = { ...(toSightingJson(sighting) as unknown as Record<string, unknown>) }
    for (const key of RecordingSections.KEYS[name]) merged[key] = given[key]
    const read = fromSightingJson(merged as unknown as SightingRecordingJson)
    SectionFilePanel.copy(name, read, sighting)
    const frozen: FrozenData = { ...(sighting.frozen ?? {}) }
    if (pick.url) frozen[name] = { ...(frozen[name] ?? {}), src: pick.url }
    else frozen[name] = frozen[name] ?? {}
    MessageStyle.show(this.note, undefined)
    this.write(name, frozen)
  }

  private write(name: RecordingSectionName, frozen: FrozenData): void {
    this.host.sighting().frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
    this.render()
    this.host.changed(name)
  }

  /** Puts a section of `from` into `to`, what it says of where it came from with it. */
  static copy(name: RecordingSectionName, from: Sighting, to: Sighting): void {
    switch (name) {
      case "weather":
        to.weatherTrack.clear()
        for (const keyframe of from.weatherTrack.allKeyframes) to.weatherTrack.addKeyframe(keyframe.t, keyframe.weather)
        to.weatherSource = from.weatherSource
        break
      case "place":
        to.event.place = from.event.place
        break
      case "lightPollution":
        to.lightPollution = from.lightPollution
        break
      case "decor":
        to.decor = from.decor
        break
    }
    for (const key of RecordingSections.KEYS[name]) {
      to.provenance.clear(key)
      for (const path of from.provenance.paths()) {
        if (path === key || path.startsWith(`${key}.`)) to.provenance.set(path, from.provenance.at(path)!)
      }
    }
  }
}
