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
}

/**
 * The File group's account of the data the recording carries frozen (see FrozenData): whether it is frozen at all, and for each group when it
 * was taken, with a button to take it again. And what makes the annexes at export: the groups not taken yet, or taken for other patches
 * of ground than the recording now plays through, are taken then, and every annex goes into the archive beside the recording.
 */
export class FrozenDataPanel {
  private messages!: SightingEditorMessages
  private busy = false

  constructor(private readonly root: HTMLElement, private readonly host: FrozenDataHost) {
    this.liveInput.addEventListener("change", () => {
      const frozen: FrozenData = { ...(this.host.sighting().frozen ?? {}) }
      if (this.liveInput.checked) frozen.live = true
      else delete frozen.live
      this.setFrozen(frozen)
    })
  }

  private get liveInput(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>("#frozen-live")!
  }

  private get note(): HTMLElement {
    return this.root.querySelector<HTMLElement>("#frozen-note")!
  }

  localize(messages: SightingEditorMessages): void {
    this.messages = messages
    this.root.querySelector("#label-frozen")!.textContent = messages.frozenTitle
    this.root.title = messages.frozenHint
    this.root.querySelector("#label-frozen-live")!.textContent = messages.frozenLive
    this.render()
  }

  /** States the recording's frozen data as it now is. */
  render(): void {
    if (!this.messages) return
    const frozen = this.host.sighting().frozen
    this.liveInput.checked = frozen?.live === true
    const list = this.root.querySelector("#frozen-groups")!
    list.replaceChildren(...FrozenGroups.NAMES.map(name => {
      const item = document.createElement("li")
      const label = document.createElement("span")
      label.className = "frozen-group-name"
      label.textContent = this.groupName(name)
      const state = document.createElement("span")
      state.className = "frozen-group-state"
      const group = frozen?.[name]
      state.textContent = frozen?.live ? this.messages.frozenLiveState
        : group && !group.refresh ? this.messages.frozenTakenOn.replaceAll("{date}", group.takenOn ?? "?")
        : this.messages.frozenPending
      if (group?.attribution) state.title = group.attribution
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = this.messages.frozenRefresh
      button.disabled = this.busy || frozen?.live === true
      button.addEventListener("click", () => void this.refresh(name))
      item.append(label, document.createTextNode(" "), state, document.createTextNode(" "), button)
      return item
    }))
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
      const base = FrozenDataPanel.baseOf(frozen[name]?.src) ?? this.defaultBase()
      const taken = await this.take(name, frozen, TerrainFreezer.plan(this.host.sighting()), this.host.sources(), base)
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
          files.set(frozen[name]!.src, await this.bytesOf(frozen[name]!))
          continue
        }
        if (group?.refresh) frozen[name] = { ...group, refresh: undefined }
        if (frozen[name]) await this.keep(frozen[name]!, files)
      }
      const heard = this.host.upperAirHeard()
      const air = frozen.upperAir
      if (!frozen.live && heard && (!air || air.refresh)) {
        const src = air?.src ?? FrozenGroups.annexName(base, "upperAir")
        const takenOn = new Date().toISOString().slice(0, 10)
        const annex: UpperAirAnnexData = { version: 1, takenOn, attribution: heard.answer.source.name, answers: [heard] }
        const bytes = new TextEncoder().encode(JSON.stringify(annex))
        FrozenAnnexes.hold(this.address(src), bytes)
        frozen.upperAir = { src, takenOn, attribution: heard.answer.source.name }
        files.set(src, bytes)
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
    const src = frozen[name]?.src ?? FrozenGroups.annexName(base, name)
    FrozenAnnexes.hold(this.address(src), annex.bytes)
    frozen[name] = { src, takenOn: annex.takenOn, attribution: annex.attribution }
    return true
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

  /** An annex the recording keeps as it is, into the export. One that cannot be read any more is left out, and said. */
  private async keep(group: FrozenGroup, files: Map<string, Uint8Array>): Promise<void> {
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

  private defaultBase(): string {
    const id = this.host.sighting().observer?.id
    return `${id ?? "sighting"}-sighting`
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
      water: this.messages.frozenWater, railways: this.messages.frozenRailways, upperAir: this.messages.frozenUpperAir
    }
    return names[name]
  }
}
