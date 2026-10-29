import { BeamParameters } from "../engine/interpretation/BeamParameters.js"
import type { BeamJson, BeamPoint } from "../engine/interpretation/LaserBeam.js"
import { ParameterRegistry } from "../engine/interpretation/Parameters.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import { SkyEvents } from "../engine/model/SkyEvents.js"
import type { BeamEditorMessages } from "./messages/BeamEditorMessages.js"
import { beamEditorMessages_en } from "./messages/BeamEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadBeamEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { ElementList } from "./ElementList.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import type { PositionPlace } from "./ParameterForm.js"

/** What the Beams part needs of the editor it stands in, read at every use. */
export interface BeamEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** What a place is said from, and in what words (see PositionPlace); without it, a place is said only the way it is kept. */
  positionPlace?(): PositionPlace
  /** An edit was written onto the recording. */
  changed(): void
}

/**
 * The beams of light of the recording, edited: a laser shot, a searchlight, facts of its sky (see SkyEventsJson, BeamJson), each with the
 * fields its kind publishes (see BeamParameters) and the points of its path.
 *
 * Every edit replaces the beam edited with an edited copy, and the list of beams with a new list, never changes them where they stand: the
 * scene keeps the points it cut a beam into for as long as it is the same beam (see BeamSystem), and an edit made in place would not be seen.
 */
export class BeamEditor {
  private messages: BeamEditorMessages = beamEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  /** The points of the path of the beam on show, and the one being edited — the only one whose fields are drawn. */
  private places?: ElementList
  private placeForm?: ParameterForm
  private placeIndex = 0
  private language: string
  /** The beams the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly BeamJson[] = []

  constructor(private readonly container: HTMLElement, private readonly host: BeamEditorHost, language: string) {
    this.language = language
    if (!ParameterRegistry.of("beam")) BeamParameters.publish()
    this.render()
    void this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the beam on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const supported = (UFO_SUPPORTED_LANGUAGES as readonly string[]).includes(language) ? language as UfoLanguage : "en"
    const messages = supported === "en" ? beamEditorMessages_en : await loadBeamEditorMessages(supported)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    const beams = this.beams
    this.shown = [...beams]
    if (!beams.some(beam => beam.id === this.currentId)) this.currentId = beams[0]?.id
    this.list?.setItems(beams.map(beam => ({ id: beam.id, label: this.labelOf(beam) })), this.currentId)
    this.syncAddState()
    const beam = this.current
    this.element("beam-fields").hidden = beam === undefined
    if (!beam) return
    this.syncPlaces(beam)
    this.form ??= new ParameterForm(this.element("beam-parameters"), this.language, "beam.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(BeamParameters.SET, new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editBeam(beam => apply(beam as unknown as ParameterHolder))
    ), () => this.written())
  }

  /** Shows what the recording states only if it holds other beams than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    this.syncAddState()
    const beams = this.beams
    if (beams.length === this.shown.length && beams.every((beam, i) => beam.id === this.shown[i].id)) return
    this.sync()
  }

  /** A beam is put in front of the observer: it can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.pathOfNew() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addBeamNowhere)
  }

  /** The beam on show, if any. */
  get current(): BeamJson | undefined {
    return this.beams.find(beam => beam.id === this.currentId)
  }

  /** Shows a beam by its id. */
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
      <div id="beam-list"></div>
      <div id="beam-fields" class="launch-fields">
        <fieldset id="beam-path" class="launch-path">
          <legend>${m.path}</legend>
          <div id="beam-places"></div>
          <div id="beam-place-parameters" class="launch-parameters"></div>
        </fieldset>
        <div id="beam-parameters" class="launch-parameters"></div>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("beam-list"), body: this.element("beam-fields"),
      ids: { list: "beam-select", remove: "beam-delete", add: "beam-add" },
      onSelect: id => { this.currentId = id; this.placeIndex = 0; this.sync() },
      onAdd: () => this.addBeam(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.beam, remove: m.deleteBeam, add: m.addBeam, empty: m.none })
    this.places = new ElementList({
      header: this.element("beam-places"), body: this.element("beam-place-parameters"),
      ids: { list: "beam-place", remove: "beam-place-delete", add: "beam-place-add" },
      navigation: { scope: this.container, onStep: direction => this.selectPlace(this.placeIndex + direction) },
      onSelect: id => this.selectPlace(Number(id)),
      onAdd: () => this.addPlace(),
      onRemove: () => this.removePlace()
    })
    this.places.setLabels({ list: m.place, remove: m.deletePlace, add: m.addPlace, previous: m.previousPlace, next: m.nextPlace })
    this.placeForm = undefined
  }

  /** A field was written onto the beam. */
  private written(): void {
    const beam = this.current
    if (beam) this.list?.rename(beam.id, this.labelOf(beam))
  }

  /** The points of the beam's path, the one being edited picked, and its fields drawn (see BeamParameters.PLACE). */
  private syncPlaces(beam: BeamJson, force = false): void {
    const path = beam.path
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, path.length - 1))
    this.places?.setItems(path.map((_, i) => ({ id: String(i), label: this.placeLabel(i, path.length) })), String(this.placeIndex))
    this.places?.setStepState(this.placeIndex > 0, this.placeIndex < path.length - 1)
    this.places?.setRemoveEnabled(path.length > BeamEditor.MIN_PLACES)
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("beam-place-parameters"), this.language, "beamPlace.")
      this.placeForm.show(BeamParameters.PLACE, new ParameterTarget(
        () => this.current?.path[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editBeam(edited => {
          const place = { ...edited.path[this.placeIndex] }
          apply(place as unknown as ParameterHolder)
          edited.path = edited.path.map((other, i) => i === this.placeIndex ? place : other)
        }),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      this.placeForm.sync(force)
    }
  }

  /** The emitter first, the end last, and mirrors between. */
  private placeLabel(index: number, count: number): string {
    return `${index + 1}/${count}`
  }

  /** A beam needs two points to be a beam at all: where it leaves the emitter and where it ends. */
  private static readonly MIN_PLACES = 2

  private selectPlace(index: number): void {
    const path = this.current?.path ?? []
    if (index < 0 || index >= path.length) return
    this.placeIndex = index
    this.syncPlaces(this.current!, true)
  }

  /**
   * Writes an edit of the beam on show: a copy edited by `apply`, in a new list of beams (see the class), told to the editor.
   */
  private editBeam(apply: (beam: BeamJson) => void): void {
    const beam = this.current
    if (!beam) return
    const edited: BeamJson = { ...beam, path: [...beam.path] }
    apply(edited)
    this.writeBeams(this.beams.map(other => other === beam ? edited : other))
    this.host.changed()
  }

  private addPlace(): void {
    this.editBeam(beam => {
      beam.path = [...beam.path, BeamParameters.nextPlace(beam.path as unknown as Record<string, number>[]) as unknown as BeamPoint]
    })
    this.placeIndex = (this.current?.path.length ?? 1) - 1
    this.syncPlaces(this.current!, true)
  }

  private removePlace(): void {
    if ((this.current?.path.length ?? 0) <= BeamEditor.MIN_PLACES) return
    const index = this.placeIndex
    this.editBeam(beam => {
      beam.path = beam.path.filter((_, i) => i !== index)
    })
    this.syncPlaces(this.current!, true)
  }

  /**
   * Where a new beam goes: from the observer's place, at the ground's height they stand at, two kilometres in the direction they face and a
   * hundred metres up — a placeholder to be given its real path. Undefined where the recording has no place.
   */
  private pathOfNew(): BeamPoint[] | undefined {
    const sighting = this.host.sighting()
    const origin = sighting.event?.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return undefined
    const heading = (sighting.observerTrack?.getInterpolatedPoseAt(0)?.headingDeg ?? 0) * Math.PI / 180
    const metresPerDegree = 111320
    return [
      { lat: origin.lat, lng: origin.lng, altitudeM: 0 },
      {
        lat: origin.lat + 2000 * Math.cos(heading) / metresPerDegree,
        lng: origin.lng + 2000 * Math.sin(heading) / (metresPerDegree * Math.max(0.05, Math.cos(origin.lat * Math.PI / 180))),
        altitudeM: 100
      }
    ]
  }

  /** Adds a green laser of a few watts, the commonest beam there is, to be told apart by the fields below. */
  private addBeam(): void {
    const path = this.pathOfNew()
    if (!path) return
    let n = this.beams.length + 1
    while (this.beams.some(beam => beam.id === `beam-${n}`)) n++
    const beam: BeamJson = { id: `beam-${n}`, path, wavelengthNm: 532, powerW: 5 }
    this.writeBeams([...this.beams, beam])
    this.currentId = beam.id
    this.placeIndex = 0
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const beam = this.current
    if (!beam) return
    this.currentId = undefined
    this.writeBeams(this.beams.filter(other => other !== beam))
    this.host.changed()
    this.sync()
  }

  private writeBeams(beams: BeamJson[]): void {
    const sighting = this.host.sighting()
    sighting.skyEvents = SkyEvents.written({ ...sighting.skyEvents, beams })
  }

  private labelOf(beam: BeamJson): string {
    const title = this.host.said().read(beam.title)
    return title ? `${title} (${beam.id})` : beam.id
  }

  private get beams(): BeamJson[] {
    return this.host.sighting().skyEvents?.beams ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
