import type { Snapshots, SnapshotGroupName, SnapshotTerrainGroupName, HeldGroup } from "../engine/model/Snapshots.js"
import { SnapshotGroups } from "../engine/model/Snapshots.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { UpperAirAnnexData, UpperAirHeard } from "../engine/traffic/SnapshotUpperAirProvider.js"
import { SnapshotAnnexes } from "../render3d/terrain/snapshot/SnapshotAnnexes.js"
import { SnapshotPatches, type SnapshotPatch } from "../render3d/terrain/snapshot/SnapshotPatches.js"
import { TerrainSnapshotTaker, type SnapshotSources } from "../render3d/terrain/snapshot/TerrainSnapshotTaker.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"
import { MessageStyle } from "./MessageStyle.js"
import { TerrainReach } from "../render3d/terrain/TerrainReach.js"
import type { GeoBounds } from "../render3d/terrain/GeoBounds.js"
import type { InputFileElement, InputFilePick } from "./InputFileElement.js"
import type { SightingFileEditor } from "./SightingFileEditor.js"

/** What the panel needs of the editor holding it. */
export interface SnapshotsHost {
  /** The recording on show, whose `snapshots` this panel states and changes. */
  sighting(): Sighting
  /** Where the recording was read from, which its annexes are relative to. */
  documentUrl(): string | undefined
  /** The sources each group is taken from: those the editor has chosen. */
  sources(): SnapshotSources
  /** The last answer the scene had live of the air aloft (see SceneElement.upperAirHeard). */
  upperAirHeard(): UpperAirHeard | undefined
  /** Told when `snapshots` was changed: an edit of the recording, which the scene is to show. */
  changed(): void
  /** The recording's own file name without `.json`, which its annexes are named after (`x` of `x.relief.zip`). */
  base(): string
  /** The recording's own file, absolute: what an annex kept inside it is said to be in. */
  masterUrl(): string
  /** Hands a file to the reader to save. */
  download(blob: Blob, fileName: string): void
}

/**
 * The Files group's account of one annex of the data the recording carries frozen (see Snapshots): where it is (a file beside the
 * recording, at an address, or inside the recording itself as a data: URL), when and from whom it was taken, with a button to take it
 * again, a way to give it another file, a button to save it, and its text to edit when it is JSON. And what makes the annexes at export:
 * the groups not taken yet, or taken for other patches of ground than the recording now plays through, are taken then, and every annex
 * kept beside the recording goes into the archive with it.
 */
export class SnapshotsPanel {
  private messages!: SightingEditorMessages
  private busy = false
  /** The annex shown. */
  private shown: SnapshotGroupName = "relief"
  /** The text editor of a JSON annex, made the first time one is shown. */
  private editor?: SightingFileEditor
  /** What the editor shows: the annex it was filled from, so that one filled again from the same bytes is not reset under the caret. */
  private editorFor?: string
  private editTimer?: ReturnType<typeof setTimeout>

  constructor(private readonly root: HTMLElement, private readonly host: SnapshotsHost) {
    this.sourceInput.addEventListener("filepick", event => void this.replace(this.shown, (event as CustomEvent<InputFilePick>).detail))
    this.root.querySelector("#snapshot-refresh")!.addEventListener("click", () => void this.refresh(this.shown))
    this.root.querySelector("#annex-export")!.addEventListener("click", () => void this.exportAnnex(this.shown))
  }

  private get sourceInput(): InputFileElement {
    return this.root.querySelector<InputFileElement>("#annex-source")!
  }

  private get editorHost(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#annex-editor")!
  }

  private get note(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#snapshot-note")!
  }

  localize(messages: SightingEditorMessages): void {
    this.messages = messages
    this.root.title = messages.snapshotHint
    const text = (id: string, value: string): void => { this.root.querySelector(`#${id}`)!.textContent = value }
    text("label-annex-source", messages.annexSource)
    text("snapshot-refresh", messages.snapshotRefresh)
    text("annex-export", messages.export)
    this.sourceInput.messages = messages
    this.render()
  }

  /** What the Files group's picker says of an annex: the kind of data it holds. Where it is is its source's to say. */
  itemLabel(name: SnapshotGroupName): string {
    return this.groupName(name)
  }

  /** Where an annex is, in words: what a source picker's link to it says in its tooltip. */
  where(name: SnapshotGroupName): string {
    const group = this.annex(name)
    return this.isLive(name) ? this.messages.snapshotLiveState
      : !group || group.refresh ? this.messages.snapshotPending
      : SnapshotsPanel.isInline(group.src) ? this.messages.annexStorageInline
      : group.src
  }

  /** Whether the annex of `name` is kept inside the recording, as the section `frozen.<name>.src` of its text. */
  isInlineGroup(name: SnapshotGroupName): boolean {
    const group = this.annex(name)
    return group !== undefined && !this.isLive(name) && SnapshotsPanel.isInline(group.src)
  }

  /** The annex the recording names for `name`, whether or not it is read now (asked live, or to be taken again). */
  private annex(name: SnapshotGroupName): HeldGroup | undefined {
    const group = this.host.sighting().snapshots?.[name]
    return group?.src !== undefined ? group as HeldGroup : undefined
  }

  /** Whether `name` is asked of its source at every play. */
  isLive(name: SnapshotGroupName): boolean {
    return SnapshotGroups.isLive(this.host.sighting().snapshots, name)
  }

  /**
   * Has `name` asked of its source at every play (`live`), or read from its file: the annex it names, or one taken at the next save. An annex
   * named stays named while the group is asked live, for the file to be chosen again, and is dropped only once the recording is saved so.
   */
  setLive(name: SnapshotGroupName, live: boolean): void {
    if (this.isLive(name) === live) return
    const snapshots: Snapshots = { ...(this.host.sighting().snapshots ?? {}) }
    if (snapshots.live) {
      // Every group was asked live: each but this one stays so, said of itself.
      delete snapshots.live
      for (const other of SnapshotGroups.NAMES) snapshots[other] = { ...(snapshots[other] ?? {}), live: true }
    }
    const group = { ...(snapshots[name] ?? {}) }
    if (live) group.live = true
    else delete group.live
    snapshots[name] = Object.keys(group).length > 0 ? group : undefined
    this.setSnapshots(snapshots)
  }

  /** Shows the annex of `name`. */
  show(name: SnapshotGroupName): void {
    this.shown = name
    this.render()
  }

  /** States the annex shown as it now is. */
  render(): void {
    if (!this.messages) return
    const name = this.shown
    const live = this.isLive(name)
    const group = this.annex(name)
    const state = this.root.querySelector<HTMLElement>("#snapshot-state")!
    state.textContent = live ? this.messages.snapshotLiveState
      : group && !group.refresh ? [this.messages.snapshotTakenOn.replaceAll("{date}", group.takenOn ?? "?"), group.attribution].filter(Boolean).join(" · ")
      : this.messages.snapshotPending
    const refresh = this.root.querySelector<HTMLButtonElement>("#snapshot-refresh")!
    refresh.disabled = this.busy || live
    const held = group !== undefined && !group.refresh && !live
    const inline = held && SnapshotsPanel.isInline(group.src)
    // Kept inside the recording, it is in the recording's own file.
    this.sourceInput.url = !held ? "" : inline ? this.host.masterUrl() : this.address(group.src)
    if (!held) this.sourceInput.mode = "file"
    this.sourceInput.disabled = this.busy || live
    this.root.querySelector<HTMLButtonElement>("#annex-export")!.disabled = group === undefined || this.busy
    // A text of its own; one kept inside the recording is shown in the recording's (see SightingEditorElement.showFileItem).
    void this.renderEditor(held && !inline ? group : undefined)
  }

  /** The text of a JSON annex, to edit: a zip is not text, and an annex not taken yet has none. */
  private async renderEditor(group: HeldGroup | undefined): Promise<void> {
    const name = this.shown
    const text = group && !SnapshotsPanel.isZip(name) ? await this.textOf(group).catch(() => undefined) : undefined
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
    // Fetched at its own pace: the panel may have gone by then, or moved to another annex, and an editor needs a document to stand in.
    if (name !== this.shown || !this.editorHost.isConnected) {
      this.editorFor = undefined
      return
    }
    this.editor ??= new SightingFileEditor(this.editorHost, text, edited => this.edited(edited), this.messages.annexEditorLabel,
      { schema: {}, phrases: this.messages.fileSearchPhrases })
  }

  private async textOf(group: HeldGroup): Promise<string> {
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

  /**
   * Gives the annex of `name` the file picked. A file of the author's is held as the annex, where it is kept now. An address is where it
   * is: the recording's own file keeps it inside the recording; another file is read as the annex when there is one there, and otherwise
   * becomes where the annex is to be written, with what it holds now (Save writes it there, beside the recording).
   */
  async replace(name: SnapshotGroupName, pick: InputFilePick): Promise<void> {
    if (pick.url) {
      if (this.address(pick.url) === new URL(this.host.masterUrl(), location.href).href) {
        await this.setStorage(name, true)
        return
      }
      const snapshots: Snapshots = { ...(this.host.sighting().snapshots ?? {}) }
      let bytes: Uint8Array | undefined
      try {
        bytes = await this.bytesAt(pick.url)
      } catch {
        bytes = undefined
      }
      if (bytes !== undefined) {
        try {
          snapshots[name] = { src: pick.url, ...(await SnapshotsPanel.describe(name, bytes)) }
        } catch {
          MessageStyle.show(this.note, this.messages.annexUnreadable, "warning")
          return
        }
      } else {
        const group = this.annex(name)
        if (!group) {
          MessageStyle.show(this.note, this.messages.snapshotMissing.replaceAll("{file}", pick.url), "warning")
          return
        }
        SnapshotAnnexes.hold(this.address(pick.url), await this.bytesOf(group))
        snapshots[name] = { ...group, src: pick.url }
      }
      MessageStyle.show(this.note, undefined)
      this.setSnapshots(snapshots)
      return
    }
    const { InputFileElement } = await import("./InputFileElement.js")
    await this.write(name, await InputFileElement.bytesOf(pick))
  }

  /** Writes `bytes` as the annex of `name`, kept where it is kept now (inside the recording, or beside it). */
  private async write(name: SnapshotGroupName, bytes: Uint8Array, options: { keepEditor?: boolean } = {}): Promise<void> {
    const snapshots: Snapshots = { ...(this.host.sighting().snapshots ?? {}) }
    const group = this.annex(name)
    let described: { takenOn?: string; attribution?: string }
    try {
      described = await SnapshotsPanel.describe(name, bytes)
    } catch {
      MessageStyle.show(this.note, this.messages.annexUnreadable, "warning")
      return
    }
    const inline = group !== undefined && SnapshotsPanel.isInline(group.src)
    const src = inline ? SnapshotsPanel.dataUrl(name, bytes) : group?.src ?? SnapshotGroups.annexName(this.host.base(), name)
    if (!inline) SnapshotAnnexes.hold(this.address(src), bytes)
    snapshots[name] = { ...(snapshots[name]?.live ? { live: true } : {}), src, ...described }
    MessageStyle.show(this.note, undefined)
    if (options.keepEditor) this.editorFor = `${name}|${src}`
    this.setSnapshots(snapshots)
  }

  /** Keeps the annex of `name` inside the recording (a data: URL) or in a file beside it. */
  async setStorage(name: SnapshotGroupName, inline: boolean): Promise<void> {
    const snapshots: Snapshots = { ...(this.host.sighting().snapshots ?? {}) }
    const group = this.annex(name)
    if (!group || SnapshotsPanel.isInline(group.src) === inline) return
    const bytes = await this.bytesOf(group)
    let src: string
    if (inline) {
      src = SnapshotsPanel.dataUrl(name, bytes)
    } else {
      src = SnapshotGroups.annexName(this.host.base(), name)
      SnapshotAnnexes.hold(this.address(src), bytes)
    }
    snapshots[name] = { ...group, src }
    this.editorFor = `${name}|${src}`
    this.setSnapshots(snapshots)
  }

  /** Hands the annex of `name` to the reader to save, named as it is beside the recording. */
  async exportAnnex(name: SnapshotGroupName): Promise<void> {
    const group = this.annex(name)
    if (!group) return
    const bytes = await this.bytesOf(group)
    const fileName = SnapshotsPanel.isInline(group.src) ? SnapshotGroups.annexName(this.host.base(), name) : decodeURIComponent(group.src.split("/").pop() ?? group.src)
    this.host.download(new Blob([bytes as BlobPart], { type: SnapshotsPanel.isZip(name) ? "application/zip" : "application/json" }), fileName)
  }

  /** When and from whom an annex was taken, as it says itself: a zip in its index, a JSON at its top. Throws when it is not one. */
  static async describe(name: SnapshotGroupName, bytes: Uint8Array): Promise<{ takenOn?: string; attribution?: string }> {
    let said: { takenOn?: unknown; attribution?: unknown }
    if (SnapshotsPanel.isZip(name)) {
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
    return SnapshotAnnexes.bytes(this.address(url))
  }

  /** Whether an annex is kept inside the recording. */
  static isInline(src: string): boolean {
    return src.startsWith("data:")
  }

  private static isZip(name: SnapshotGroupName): boolean {
    return name === "relief" || name === "imagery" || name === "map"
  }

  /** The annex as a data: URL, to be kept inside the recording. */
  static dataUrl(name: SnapshotGroupName, bytes: Uint8Array): string {
    let binary = ""
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${SnapshotsPanel.isZip(name) ? "application/zip" : "application/json"};base64,${btoa(binary)}`
  }

  /** Takes `group` again from its source now, in place of what the recording holds. */
  async refresh(name: SnapshotGroupName): Promise<void> {
    if (this.busy) return
    const snapshots: Snapshots = { ...(this.host.sighting().snapshots ?? {}) }
    if (name === "upperAir") {
      // The air aloft is what the scene was answered, and the scene asks it again once this is said: it is taken at the next export.
      const group = snapshots.upperAir
      if (group) snapshots.upperAir = { ...group, refresh: true }
      this.setSnapshots(snapshots)
      return
    }
    this.busy = true
    this.render()
    try {
      const src = snapshots[name]?.src
      const base = (src && !SnapshotsPanel.isInline(src) ? SnapshotsPanel.baseOf(src) : undefined) ?? this.host.base()
      const taken = name === "map" ? await this.takeMap(snapshots, this.host.sources(), base)
        : await this.take(name, snapshots, TerrainSnapshotTaker.plan(this.host.sighting()), this.host.sources(), base)
      if (!taken) MessageStyle.show(this.note, this.messages.snapshotFailed.replaceAll("{group}", this.groupName(name)), "warning")
      else MessageStyle.show(this.note, undefined)
    } finally {
      this.busy = false
    }
    this.setSnapshots(snapshots)
  }

  /** Whether an export has anything to take or to carry: annexes the recording names, ground it stands on, or air it was answered. */
  hasWork(): boolean {
    const sighting = this.host.sighting()
    if (!SnapshotGroups.isEmpty(sighting.snapshots)) return true
    return this.host.upperAirHeard() !== undefined || TerrainSnapshotTaker.plan(sighting).length > 0
  }

  /**
   * Takes what is to be taken before an export (every group of a recording not asked for live, that has no annex yet, was asked to be
   * refreshed, or was taken for other patches than the recording now plays through) and gives the annexes to write beside the recording, by
   * the path the recording names them by. `base` is the recording's own file name without `.json`.
   */
  async prepare(base: string): Promise<Map<string, Uint8Array>> {
    const sighting = this.host.sighting()
    const snapshots: Snapshots = { ...(sighting.snapshots ?? {}) }
    const files = new Map<string, Uint8Array>()
    this.busy = true
    this.render()
    try {
      const live = (name: SnapshotGroupName) => SnapshotGroups.isLive(snapshots, name)
      const named = (name: SnapshotGroupName) => snapshots[name]?.src !== undefined ? snapshots[name] as HeldGroup : undefined
      // A group asked live keeps no annex once saved so: it would name a file the archive does not hold.
      for (const name of SnapshotGroups.NAMES) if (!snapshots.live && snapshots[name]?.live) snapshots[name] = { live: true }
      const plan = TerrainSnapshotTaker.plan(sighting)
      let sources: SnapshotSources | undefined
      for (const name of SnapshotGroups.TERRAIN) {
        if (live(name)) continue
        const group = named(name)
        const stale = plan.length > 0 && (!group || group.refresh || !(await this.fits(name, group, plan)))
        if (stale && await this.take(name, snapshots, plan, sources ??= this.host.sources(), base)) {
          await this.keep(named(name)!, files)
          continue
        }
        if (group?.refresh) snapshots[name] = { ...group, refresh: undefined }
        if (named(name)) await this.keep(named(name)!, files)
      }
      if (!live("map")) {
        const map = named("map")
        const mapStale = TerrainSnapshotTaker.mapGround(sighting) !== undefined && (!map || map.refresh || !(await this.fitsMap(map)))
        if (mapStale && await this.takeMap(snapshots, sources ??= this.host.sources(), base)) {
          await this.keep(named("map")!, files)
        } else if (map) {
          if (map.refresh) snapshots.map = { ...map, refresh: undefined }
          await this.keep(named("map")!, files)
        }
      }
      const heard = this.host.upperAirHeard()
      const air = named("upperAir")
      if (!live("upperAir") && heard && (!air || air.refresh)) {
        const takenOn = new Date().toISOString().slice(0, 10)
        const annex: UpperAirAnnexData = { version: 1, takenOn, attribution: heard.answer.source.name, answers: [heard] }
        const bytes = new TextEncoder().encode(JSON.stringify(annex))
        const src = this.place("upperAir", air?.src, base, bytes)
        snapshots.upperAir = { src, takenOn, attribution: heard.answer.source.name }
        if (!SnapshotsPanel.isInline(src)) files.set(src, bytes)
      } else if (air && !live("upperAir")) {
        if (air.refresh) snapshots.upperAir = { ...air, refresh: undefined }
        await this.keep(named("upperAir")!, files)
      }
    } finally {
      this.busy = false
    }
    this.setSnapshots(snapshots)
    return files
  }

  /** Takes one group into `snapshots`, its annex held for the scene and the export. Says whether its source answered. */
  private async take(name: SnapshotTerrainGroupName, snapshots: Snapshots, plan: readonly SnapshotPatch[], sources: SnapshotSources, base: string): Promise<boolean> {
    const groupName = this.groupName(name)
    const annex = await TerrainSnapshotTaker.freeze(name, this.host.sighting(), plan, sources, (done, of) =>
      MessageStyle.show(this.note, this.messages.snapshotTaking.replaceAll("{group}", groupName).replaceAll("{done}", String(done)).replaceAll("{of}", String(of))))
    MessageStyle.show(this.note, undefined)
    if (!annex) return false
    snapshots[name] = { src: this.place(name, snapshots[name]?.src, base, annex.bytes), takenOn: annex.takenOn, attribution: annex.attribution }
    return true
  }

  /** Takes the observer map's photograph into `snapshots`, as `take` does a group of the ground. */
  private async takeMap(snapshots: Snapshots, sources: SnapshotSources, base: string): Promise<boolean> {
    MessageStyle.show(this.note, this.messages.snapshotTaking.replaceAll("{group}", this.groupName("map")).replaceAll("{done}", "0").replaceAll("{of}", "1"))
    const annex = await TerrainSnapshotTaker.freezeMap(this.host.sighting(), sources.imagery)
    MessageStyle.show(this.note, undefined)
    if (!annex) return false
    snapshots.map = { src: this.place("map", snapshots.map?.src, base, annex.bytes), takenOn: annex.takenOn, attribution: annex.attribution }
    return true
  }

  /** Whether the map's annex was taken of the ground the map is fitted to now: a moved observer or trace is another box. */
  private async fitsMap(group: HeldGroup): Promise<boolean> {
    const ground = TerrainSnapshotTaker.mapGround(this.host.sighting())
    try {
      const index = JSON.parse(new TextDecoder().decode((await SnapshotAnnexes.zip(this.address(group.src)))["index.json"])) as { map?: { bounds: GeoBounds } }
      return ground !== undefined && index.map !== undefined && SnapshotPatches.sameBounds(index.map.bounds, ground)
    } catch {
      return false
    }
  }

  /** Whether the annex of a group was taken for the patches the recording plays through now: a moved place or track is another ground. */
  private async fits(name: SnapshotGroupName, group: HeldGroup, plan: readonly SnapshotPatch[]): Promise<boolean> {
    try {
      const address = this.address(group.src)
      const patches = group.src.endsWith(".zip")
        ? (JSON.parse(new TextDecoder().decode((await SnapshotAnnexes.zip(address))["index.json"])) as { patches: SnapshotPatch[] }).patches
        : (await SnapshotAnnexes.json<{ patches: SnapshotPatch[] }>(address)).patches
      // The vector groups hold no patch too wide to draw them on (see TerrainSnapshotTaker.vector).
      const wanted = name === "relief" || name === "imagery" ? plan : plan.filter(patch => patch.radiusM <= TerrainReach.ROADS_MAX_RADIUS_M)
      return SnapshotPatches.samePatches(patches.map(({ lat, lng, radiusM }) => ({ lat, lng, radiusM })), wanted)
    } catch {
      return false
    }
  }

  /**
   * Where an annex just taken is kept: where the last one was (inside the recording, or in the file it was in), or else beside the recording
   * under `base`. One kept beside it is held for the scene until it is saved.
   */
  private place(name: SnapshotGroupName, previous: string | undefined, base: string, bytes: Uint8Array): string {
    if (previous !== undefined && SnapshotsPanel.isInline(previous)) return SnapshotsPanel.dataUrl(name, bytes)
    const src = previous ?? SnapshotGroups.annexName(base, name)
    SnapshotAnnexes.hold(this.address(src), bytes)
    return src
  }

  /**
   * An annex the recording keeps beside it, into the export. One kept inside the recording goes with it, and one that cannot be read any
   * more is left out, and said.
   */
  private async keep(group: HeldGroup, files: Map<string, Uint8Array>): Promise<void> {
    if (SnapshotsPanel.isInline(group.src)) return
    try {
      files.set(group.src, await this.bytesOf(group))
    } catch {
      MessageStyle.show(this.note, this.messages.snapshotMissing.replaceAll("{file}", group.src), "warning")
    }
  }

  private bytesOf(group: HeldGroup): Promise<Uint8Array> {
    return SnapshotAnnexes.bytes(this.address(group.src))
  }

  private address(src: string): string {
    return SnapshotAnnexes.address(src, this.host.documentUrl())
  }

  private setSnapshots(snapshots: Snapshots): void {
    for (const name of SnapshotGroups.NAMES) if (snapshots[name] === undefined) delete snapshots[name]
    this.host.sighting().snapshots = SnapshotGroups.isEmpty(snapshots) ? undefined : snapshots
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

  groupName(name: SnapshotGroupName): string {
    const names: Record<SnapshotGroupName, string> = {
      relief: this.messages.snapshotRelief, imagery: this.messages.snapshotImagery, roads: this.messages.snapshotRoads,
      water: this.messages.snapshotWater, railways: this.messages.snapshotRailways, upperAir: this.messages.snapshotUpperAir, map: this.messages.snapshotMap
    }
    return names[name]
  }
}
