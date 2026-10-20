import type { FrozenData, FrozenGroup, FrozenGroupName, FrozenTerrainGroupName } from "../engine/model/FrozenData.js"
import { FrozenGroups } from "../engine/model/FrozenData.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { UpperAirAnnexData, UpperAirHeard } from "../engine/traffic/FrozenUpperAirProvider.js"
import { FrozenAnnexes } from "../render3d/terrain/frozen/FrozenAnnexes.js"
import { FrozenPatches, type FrozenPatch } from "../render3d/terrain/frozen/FrozenPatches.js"
import { TerrainFreezer, type FreezerSources } from "../render3d/terrain/frozen/TerrainFreezer.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { MessageStyle } from "./MessageStyle.js"
import { TerrainReach } from "../render3d/terrain/TerrainReach.js"
import type { GeoBounds } from "../render3d/terrain/GeoBounds.js"
import type { InputFileElement, InputFilePick } from "./InputFileElement.js"
import type { SightingFileEditor } from "./SightingFileEditor.js"

/** What the panel needs of the editor holding it. */
export interface FrozenDataHost {
  /** The recording on show, whose `frozen` this panel states and changes. */
  sighting(): Sighting
  /** Where the recording was read from, which its annexes are relative to. */
  documentUrl(): string | undefined
  /** The sources each group is taken from: those the editor has chosen. */
  sources(): FreezerSources
  /** The last answer the scene had live of the air aloft (see SceneElement.upperAirHeard). */
  upperAirHeard(): UpperAirHeard | undefined
  /** Told when `frozen` was changed: an edit of the recording, which the scene is to show. */
  changed(): void
  /** The recording's own file name without `.json`, which its annexes are named after (`x` of `x.relief.zip`). */
  base(): string
  /** Hands a file to the reader to save. */
  download(blob: Blob, fileName: string): void
}

/**
 * The Files group's account of one annex of the data the recording carries frozen (see FrozenData): where it is (a file beside the
 * recording, at an address, or inside the recording itself as a data: URL), when and from whom it was taken, with a button to take it
 * again, a way to give it another file, a button to save it, and its text to edit when it is JSON. And what makes the annexes at export:
 * the groups not taken yet, or taken for other patches of ground than the recording now plays through, are taken then, and every annex
 * kept beside the recording goes into the archive with it.
 */
export class FrozenDataPanel {
  private messages!: SightingEditorMessages
  private busy = false
  /** The annex shown. */
  private shown: FrozenGroupName = "relief"
  /** The text editor of a JSON annex, made the first time one is shown. */
  private editor?: SightingFileEditor
  /** What the editor shows: the annex it was filled from, so that one filled again from the same bytes is not reset under the caret. */
  private editorFor?: string
  private editTimer?: ReturnType<typeof setTimeout>

  constructor(private readonly root: HTMLElement, private readonly host: FrozenDataHost) {
    this.liveInput.addEventListener("change", () => {
      const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
      if (this.liveInput.checked) frozen.live = true
      else delete frozen.live
      this.setFrozen(frozen)
    })
    this.sourceInput.addEventListener("filepick", event => void this.replace(this.shown, (event as CustomEvent<InputFilePick>).detail))
    for (const radio of this.root.querySelectorAll<HTMLInputElement>("input[name=annex-storage]")) {
      radio.addEventListener("change", () => void this.setStorage(this.shown, radio.value === "inline"))
    }
    this.root.querySelector("#frozen-refresh")!.addEventListener("click", () => void this.refresh(this.shown))
    this.root.querySelector("#annex-export")!.addEventListener("click", () => void this.exportAnnex(this.shown))
  }

  private get sourceInput(): InputFileElement {
    return this.root.querySelector<InputFileElement>("#annex-source")!
  }

  private get editorHost(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#annex-editor")!
  }

  private get liveInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>("#frozen-live")!
  }

  private get note(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#frozen-note")!
  }

  localize(messages: SightingEditorMessages): void {
    this.messages = messages
    this.root.title = messages.frozenHint
    const text = (id: string, value: string): void => { this.root.querySelector(`#${id}`)!.textContent = value }
    text("label-frozen-live", messages.frozenLive)
    text("label-annex-source", messages.annexSource)
    text("label-annex-storage", messages.annexStorage)
    text("label-annex-storage-url", messages.annexStorageUrl)
    text("label-annex-storage-inline", messages.annexStorageInline)
    text("frozen-refresh", messages.frozenRefresh)
    text("annex-export", messages.export)
    this.sourceInput.messages = messages
    this.render()
  }

  /** What the Files group's picker says of an annex: the group, and where it is or that it is still to be taken. */
  itemLabel(name: FrozenGroupName): string {
    const frozen = this.host.sighting().frozen
    const group = frozen?.[name]
    const where = frozen?.live ? this.messages.frozenLiveState
      : !group || group.refresh ? this.messages.frozenPending
      : FrozenDataPanel.isInline(group.src) ? this.messages.annexStorageInline
      : group.src
    return `${this.groupName(name)} · ${where}`
  }

  /** Shows the annex of `name`. */
  show(name: FrozenGroupName): void {
    this.shown = name
    this.render()
  }

  /** States the annex shown as it now is. */
  render(): void {
    if (!this.messages) return
    const frozen = this.host.sighting().frozen
    const name = this.shown
    const group = frozen?.[name]
    this.liveInput.checked = frozen?.live === true
    const state = this.root.querySelector<HTMLElement>("#frozen-state")!
    state.textContent = frozen?.live ? this.messages.frozenLiveState
      : group && !group.refresh ? [this.messages.frozenTakenOn.replaceAll("{date}", group.takenOn ?? "?"), group.attribution].filter(Boolean).join(" · ")
      : this.messages.frozenPending
    const refresh = this.root.querySelector<HTMLButtonElement>("#frozen-refresh")!
    refresh.disabled = this.busy || frozen?.live === true
    const held = group !== undefined && !group.refresh
    const inline = held && FrozenDataPanel.isInline(group.src)
    this.sourceInput.url = held && !inline ? this.address(group.src) : ""
    if (inline) this.sourceInput.mode = "file"
    this.sourceInput.disabled = this.busy || frozen?.live === true
    for (const radio of this.root.querySelectorAll<HTMLInputElement>("input[name=annex-storage]")) {
      radio.checked = held && (radio.value === "inline") === inline
      radio.disabled = !held || this.busy
    }
    this.root.querySelector<HTMLButtonElement>("#annex-export")!.disabled = !held || this.busy
    void this.renderEditor(held ? group : undefined)
  }

  /** The text of a JSON annex, to edit: a zip is not text, and an annex not taken yet has none. */
  private async renderEditor(group: FrozenGroup | undefined): Promise<void> {
    const name = this.shown
    const text = group && !FrozenDataPanel.isZip(name) ? await this.textOf(group).catch(() => undefined) : undefined
    if (name !== this.shown) return
    this.editorHost.hidden = text === undefined
    if (text === undefined) return
    const key = `${name}|${group!.src}`
    if (this.editor && this.editorFor === key) return
    this.editorFor = key
    if (this.editor) {
      this.editor.replaceText(text, false)
      return
    }
    const { SightingFileEditor } = await import("./SightingFileEditor.js")
    this.editor ??= new SightingFileEditor(this.editorHost, text, edited => this.edited(edited), this.messages.annexEditorLabel,
      { schema: {}, phrases: this.messages.fileSearchPhrases })
  }

  private async textOf(group: FrozenGroup): Promise<string> {
    return JSON.stringify(JSON.parse(new TextDecoder().decode(await this.bytesOf(group))), null, 1)
  }

  /** An edit of an annex's text: once it reads as JSON, and the author has stopped typing, it is the annex. */
  private edited(text: string): void {
    const name = this.shown
    clearTimeout(this.editTimer)
    this.editTimer = setTimeout(() => {
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        return
      }
      void this.write(name, new TextEncoder().encode(JSON.stringify(json)), { keepEditor: true })
    }, 600)
  }

  /** Gives the annex of `name` the file picked: a file of the author's is held as the annex (where it is kept now), an address becomes where it is. */
  async replace(name: FrozenGroupName, pick: InputFilePick): Promise<void> {
    if (pick.url) {
      const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
      try {
        const described = await FrozenDataPanel.describe(name, await this.bytesAt(pick.url))
        frozen[name] = { src: pick.url, ...described }
        MessageStyle.show(this.note, undefined)
      } catch {
        MessageStyle.show(this.note, this.messages.frozenMissing.replaceAll("{file}", pick.url), "warning")
        return
      }
      this.setFrozen(frozen)
      return
    }
    const { InputFileElement } = await import("./InputFileElement.js")
    await this.write(name, await InputFileElement.bytesOf(pick))
  }

  /** Writes `bytes` as the annex of `name`, kept where it is kept now (inside the recording, or beside it). */
  private async write(name: FrozenGroupName, bytes: Uint8Array, options: { keepEditor?: boolean } = {}): Promise<void> {
    const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
    const group = frozen[name]
    let described: { takenOn?: string; attribution?: string }
    try {
      described = await FrozenDataPanel.describe(name, bytes)
    } catch {
      MessageStyle.show(this.note, this.messages.annexUnreadable, "warning")
      return
    }
    const inline = group !== undefined && FrozenDataPanel.isInline(group.src)
    const src = inline ? FrozenDataPanel.dataUrl(name, bytes) : group?.src ?? FrozenGroups.annexName(this.host.base(), name)
    if (!inline) FrozenAnnexes.hold(this.address(src), bytes)
    frozen[name] = { src, ...described }
    MessageStyle.show(this.note, undefined)
    if (options.keepEditor) this.editorFor = `${name}|${src}`
    this.setFrozen(frozen)
  }

  /** Keeps the annex of `name` inside the recording (a data: URL) or in a file beside it. */
  async setStorage(name: FrozenGroupName, inline: boolean): Promise<void> {
    const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
    const group = frozen[name]
    if (!group || FrozenDataPanel.isInline(group.src) === inline) return
    const bytes = await this.bytesOf(group)
    let src: string
    if (inline) {
      src = FrozenDataPanel.dataUrl(name, bytes)
    } else {
      src = FrozenGroups.annexName(this.host.base(), name)
      FrozenAnnexes.hold(this.address(src), bytes)
    }
    frozen[name] = { ...group, src }
    this.editorFor = `${name}|${src}`
    this.setFrozen(frozen)
  }

  /** Hands the annex of `name` to the reader to save, named as it is beside the recording. */
  async exportAnnex(name: FrozenGroupName): Promise<void> {
    const group = this.host.sighting().frozen?.[name]
    if (!group) return
    const bytes = await this.bytesOf(group)
    const fileName = FrozenDataPanel.isInline(group.src) ? FrozenGroups.annexName(this.host.base(), name) : decodeURIComponent(group.src.split("/").pop() ?? group.src)
    this.host.download(new Blob([bytes as BlobPart], { type: FrozenDataPanel.isZip(name) ? "application/zip" : "application/json" }), fileName)
  }

  /** When and from whom an annex was taken, as it says itself: a zip in its index, a JSON at its top. Throws when it is not one. */
  static async describe(name: FrozenGroupName, bytes: Uint8Array): Promise<{ takenOn?: string; attribution?: string }> {
    let said: { takenOn?: unknown; attribution?: unknown }
    if (FrozenDataPanel.isZip(name)) {
      const { unzipSync } = await import("fflate")
      said = JSON.parse(new TextDecoder().decode(unzipSync(bytes)["index.json"]))
    } else {
      said = JSON.parse(new TextDecoder().decode(bytes))
    }
    if (typeof said !== "object" || said === null) throw new Error("Not an annex")
    return {
      takenOn: typeof said.takenOn === "string" ? said.takenOn : undefined,
      attribution: typeof said.attribution === "string" ? said.attribution : undefined
    }
  }

  private async bytesAt(url: string): Promise<Uint8Array> {
    return FrozenAnnexes.bytes(this.address(url))
  }

  /** Whether an annex is kept inside the recording. */
  static isInline(src: string): boolean {
    return src.startsWith("data:")
  }

  private static isZip(name: FrozenGroupName): boolean {
    return name === "relief" || name === "imagery" || name === "map"
  }

  /** The annex as a data: URL, to be kept inside the recording. */
  static dataUrl(name: FrozenGroupName, bytes: Uint8Array): string {
    let binary = ""
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${FrozenDataPanel.isZip(name) ? "application/zip" : "application/json"};base64,${btoa(binary)}`
  }

  /** Takes `group` again from its source now, in place of what the recording holds. */
  async refresh(name: FrozenGroupName): Promise<void> {
    if (this.busy) return
    const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
    if (name === "upperAir") {
      // The air aloft is what the scene was answered, and the scene asks it again once this is said: it is taken at the next export.
      const group = frozen.upperAir
      if (group) frozen.upperAir = { ...group, refresh: true }
      this.setFrozen(frozen)
      return
    }
    this.busy = true
    this.render()
    try {
      const src = frozen[name]?.src
      const base = (src && !FrozenDataPanel.isInline(src) ? FrozenDataPanel.baseOf(src) : undefined) ?? this.host.base()
      const taken = name === "map" ? await this.takeMap(frozen, this.host.sources(), base)
        : await this.take(name, frozen, TerrainFreezer.plan(this.host.sighting()), this.host.sources(), base)
      if (!taken) MessageStyle.show(this.note, this.messages.frozenFailed.replaceAll("{group}", this.groupName(name)), "warning")
      else MessageStyle.show(this.note, undefined)
    } finally {
      this.busy = false
    }
    this.setFrozen(frozen)
  }

  /** Whether an export has anything to take or to carry: annexes the recording names, ground it stands on, or air it was answered. */
  hasWork(): boolean {
    const sighting = this.host.sighting()
    if (!FrozenGroups.isEmpty(sighting.frozen)) return true
    return this.host.upperAirHeard() !== undefined || TerrainFreezer.plan(sighting).length > 0
  }

  /**
   * Takes what is to be taken before an export (every group of a recording not asked for live, that has no annex yet, was asked to be
   * refreshed, or was taken for other patches than the recording now plays through) and gives the annexes to write beside the recording, by
   * the path the recording names them by. `base` is the recording's own file name without `.json`.
   */
  async prepare(base: string): Promise<Map<string, Uint8Array>> {
    const sighting = this.host.sighting()
    const frozen: FrozenData = { ...(sighting.frozen ?? {}) }
    const files = new Map<string, Uint8Array>()
    this.busy = true
    this.render()
    try {
      const plan = frozen.live ? [] : TerrainFreezer.plan(sighting)
      let sources: FreezerSources | undefined
      for (const name of FrozenGroups.TERRAIN) {
        const group = frozen[name]
        const stale = !frozen.live && plan.length > 0 && (!group || group.refresh || !(await this.fits(name, group, plan)))
        if (stale && await this.take(name, frozen, plan, sources ??= this.host.sources(), base)) {
          await this.keep(frozen[name]!, files)
          continue
        }
        if (group?.refresh) frozen[name] = { ...group, refresh: undefined }
        if (frozen[name]) await this.keep(frozen[name]!, files)
      }
      const map = frozen.map
      const mapStale = !frozen.live && TerrainFreezer.mapGround(sighting) !== undefined && (!map || map.refresh || !(await this.fitsMap(map)))
      if (mapStale && await this.takeMap(frozen, sources ??= this.host.sources(), base)) {
        await this.keep(frozen.map!, files)
      } else if (map) {
        if (map.refresh) frozen.map = { ...map, refresh: undefined }
        await this.keep(frozen.map!, files)
      }
      const heard = this.host.upperAirHeard()
      const air = frozen.upperAir
      if (!frozen.live && heard && (!air || air.refresh)) {
        const takenOn = new Date().toISOString().slice(0, 10)
        const annex: UpperAirAnnexData = { version: 1, takenOn, attribution: heard.answer.source.name, answers: [heard] }
        const bytes = new TextEncoder().encode(JSON.stringify(annex))
        const src = this.place("upperAir", air?.src, base, bytes)
        frozen.upperAir = { src, takenOn, attribution: heard.answer.source.name }
        if (!FrozenDataPanel.isInline(src)) files.set(src, bytes)
      } else if (air) {
        if (air.refresh) frozen.upperAir = { ...air, refresh: undefined }
        await this.keep(frozen.upperAir!, files)
      }
    } finally {
      this.busy = false
    }
    this.setFrozen(frozen)
    return files
  }

  /** Takes one group into `frozen`, its annex held for the scene and the export. Says whether its source answered. */
  private async take(name: FrozenTerrainGroupName, frozen: FrozenData, plan: readonly FrozenPatch[], sources: FreezerSources, base: string): Promise<boolean> {
    const groupName = this.groupName(name)
    const annex = await TerrainFreezer.freeze(name, this.host.sighting(), plan, sources, (done, of) =>
      MessageStyle.show(this.note, this.messages.frozenTaking.replaceAll("{group}", groupName).replaceAll("{done}", String(done)).replaceAll("{of}", String(of))))
    MessageStyle.show(this.note, undefined)
    if (!annex) return false
    frozen[name] = { src: this.place(name, frozen[name]?.src, base, annex.bytes), takenOn: annex.takenOn, attribution: annex.attribution }
    return true
  }

  /** Takes the observer map's photograph into `frozen`, as `take` does a group of the ground. */
  private async takeMap(frozen: FrozenData, sources: FreezerSources, base: string): Promise<boolean> {
    MessageStyle.show(this.note, this.messages.frozenTaking.replaceAll("{group}", this.groupName("map")).replaceAll("{done}", "0").replaceAll("{of}", "1"))
    const annex = await TerrainFreezer.freezeMap(this.host.sighting(), sources.imagery)
    MessageStyle.show(this.note, undefined)
    if (!annex) return false
    frozen.map = { src: this.place("map", frozen.map?.src, base, annex.bytes), takenOn: annex.takenOn, attribution: annex.attribution }
    return true
  }

  /** Whether the map's annex was taken of the ground the map is fitted to now: a moved observer or trace is another box. */
  private async fitsMap(group: FrozenGroup): Promise<boolean> {
    const ground = TerrainFreezer.mapGround(this.host.sighting())
    try {
      const index = JSON.parse(new TextDecoder().decode((await FrozenAnnexes.zip(this.address(group.src)))["index.json"])) as { map?: { bounds: GeoBounds } }
      return ground !== undefined && index.map !== undefined && FrozenPatches.sameBounds(index.map.bounds, ground)
    } catch {
      return false
    }
  }

  /** Whether the annex of a group was taken for the patches the recording plays through now: a moved place or track is another ground. */
  private async fits(name: FrozenGroupName, group: FrozenGroup, plan: readonly FrozenPatch[]): Promise<boolean> {
    try {
      const address = this.address(group.src)
      const patches = group.src.endsWith(".zip")
        ? (JSON.parse(new TextDecoder().decode((await FrozenAnnexes.zip(address))["index.json"])) as { patches: FrozenPatch[] }).patches
        : (await FrozenAnnexes.json<{ patches: FrozenPatch[] }>(address)).patches
      // The vector groups hold no patch too wide to draw them on (see TerrainFreezer.vector).
      const wanted = name === "relief" || name === "imagery" ? plan : plan.filter(patch => patch.radiusM <= TerrainReach.ROADS_MAX_RADIUS_M)
      return FrozenPatches.samePatches(patches.map(({ lat, lng, radiusM }) => ({ lat, lng, radiusM })), wanted)
    } catch {
      return false
    }
  }

  /**
   * Where an annex just taken is kept: where the last one was (inside the recording, or in the file it was in), or else beside the recording
   * under `base`. One kept beside it is held for the scene until it is saved.
   */
  private place(name: FrozenGroupName, previous: string | undefined, base: string, bytes: Uint8Array): string {
    if (previous !== undefined && FrozenDataPanel.isInline(previous)) return FrozenDataPanel.dataUrl(name, bytes)
    const src = previous ?? FrozenGroups.annexName(base, name)
    FrozenAnnexes.hold(this.address(src), bytes)
    return src
  }

  /**
   * An annex the recording keeps beside it, into the export. One kept inside the recording goes with it, and one that cannot be read any
   * more is left out, and said.
   */
  private async keep(group: FrozenGroup, files: Map<string, Uint8Array>): Promise<void> {
    if (FrozenDataPanel.isInline(group.src)) return
    try {
      files.set(group.src, await this.bytesOf(group))
    } catch {
      MessageStyle.show(this.note, this.messages.frozenMissing.replaceAll("{file}", group.src), "warning")
    }
  }

  private bytesOf(group: FrozenGroup): Promise<Uint8Array> {
    return FrozenAnnexes.bytes(this.address(group.src))
  }

  private address(src: string): string {
    return FrozenAnnexes.address(src, this.host.documentUrl())
  }

  private setFrozen(frozen: FrozenData): void {
    for (const name of FrozenGroups.NAMES) if (frozen[name] === undefined) delete frozen[name]
    this.host.sighting().frozen = FrozenGroups.isEmpty(frozen) ? undefined : frozen
    this.render()
    this.host.changed()
  }

  /** Lets go of the text editor: the editor holding it is torn down. */
  destroy(): void {
    clearTimeout(this.editTimer)
    this.editor?.destroy()
    this.editor = undefined
    this.editorFor = undefined
  }

  /** The base name an annex was given (`x` of `x.relief.zip`), for the next annexes to be named alike. */
  private static baseOf(src: string | undefined): string | undefined {
    const match = src?.match(/^(.*)\.[a-z-]+\.(zip|json)$/)
    return match?.[1]
  }

  /** A size as a reader says it: "840 kB", "3.2 MB". */
  static size(bytes: number): string {
    return bytes < 1e6 ? `${Math.max(1, Math.round(bytes / 1e3))} kB` : `${(bytes / 1e6).toFixed(1)} MB`
  }

  private groupName(name: FrozenGroupName): string {
    const names: Record<FrozenGroupName, string> = {
      relief: this.messages.frozenRelief, imagery: this.messages.frozenImagery, roads: this.messages.frozenRoads,
      water: this.messages.frozenWater, railways: this.messages.frozenRailways, upperAir: this.messages.frozenUpperAir, map: this.messages.frozenMap
    }
    return names[name]
  }
}
