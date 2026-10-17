import { LaunchParameters } from "../engine/interpretation/LaunchParameters.js"
import type { LaunchJson } from "../engine/interpretation/LaunchPlume.js"
import type { InterpretationJson } from "../engine/interpretation/Interpretation.js"
import { ParameterRegistry } from "../engine/interpretation/Parameters.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import type { LaunchEditorMessages } from "./messages/LaunchEditorMessages.js"
import { launchEditorMessages_en } from "./messages/LaunchEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadLaunchEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { ElementList } from "./ElementList.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"

/** What the Launches part needs of the editor it stands in, read at every use. */
export interface LaunchEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** An edit was written onto the recording. */
  changed(): void
}

/**
 * The launches of the interpretation, edited: the rocket launches whose exhaust the interpretation
 * says was seen (see LaunchJson), each with the fields its kind publishes (see LaunchParameters) —
 * the engine, the plume, the collar — drawn by the generic ParameterForm.
 *
 * What is edited here is what a launch IS, how its exhaust behaves, and where it flew: its path is a table of places and instants,
 * drawn by the form as one (see RowsParameter).
 */
export class LaunchEditor {
  private messages: LaunchEditorMessages = launchEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  /** The places of the path of the launch on show, and the one being edited — the only one whose fields are drawn. */
  private places?: ElementList
  private placeForm?: ParameterForm
  private placeIndex = 0
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
    this.list?.setAddState(this.startOfNew() !== undefined, this.startOfNew() === undefined ? this.messages.addLaunchNowhere : undefined)
    this.element("launch-none").hidden = launches.length > 0
    const launch = this.current
    this.element("launch-fields").hidden = launch === undefined
    if (!launch) return
    this.syncPlaces(launch)
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
    const launches = this.launches
    if (launches.length === this.shown.length && launches.every((launch, i) => launch === this.shown[i])) return
    this.sync()
  }

  /** The launch on show, if any. */
  get current(): LaunchJson | undefined {
    return this.launches.find(launch => launch.id === this.currentId)
  }

  /** Shows a launch by its id, as the summary's chip and the picture do for a body. */
  show(id: string): void {
    this.currentId = id
    this.placeIndex = 0
    this.sync()
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <p id="launch-none" class="launch-intro">${m.none}</p>
      <div id="launch-list"></div>
      <div id="launch-fields" class="launch-fields">
        <fieldset id="launch-path" class="launch-path">
          <legend>${m.path}</legend>
          <div id="launch-places"></div>
          <div id="launch-place-parameters" class="launch-parameters"></div>
        </fieldset>
        <div id="launch-parameters" class="launch-parameters"></div>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    const list = this.element("launch-list")
    this.list = new ElementList({
      header: list, footer: list, rowClass: "launch-list-add",
      ids: { list: "launch-select", remove: "launch-delete", add: "launch-add" },
      onSelect: id => { this.currentId = id; this.placeIndex = 0; this.sync() },
      onAdd: () => this.addLaunch(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.launch, remove: m.deleteLaunch, add: m.addLaunch })
    const places = this.element("launch-places")
    this.places = new ElementList({
      header: places, footer: places, rowClass: "launch-places-add",
      ids: { list: "launch-place", remove: "launch-place-delete", add: "launch-place-add" },
      navigation: { scope: this.container, onStep: direction => this.selectPlace(this.placeIndex + direction) },
      onSelect: id => this.selectPlace(Number(id)),
      onAdd: () => this.addPlace(),
      onRemove: () => this.removePlace()
    })
    this.places.setLabels({ list: m.place, remove: m.deletePlace, add: m.addPlace, previous: m.previousPlace, next: m.nextPlace })
    this.placeForm = undefined
  }

  /** A field of the form was written onto the launch. */
  private written(): void {
    this.host.changed()
    const launch = this.current
    if (!launch) return
    this.list?.rename(launch.id, this.labelOf(launch))
  }

  /** The places of the launch's path, the one being edited picked, and its fields drawn (see LaunchParameters.PLACE). */
  private syncPlaces(launch: LaunchJson, force = false): void {
    const track = launch.track ?? []
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, track.length - 1))
    this.places?.setItems(track.map((place, i) => ({ id: String(i), label: this.seconds(place.t) })), String(this.placeIndex))
    this.places?.setStepState(this.placeIndex > 0, this.placeIndex < track.length - 1)
    this.places?.setRemoveEnabled(track.length > LaunchEditor.MIN_PLACES)
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("launch-place-parameters"), this.language, "launchPlace.")
      this.placeForm.show(LaunchParameters.PLACE, new ParameterTarget(
        () => this.current?.track[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPlace(apply)
      ), () => undefined)
    } else {
      // Another place may have been stepped to with the focus still in a field of the last one: it is not being typed in.
      this.placeForm.sync(force)
    }
  }

  /** A path needs two places to be a path at all: the plume is let go between them. */
  private static readonly MIN_PLACES = 2

  private seconds(ms: number): string {
    return `${Math.round(ms / 100) / 10} s`
  }

  /** Goes to the place at `index` of the path, or stays where it is past either end. */
  private selectPlace(index: number): void {
    const track = this.current?.track ?? []
    if (index < 0 || index >= track.length) return
    this.placeIndex = index
    this.syncPlaces(this.current!, true)
  }

  /**
   * One field of the place on show was edited: the place is replaced by an edited copy, and the path is put in order of the instants,
   * the place being followed to where it now stands — the fields keep showing the place that was being edited.
   */
  private editPlace(apply: (place: ParameterHolder) => void): void {
    const launch = this.current
    if (!launch) return
    const place = { ...launch.track[this.placeIndex] }
    apply(place as unknown as ParameterHolder)
    const track = launch.track.map((other, i) => i === this.placeIndex ? place : other).sort((a, b) => a.t - b.t)
    this.replaceTrack(launch, track)
    this.placeIndex = track.indexOf(place)
    this.syncPlaces(this.current!)
    this.written()
  }

  /** A place after the last, going on as the path was going. */
  private addPlace(): void {
    const launch = this.current
    if (!launch) return
    const rows = launch.track as unknown as Record<string, number>[]
    const place = LaunchParameters.nextPlace(rows) as unknown as LaunchJson["track"][number]
    const track = [...launch.track, place].sort((a, b) => a.t - b.t)
    this.replaceTrack(launch, track)
    this.placeIndex = track.indexOf(place)
    this.syncPlaces(this.current!)
    this.host.changed()
  }

  private removePlace(): void {
    const launch = this.current
    if (!launch || launch.track.length <= LaunchEditor.MIN_PLACES) return
    this.replaceTrack(launch, launch.track.filter((_, i) => i !== this.placeIndex))
    this.syncPlaces(this.current!)
    this.host.changed()
  }

  /** The launch with another path. In place, as the other fields of the launch are edited (see ParameterForm.show): the form on show holds this very object. */
  private replaceTrack(launch: LaunchJson, track: LaunchJson["track"]): void {
    launch.track = track
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

  /** Adds a launch of the vehicle most launches are, to be told apart by the fields below. */
  private addLaunch(): void {
    const track = this.startOfNew()
    if (!track) return
    const interpretation = this.interpretation ?? { bodies: [] } as InterpretationJson
    let n = this.launches.length + 1
    while (this.launches.some(launch => launch.id === `launch-${n}`)) n++
    const launch: LaunchJson = { id: `launch-${n}`, vehicle: { name: "Falcon 9" }, track }
    this.host.sighting().interpretation = { ...interpretation, launches: [...this.launches, launch] }
    this.currentId = launch.id
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const launch = this.current
    const interpretation = this.interpretation
    if (!launch || !interpretation) return
    this.currentId = undefined
    const launches = this.launches.filter(other => other !== launch)
    const next: InterpretationJson = { ...interpretation, launches: launches.length === 0 ? undefined : launches }
    if (launches.length === 0) delete next.launches
    const empty = next.bodies.length === 0 && next.title === undefined && next.smoke === undefined && next.reentries === undefined && next.launches === undefined
    this.host.sighting().interpretation = empty ? undefined : next
    this.host.changed()
    this.sync()
  }

  private labelOf(launch: LaunchJson): string {
    const title = this.host.said().read(launch.title) ?? launch.vehicle?.mission ?? launch.vehicle?.name
    return title ? `${title} (${launch.id})` : launch.id
  }

  private get interpretation(): InterpretationJson | undefined {
    return this.host.sighting().interpretation
  }

  private get launches(): LaunchJson[] {
    return this.interpretation?.launches ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
