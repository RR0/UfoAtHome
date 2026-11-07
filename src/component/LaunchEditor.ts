import { LaunchParameters } from "../engine/interpretation/LaunchParameters.js"
import type { LaunchJetJson, LaunchJetKind, LaunchJson, LaunchVehicle } from "../engine/interpretation/LaunchPlume.js"
import { SkyEvents } from "../engine/model/SkyEvents.js"
import { ParameterRegistry } from "../engine/interpretation/Parameters.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import type { LaunchEditorMessages } from "./messages/LaunchEditorMessages.js"
import { launchEditorMessages_en } from "./messages/LaunchEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadLaunchEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { ElementList } from "./ElementList.js"
import { Icons } from "./Icons.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import type { PositionPlace } from "./ParameterForm.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"
import { TimelineTracks } from "./TimelineTracks.js"
import type { TimelineTrack } from "./TimelineTracks.js"

/** What the Launches part needs of the editor it stands in, read at every use. */
export interface LaunchEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** What a place is said from, and in what words (see PositionPlace); without it, a place is said only the way it is kept. */
  positionPlace?(): PositionPlace
  /** Where the playhead is, ms, how long the recording lasts, and putting the playhead elsewhere: the part's own timeline follows the recording's. */
  currentTime(): number
  duration(): number
  seekTo(t: number): void
  /** An edit was written onto the recording. */
  changed(): void
}

/**
 * The launches of the recording, edited: the rocket launches that happened while it runs, a fact of its sky (see SkyEventsJson, LaunchJson), each with the fields its kind publishes (see LaunchParameters) —
 * the engine, the plume, the collar — drawn by the generic ParameterForm.
 *
 * What happens when is laid out on a timeline of its own (see TimelineTracks): a row for the path, its places as diamonds, and a row for
 * each jet, its burn or its venting as a bar between two diamonds. A row pressed is the one whose details are shown under it, alone: the
 * place of the path picked, or the jet. A diamond pressed takes the playhead to it, so that the scene shows the launch then; dragged, it
 * moves in time; the "+" of a row adds there at the playhead.
 */
export class LaunchEditor {
  private messages: LaunchEditorMessages = launchEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private timeline?: TimelineTracks
  /** The row of the timeline whose details are shown under it: the path, or the jet at jetIndex. */
  private row: "path" | "jet" = "path"
  private placeForm?: ParameterForm
  private placeIndex = 0
  private jetForm?: ParameterForm
  private jetIndex = 0
  private language: string
  /** The launches the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly LaunchJson[] = []

  constructor(private readonly container: HTMLElement, private readonly host: LaunchEditorHost, language: string) {
    this.language = language
    // The kind's description is what the form is built from; published so that an asset can refine it.
    if (!ParameterRegistry.of("launch")) LaunchParameters.publish()
    this.render()
    void this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the launch on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const supported = (UFO_SUPPORTED_LANGUAGES as readonly string[]).includes(language) ? language as UfoLanguage : "en"
    const messages = supported === "en" ? launchEditorMessages_en : await loadLaunchEditorMessages(supported)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    const launches = this.launches
    this.shown = [...launches]
    if (!launches.some(launch => launch.id === this.currentId)) this.currentId = launches[0]?.id
    this.list?.setItems(launches.map(launch => ({ id: launch.id, label: this.labelOf(launch) })), this.currentId)
    this.syncAddState()
    const launch = this.current
    this.element("launch-fields").hidden = launch === undefined
    if (!launch) return
    this.syncPlace(true)
    this.syncJet(true)
    const set = ParameterRegistry.of("launch")!
    this.form ??= new ParameterForm(this.element("launch-parameters"), this.language, "", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(set, launch as unknown as Record<string, unknown>, () => this.written())
  }

  /**
   * Shows what the recording states only if it is not what the fields were filled for: other
   * launches than before (a recording loaded, one deleted). An edit of a launch already on show
   * leaves the fields alone, so that what is being typed is not drawn again under the cursor.
   */
  refresh(): void {
    // Whether a launch can be added follows the place, which is given in another group while the launches stay the same.
    this.syncAddState()
    const launches = this.launches
    if (launches.length === this.shown.length && launches.every((launch, i) => launch === this.shown[i])) {
      this.syncTimeline()
      return
    }
    this.sync()
  }

  /** The playhead has moved: only it is drawn again, as at every frame of a playback. */
  setTime(t: number): void {
    this.timeline?.setTime(t)
  }

  /** A launch is put in front of the observer: it can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.startOfNew() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addLaunchNowhere)
  }

  /** The launch on show, if any. */
  get current(): LaunchJson | undefined {
    return this.launches.find(launch => launch.id === this.currentId)
  }

  /** Shows a launch by its id, as the summary's chip and the picture do for a body. */
  show(id: string): void {
    this.currentId = id
    this.row = "path"
    this.placeIndex = 0
    this.jetIndex = 0
    this.sync()
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="launch-list"></div>
      <div id="launch-fields" class="launch-fields">
        <div id="launch-parameters" class="launch-parameters"></div>
        <div id="launch-timeline" class="launch-timeline"></div>
        <button id="launch-jet-add-burn" type="button" title="${m.addJet}">${Icons.PLUS} ${m.jetBurn}</button>
        <button id="launch-jet-add-vent" type="button" title="${m.addJet}">${Icons.PLUS} ${m.jetVent}</button>
        <p class="launch-intro">${m.timelineNote}</p>
        <fieldset id="launch-path" class="launch-path">
          <legend>${m.path}</legend>
          <div id="launch-place-parameters" class="launch-parameters"></div>
          <button id="launch-place-delete" class="icon-btn" type="button" title="${m.deletePlace}" aria-label="${m.deletePlace}">${Icons.TRASH}</button>
        </fieldset>
        <fieldset id="launch-jets" class="launch-path">
          <legend id="launch-jet-legend">${m.jet}</legend>
          <div id="launch-jet-parameters" class="launch-parameters"></div>
          <button id="launch-jet-delete" class="icon-btn" type="button" title="${m.deleteJet}" aria-label="${m.deleteJet}">${Icons.TRASH}</button>
        </fieldset>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    const list = this.element("launch-list")
    this.list = new ElementList({
      header: list, body: this.element("launch-fields"),
      ids: { list: "launch-select", remove: "launch-delete", add: "launch-add", kinds: "launch-add-kind", kind: vehicle => `launch-add-${vehicle}` },
      onSelect: id => this.show(id),
      onAdd: vehicle => this.addLaunch(vehicle ?? LaunchEditor.VEHICLES[0].id),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.launch, remove: m.deleteLaunch, add: m.addLaunch, empty: m.none })
    // What is launched is picked when the launch is added, and kept: another vehicle is another launch.
    this.list.setKinds(LaunchEditor.VEHICLES.map(vehicle => ({ value: vehicle.id, label: vehicle.vehicle.name ?? vehicle.id })))
    this.timeline = new TimelineTracks(this.element("launch-timeline"), t => this.host.seekTo(t), { addKeyframeHere: m.addHere, keyframeHere: m.here, zoomHint: m.zoomHint })
    this.element("launch-jet-add-burn").addEventListener("click", () => this.addJet("burn", this.host.currentTime()))
    this.element("launch-jet-add-vent").addEventListener("click", () => this.addJet("vent", this.host.currentTime()))
    this.element("launch-place-delete").addEventListener("click", () => this.removePlace())
    this.element("launch-jet-delete").addEventListener("click", () => this.removeJet())
    this.placeForm = undefined
    this.jetForm = undefined
  }

  /** A field of the form was written onto the launch. */
  private written(): void {
    this.host.changed()
    const launch = this.current
    if (!launch) return
    this.list?.rename(launch.id, this.labelOf(launch))
    this.syncTimeline()
  }

  // The timeline.

  /** The rows of the timeline: the path's, and every jet's, readable over a light ground and a dark one. */
  private static readonly PATH_COLOR = "#e08a1e"
  private static readonly JET_COLOR = "#4f8fd6"

  private jetLabel(jet: LaunchJetJson, index: number): string {
    return `${jet.kind === "vent" ? this.messages.jetVent : this.messages.jetBurn} ${index + 1}`
  }

  /** The rows of the part's timeline (see the class), drawn again only when what they show has changed (see TimelineTracks.show). */
  private syncTimeline(): void {
    const launch = this.current
    if (!this.timeline || !launch) return
    const m = this.messages
    const path: TimelineTrack = {
      id: "path", label: m.path, color: LaunchEditor.PATH_COLOR,
      times: launch.track.map(place => place.t),
      active: this.row === "path",
      selectedTime: this.row === "path" ? launch.track[this.placeIndex]?.t : undefined,
      open: () => this.selectPlace(this.placeIndex),
      pressed: (_t, key) => {
        const index = key === undefined ? -1 : (this.current?.track ?? []).findIndex(place => place.t === key)
        this.selectPlace(index >= 0 ? index : this.placeIndex)
      },
      move: (from, to) => this.movePlace(from, to),
      add: () => this.addPlaceAt(this.host.currentTime())
    }
    const jets = (launch.jets ?? []).map((jet, i): TimelineTrack => ({
      id: `jet-${i}`, label: this.jetLabel(jet, i), color: LaunchEditor.JET_COLOR,
      // Its ends, to be dragged, at either end of its bar.
      times: [jet.fromT, jet.untilT],
      spans: [{ t: jet.fromT, until: jet.untilT, label: "" }],
      active: this.row === "jet" && i === this.jetIndex,
      open: () => this.selectJet(i),
      pressed: () => this.selectJet(i),
      move: (from, to) => this.moveJetEnd(i, from, to),
      add: () => this.addJet(jet.kind ?? "burn", this.host.currentTime())
    }))
    const instants = LaunchParameters.instantsOf(launch)
    const from = Math.min(...instants)
    const to = Math.max(...instants)
    const margin = Math.max(500, (to - from) / 10)
    this.timeline.show([path, ...jets], this.host.duration(), this.host.currentTime(), { from: from - margin, to: to + margin })
  }

  /** Under the timeline, the details of its row picked alone: the path's place, or the jet. */
  private syncDetail(): void {
    const launch = this.current
    const jet = launch?.jets?.[this.jetIndex]
    if (this.row === "jet" && !jet) this.row = "path"
    this.element("launch-path").hidden = this.row !== "path"
    this.element("launch-jets").hidden = this.row !== "jet"
    this.element("launch-jet-legend").textContent = jet ? this.jetLabel(jet, this.jetIndex) : this.messages.jet
  }

  // The path.

  /** A path needs two places to be a path at all: the plume is let go between them. */
  private static readonly MIN_PLACES = 2

  /** The fields of the place of the path picked (see LaunchParameters.PLACE). */
  private syncPlace(force = false): void {
    const track = this.current?.track ?? []
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, track.length - 1))
    ;(this.element("launch-place-delete") as HTMLButtonElement).disabled = track.length <= LaunchEditor.MIN_PLACES
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("launch-place-parameters"), this.language, "launchPlace.")
      this.placeForm.show(LaunchParameters.PLACE, new ParameterTarget(
        () => this.current?.track[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPlace(this.placeIndex, apply),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      // Another place may have been picked with the focus still in a field of the last one: it is not being typed in.
      this.placeForm.sync(force)
    }
    this.syncDetail()
    this.syncTimeline()
  }

  private selectPlace(index: number): void {
    this.row = "path"
    this.placeIndex = index
    this.syncPlace(true)
  }

  /**
   * One field of the place at `index` was edited: the place is replaced by an edited copy, and the path is put in order of the instants,
   * the place being followed to where it now stands — the fields keep showing the place that was being edited.
   */
  private editPlace(index: number, apply: (place: ParameterHolder) => void): void {
    const launch = this.current
    if (!launch) return
    const place = { ...launch.track[index] }
    apply(place as unknown as ParameterHolder)
    launch.track = launch.track.map((other, i) => i === index ? place : other).sort((a, b) => a.t - b.t)
    this.placeIndex = launch.track.indexOf(place)
    this.syncPlace()
    this.written()
  }

  /** A diamond of the path dragged in time: the place it stands for, picked, now at `to`. */
  private movePlace(from: number, to: number): void {
    const index = this.current?.track.findIndex(place => place.t === from) ?? -1
    if (index < 0) return
    this.editPlace(index, place => { place.t = to })
    this.syncPlace(true)
  }

  /** A place of the path at `t`, where the stage is then; the one already there when there is one. */
  private addPlaceAt(t: number): void {
    const launch = this.current
    if (!launch) return
    const there = launch.track.findIndex(place => Math.abs(place.t - t) < 1)
    if (there < 0) {
      const place = LaunchParameters.placeAt(launch.track, Math.round(t))
      launch.track = [...launch.track, place].sort((a, b) => a.t - b.t)
      this.host.changed()
      this.selectPlace(launch.track.indexOf(place))
      return
    }
    this.selectPlace(there)
  }

  private removePlace(): void {
    const launch = this.current
    if (!launch || launch.track.length <= LaunchEditor.MIN_PLACES) return
    launch.track = launch.track.filter((_, i) => i !== this.placeIndex)
    this.syncPlace(true)
    this.host.changed()
  }

  // The jets.

  /**
   * The fields of the jet picked (see LaunchParameters.JET): what a field left empty shows is what the jet uses, which for a burn depends
   * on the launch's engine, so the form is told the launch.
   */
  private syncJet(force = false): void {
    const jets = this.current?.jets ?? []
    this.jetIndex = Math.max(0, Math.min(this.jetIndex, jets.length - 1))
    if (!this.jetForm) {
      this.jetForm = new ParameterForm(this.element("launch-jet-parameters"), this.language, "launchJet.")
      this.jetForm.show(LaunchParameters.JET, new ParameterTarget(
        () => this.current?.jets?.[this.jetIndex] as unknown as ParameterHolder | undefined,
        apply => this.editJet(this.jetIndex, apply),
        () => this.current ? LaunchParameters.jetContext(this.current, this.jetIndex) : undefined
      ), () => undefined)
    } else {
      this.jetForm.sync(force)
    }
    this.syncDetail()
    this.syncTimeline()
  }

  private selectJet(index: number): void {
    this.row = "jet"
    this.jetIndex = index
    this.syncJet(true)
  }

  /** One field of the jet at `index` was edited: the jet is replaced by an edited copy, as a place of the path is. */
  private editJet(index: number, apply: (jet: ParameterHolder) => void): void {
    const launch = this.current
    if (!launch?.jets) return
    const jet = { ...launch.jets[index] }
    apply(jet as unknown as ParameterHolder)
    launch.jets = launch.jets.map((other, i) => i === index ? jet : other)
    this.written()
  }

  /** An end of the bar of the jet at `index` dragged in time: the one it was at, now at `to`, the jet's start kept before its end. */
  private moveJetEnd(index: number, from: number, to: number): void {
    const jet = this.current?.jets?.[index]
    if (!jet) return
    this.editJet(index, edited => {
      const ends = from === jet.fromT ? [to, jet.untilT] : [jet.fromT, to]
      edited.fromT = Math.min(ends[0], ends[1])
      edited.untilT = Math.max(ends[0], ends[1])
    })
    this.selectJet(index)
  }

  /**
   * A jet of `kind` from `t` for half a minute: a burn straight back, propellant vented sideways. Adding the first jet to a launch whose
   * burn of the ascent was not given its ends states them, so that the ascent's burn stays drawn (see LaunchJson.jets).
   */
  private addJet(kind: LaunchJetKind, t: number): void {
    const launch = this.current
    if (!launch) return
    const track = launch.track
    const from = Math.round(t)
    const jet: LaunchJetJson = kind === "vent" ? { kind, fromT: from, untilT: from + 30000, angleDeg: 90 } : { kind, fromT: from, untilT: from + 30000 }
    if (!launch.jets?.length && launch.burnFromT === undefined && launch.burnUntilT === undefined) {
      launch.burnFromT = track[0].t
      launch.burnUntilT = track[track.length - 1].t
    }
    launch.jets = [...launch.jets ?? [], jet]
    this.form?.sync(true)
    this.host.changed()
    this.selectJet(launch.jets.length - 1)
  }

  private removeJet(): void {
    const launch = this.current
    if (!launch?.jets?.length) return
    const jets = launch.jets.filter((_, i) => i !== this.jetIndex)
    if (jets.length) launch.jets = jets
    else delete launch.jets
    this.host.changed()
    if (jets.length) this.selectJet(Math.min(this.jetIndex, jets.length - 1))
    else this.selectPlace(this.placeIndex)
  }

  /**
   * Where a new launch starts: far enough from the observer that a stage is seen climbing, in the direction they face, since nothing
   * else is known of it. Undefined where the recording has no place to put it. It is a placeholder to be given its real path in the file
   * (see the class), and its plume needs the recording's date as any does.
   */
  private startOfNew(): LaunchJson["track"] | undefined {
    const sighting = this.host.sighting()
    const origin = sighting.event?.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return undefined
    const heading = (sighting.observerTrack?.getInterpolatedPoseAt(0)?.headingDeg ?? 0) * Math.PI / 180
    const at = (distanceKm: number) => ({
      lat: origin.lat + distanceKm * Math.cos(heading) / 111.32,
      lng: origin.lng + distanceKm * Math.sin(heading) / (111.32 * Math.max(0.05, Math.cos(origin.lat * Math.PI / 180)))
    })
    return [{ t: 0, ...at(300), altitudeKm: 80 }, { t: 60000, ...at(450), altitudeKm: 160 }]
  }

  /** The vehicles a launch can be added of, by the "+" (see ElementList's kinds): Falcon 9 only, for now, the commonest by far. */
  static readonly VEHICLES: ReadonlyArray<{ id: string, vehicle: LaunchVehicle }> = [{ id: "falcon-9", vehicle: { name: "Falcon 9" } }]

  /** Adds a launch of `vehicle` (an id of VEHICLES), to be told apart by the fields below. */
  private addLaunch(vehicle: string): void {
    const track = this.startOfNew()
    if (!track) return
    const kind = LaunchEditor.VEHICLES.find(candidate => candidate.id === vehicle) ?? LaunchEditor.VEHICLES[0]
    let n = this.launches.length + 1
    while (this.launches.some(launch => launch.id === `launch-${n}`)) n++
    const launch: LaunchJson = { id: `launch-${n}`, vehicle: { ...kind.vehicle }, track }
    const sighting = this.host.sighting()
    sighting.skyEvents = { ...sighting.skyEvents, launches: [...this.launches, launch] }
    this.currentId = launch.id
    this.row = "path"
    this.placeIndex = 0
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const launch = this.current
    if (!launch) return
    this.currentId = undefined
    const sighting = this.host.sighting()
    sighting.skyEvents = SkyEvents.written({ ...sighting.skyEvents, launches: this.launches.filter(other => other !== launch) })
    this.host.changed()
    this.sync()
  }

  private labelOf(launch: LaunchJson): string {
    const title = this.host.said().read(launch.title) ?? launch.vehicle?.mission ?? launch.vehicle?.name
    return title ? `${title} (${launch.id})` : launch.id
  }

  private get launches(): LaunchJson[] {
    return this.host.sighting().skyEvents?.launches ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
