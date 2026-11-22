import { AIRSHIP_PARAMETER_TEXTS } from "./messages/AirshipParameterTexts.js"
import type { AirshipParameterTexts } from "./messages/AirshipParameterTexts.js"
import { ParameterRegistry, ParameterTexts } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet } from "../../../engine/interpretation/Parameters.js"
import { SkyEventEditorStyle } from "../../sky-events/SkyEventEditorStyle.js"
import { AirshipParameters } from "./AirshipParameters.js"
import type { AirshipContext, AirshipView } from "./AirshipParameters.js"
import { AirshipFlight } from "./AirshipFlight.js"
import type { AirshipFlightJson } from "./AirshipFlight.js"
import type { DroneWaypoint } from "../drones/DroneFlight.js"
import type { InterpretationJson } from "../../../engine/interpretation/Interpretation.js"
import type { InterpretationEditorHost } from "../InterpretationKind.js"
import type { AirshipEditorMessages } from "./messages/AirshipEditorMessages.js"
import { AIRSHIP_EDITOR_MESSAGES } from "./messages/AirshipEditorMessages.js"
import { ElementList } from "../../../component/ElementList.js"
import { Icons } from "../../../component/Icons.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import { TimelineTracks } from "../../../component/TimelineTracks.js"
import type { TimelineTrack } from "../../../component/TimelineTracks.js"
import { InterpretationKinds } from "../InterpretationKind.js"
import { InterpretationRegistry } from "../interpretationSources.js"

/**
 * The airships of the recording, edited: airships read into the account as what it saw (see InterpretationJson.airships, AirshipFlightJson),
 * each with the fields the airship kind publishes (see AirshipParameters), and the points of its path on a timeline of its own beside the
 * recording's playhead, as a drone's are (see DroneEditor): a diamond pressed is the point whose fields are shown, and the playhead goes to
 * it; dragged, it moves in time; the row's "+" puts a point at the playhead, where the airship is then. A tethered aerostat stays at its
 * first point. Its course, its attitude and its lights' flashes are computed, not edited.
 *
 * The form edits the airship's view (see AirshipView), turned back into what the recording states at every edit. Every edit replaces the
 * airship edited with an edited copy, in a new interpretation, never changes it where it stands: the scene computes the airships again when
 * the interpretation it is given is another one (see SightingEditorElement.syncBodiesShown).
 */
export class AirshipEditor {
  /** Its texts, once they have come (see ready). */
  private messages!: AirshipEditorMessages
  /** Settles once the part has its texts and is drawn: nothing of it is shown before, in no language. */
  readonly ready: Promise<void>
  /** The words of its parameters, in its language (see ParameterTexts). */
  private parameterTexts!: AirshipParameterTexts
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private timeline?: TimelineTracks
  private pointForm?: ParameterForm
  private pointIndex = 0
  private language: string
  /** The airships the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly AirshipFlightJson[] = []
  /** The view of the airship on show, made again whenever it is another (see view). */
  private viewed?: { of: AirshipFlightJson, view: AirshipView }

  /** The part's layout, given with it (see InterpretationKind.editor). */
  private static readonly STYLE = `.airship-editor-part { flex-basis: 100%; min-width: 0; } .airship-editor-part #airship-list, .airship-editor-part #airship-timeline { flex-basis: 100%; min-width: 0; } .airship-editor-part #airship-timeline { padding: 4px 0; } .airship-editor-part #airship-path > .icon-btn { align-self: flex-end; } .airship-editor-part .launch-editor, .airship-editor-part .launch-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .airship-editor-part .launch-fields { flex-basis: 100%; min-width: 0; } .airship-editor-part [hidden] { display: none !important; } .airship-editor-part select { min-width: 0; width: 100%; } .airship-editor-part .launch-intro { flex-basis: 100%; margin: 0; } .airship-editor-part .launch-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .airship-editor-part .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .airship-editor-part input, .airship-editor-part select { max-width: 100%; box-sizing: border-box; } .airship-editor-part input[type="text"] { width: 12em; } .airship-editor-part label { min-width: 0; max-width: 100%; } .airship-editor-part input.parameter-derived::placeholder { opacity: .65; } .airship-editor-part .launch-path { flex: 1 1 100%; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; }`

  /** The path's row, readable over a light ground and a dark one. */
  private static readonly PATH_COLOR = "#3b82c4"
  /** An airship needs one point to be somewhere; two to fly. */
  private static readonly MIN_POINTS = 1

  constructor(private readonly container: HTMLElement, private readonly host: InterpretationEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "airship-editor-part", AirshipEditor.STYLE)
    this.language = language
    if (!ParameterRegistry.of("airships")) AirshipParameters.publish()
    this.ready = this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the airship on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const [messages, parameterTexts] = await Promise.all([AIRSHIP_EDITOR_MESSAGES.load(language), AIRSHIP_PARAMETER_TEXTS.load(language)])
    if (token !== this.languageToken) return
    this.messages = messages
    this.parameterTexts = parameterTexts
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    if (!this.messages) return
    const flights = this.flights
    this.shown = [...flights]
    if (!flights.some(flight => flight.id === this.currentId)) this.currentId = flights[0]?.id
    this.list?.setItems(flights.map(flight => ({ id: flight.id, label: this.labelOf(flight) })), this.currentId)
    this.syncAddState()
    const flight = this.current
    this.element("airship-fields").hidden = flight === undefined
    if (!flight) return
    this.syncTethered()
    this.form ??= new ParameterForm(this.element("airship-parameters"), this.language, "airships.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(this.resolved(AirshipParameters.SET), new ParameterTarget(
      () => this.view as unknown as ParameterHolder | undefined,
      apply => this.editView(view => apply(view as unknown as ParameterHolder)),
      (): AirshipContext => ({ shapes: this.host.shapes().map(shape => ({ value: shape.id, label: shape.label })) }),
      this.host.positionPlace?.()
    ), () => this.written())
    this.syncPoint(true)
  }

  /** Shows what the recording states only if it holds other airships than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    if (!this.messages) return
    this.syncAddState()
    const flights = this.flights
    if (flights.length === this.shown.length && flights.every((flight, i) => flight.id === this.shown[i].id)) {
      this.syncTimeline()
      return
    }
    this.sync()
  }

  /** The playhead has moved: only it is drawn again. */
  setTime(t: number): void {
    if (!this.messages) return
    this.timeline?.setTime(t)
  }

  /** The airship on show, if any. */
  get current(): AirshipFlightJson | undefined {
    return this.flights.find(flight => flight.id === this.currentId)
  }

  /** The form's view of the airship on show (see AirshipView): the same object for as long as the airship is the same. */
  private get view(): AirshipView | undefined {
    const flight = this.current
    if (!flight) return undefined
    if (this.viewed?.of !== flight) this.viewed = { of: flight, view: AirshipParameters.viewOf(flight) }
    return this.viewed.view
  }

  /** Airships are put in front of the observer: they can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.frontOfObserver() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addNowhere)
  }

  /** A tethered one stays at its first point: the note says so. */
  private syncTethered(): void {
    const flight = this.current
    this.element("airship-tethered").hidden = !flight || !AirshipFlight.typeOf(flight).tethered
  }

  /** A set of its parameters in its language (see ParameterTexts.resolve). */
  private resolved(set: ParameterSet): ParameterSet {
    return ParameterTexts.resolve(set, this.parameterTexts)
  }

  private render(): void {
    if (!this.messages) return
    const m = this.messages
    this.form = undefined
    this.pointForm = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="airship-list"></div>
      <div id="airship-fields" class="launch-fields">
        <div id="airship-parameters" class="launch-parameters"></div>
        <p id="airship-tethered" class="launch-intro" hidden>${m.tetheredNote}</p>
        <div id="airship-timeline"></div>
        <p class="launch-intro">${m.timelineNote}</p>
        <fieldset id="airship-path" class="launch-path">
          <legend>${this.parameterTexts.pointOfThePath}</legend>
          <div id="airship-point-parameters" class="launch-parameters"></div>
          <button id="airship-point-delete" class="icon-btn" type="button" title="${m.deletePoint}" aria-label="${m.deletePoint}">${Icons.TRASH}</button>
        </fieldset>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("airship-list"), body: this.element("airship-fields"),
      ids: { list: "airship-select", remove: "airship-delete", add: "airship-add" },
      onSelect: id => this.show(id),
      onAdd: () => this.addAirship(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.airship, remove: m.deleteAirship, add: m.addAirship, empty: m.none })
    this.timeline = new TimelineTracks(this.element("airship-timeline"), t => this.host.seekTo?.(t), { addKeyframeHere: m.addPointHere, keyframeHere: m.pointHere, zoomHint: m.zoomHint })
    this.element("airship-point-delete").addEventListener("click", () => this.removePoint())
  }

  /** Shows an airship by its id, from the first point of its path. */
  show(id: string): void {
    if (!this.messages) return
    this.currentId = id
    this.pointIndex = 0
    this.sync()
  }

  /** A field was written onto the airship. */
  private written(): void {
    const flight = this.current
    if (flight) this.list?.rename(flight.id, this.labelOf(flight))
    this.syncTethered()
    this.syncPoint()
  }

  // The path.

  private pathOf(flight: AirshipFlightJson | undefined): DroneWaypoint[] {
    return [...flight?.path ?? []].sort((a, b) => a.t - b.t)
  }

  private syncTimeline(): void {
    const flight = this.current
    if (!this.timeline || !flight) return
    const path = this.pathOf(flight)
    const row: TimelineTrack = {
      id: "path", label: this.messages.path, color: AirshipEditor.PATH_COLOR,
      times: path.map(point => point.t),
      active: true,
      selectedTime: path[this.pointIndex]?.t,
      open: () => this.selectPoint(this.pointIndex),
      pressed: (_t, key) => {
        const index = key === undefined ? -1 : this.pathOf(this.current).findIndex(point => point.t === key)
        this.selectPoint(index >= 0 ? index : this.pointIndex)
      },
      move: (from, to) => this.movePoint(from, to),
      add: () => this.addPointAt(this.host.currentTime?.() ?? 0)
    }
    const from = path[0]?.t ?? 0
    const to = path[path.length - 1]?.t ?? 0
    const margin = Math.max(500, (to - from) / 10)
    this.timeline.show([row], this.host.duration?.() ?? to, this.host.currentTime?.() ?? 0, { from: from - margin, to: to + margin })
  }

  private syncPoint(force = false): void {
    const path = this.pathOf(this.current)
    this.pointIndex = Math.max(0, Math.min(this.pointIndex, path.length - 1))
    ;(this.element("airship-point-delete") as HTMLButtonElement).disabled = path.length <= AirshipEditor.MIN_POINTS
    if (!this.pointForm) {
      this.pointForm = new ParameterForm(this.element("airship-point-parameters"), this.language, "airshipsPoint.")
      this.pointForm.show(this.resolved(AirshipParameters.WAYPOINT), new ParameterTarget(
        () => this.pathOf(this.current)[this.pointIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPoint(this.pointIndex, apply),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      this.pointForm.sync(force)
    }
    this.syncTimeline()
  }

  private selectPoint(index: number): void {
    this.pointIndex = index
    const point = this.pathOf(this.current)[index]
    if (point) this.host.seekTo?.(point.t)
    this.syncPoint(true)
  }

  /** One field of the point at `index` was edited: the path is put back in order of the instants, the point followed to where it now stands. */
  private editPoint(index: number, apply: (point: ParameterHolder) => void): void {
    let edited: DroneWaypoint | undefined
    this.editView(view => {
      const path = this.pathOf(view as unknown as AirshipFlightJson)
      edited = { ...path[index] } as DroneWaypoint
      apply(edited as unknown as ParameterHolder)
      view.path = path.map((other, i) => i === index ? edited! : other).sort((a, b) => a.t - b.t)
    })
    if (edited) this.pointIndex = this.current?.path.indexOf(edited) ?? 0
    this.syncPoint()
  }

  private movePoint(from: number, to: number): void {
    const index = this.pathOf(this.current).findIndex(point => point.t === from)
    if (index < 0) return
    this.editPoint(index, point => { point.t = Math.round(to) })
    this.syncPoint(true)
  }

  /** A point of the path at `t`, where the airship is then; the one already there when there is one. */
  private addPointAt(t: number): void {
    const flight = this.current
    if (!flight) return
    const there = this.pathOf(flight).findIndex(point => Math.abs(point.t - t) < 1)
    if (there >= 0) {
      this.selectPoint(there)
      return
    }
    const point = AirshipParameters.waypointAt(flight, t)
    this.editView(view => {
      view.path = [...this.pathOf(view as unknown as AirshipFlightJson), point].sort((a, b) => a.t - b.t)
    })
    this.selectPoint(this.current?.path.indexOf(point) ?? 0)
  }

  private removePoint(): void {
    const path = this.pathOf(this.current)
    if (path.length <= AirshipEditor.MIN_POINTS) return
    const index = this.pointIndex
    this.editView(view => {
      view.path = path.filter((_, i) => i !== index)
    })
    this.syncPoint(true)
  }

  // The airships.

  /**
   * Writes an edit of the airship on show: its view edited by `apply`, turned back into what the recording states (see
   * AirshipParameters.fromView), in a new interpretation, told to the editor. A light put out as `false` is made an object first, so that a
   * field can be written into it; a light or a wind left with nothing stated is taken away.
   */
  private editView(apply: (view: AirshipView) => void): void {
    const flight = this.current
    if (!flight) return
    const view = structuredClone(this.view!)
    if (view.lights) for (const [name, light] of Object.entries(view.lights)) if (light === false) view.lights[name] = { off: true }
    apply(view)
    if (view.wind) {
      if (view.wind.fromDeg === undefined && view.wind.speedMS === undefined) delete view.wind
      else {
        view.wind.fromDeg ??= 0
        view.wind.speedMS ??= 0
      }
    }
    if (view.lights) {
      for (const [name, light] of Object.entries(view.lights)) if (light !== false && Object.keys(light).length === 0) delete view.lights[name]
      if (Object.keys(view.lights).length === 0) delete view.lights
    }
    const edited = AirshipParameters.fromView(view, flight)
    this.writeFlights(this.flights.map(other => other === flight ? edited : other))
    this.host.changed()
  }

  /** Where the observer is, in the place's own frame, and which way they face. Undefined where the recording has no place. */
  private frontOfObserver(): { eastM: number, northM: number, headingRad: number } | undefined {
    const sighting = this.host.sighting()
    const origin = sighting.event?.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return undefined
    const pose = sighting.observerTrack?.getInterpolatedPoseAt(this.host.currentTime?.() ?? 0)
    const metresPerDegree = 111320
    const eastM = pose?.lng !== undefined ? (pose.lng - origin.lng) * metresPerDegree * Math.cos(origin.lat * Math.PI / 180) : 0
    const northM = pose?.lat !== undefined ? (pose.lat - origin.lat) * metresPerDegree : 0
    return { eastM, northM, headingRad: (pose?.headingDeg ?? 0) * Math.PI / 180 }
  }

  /**
   * A blimp crossing in front of the observer from the playhead: a kilometre and a half ahead, 300 m up, going 900 m across from their left
   * to their right in a minute — a placeholder to be given the real path.
   */
  private addAirship(): void {
    const front = this.frontOfObserver()
    if (!front) return
    let n = this.flights.length + 1
    while (this.flights.some(flight => flight.id === `airship-${n}`)) n++
    const start = Math.round(this.host.currentTime?.() ?? 0)
    const h = front.headingRad
    const at = (t: number, across: number): DroneWaypoint => ({
      t,
      eastM: Math.round(front.eastM + 1500 * Math.sin(h) + across * Math.cos(h)),
      northM: Math.round(front.northM + 1500 * Math.cos(h) - across * Math.sin(h)),
      altitudeM: 300
    })
    const flight: AirshipFlightJson = { id: `airship-${n}`, airship: "blimp", path: [at(start, -450), at(start + 60000, 450)], seed: n }
    this.writeFlights([...this.flights, flight])
    this.host.changed()
    this.show(flight.id)
  }

  private deleteCurrent(): void {
    const flight = this.current
    if (!flight) return
    this.currentId = undefined
    this.writeFlights(this.flights.filter(other => other !== flight))
    this.host.changed()
    this.sync()
  }

  /** The interpretation with these airships, a new one; none left of it when it then says nothing at all. */
  private writeFlights(airships: AirshipFlightJson[]): void {
    const sighting = this.host.sighting()
    const interpretation: InterpretationJson = { ...(sighting.interpretation ?? { bodies: [] }), airships: airships.length > 0 ? airships : undefined }
    if (interpretation.airships === undefined) delete interpretation.airships
    const empty = InterpretationKinds.saysNothing(interpretation, InterpretationRegistry.kinds())
    sighting.interpretation = empty ? undefined : interpretation
  }

  private labelOf(flight: AirshipFlightJson): string {
    const title = this.host.said().read(flight.title)
    return title ? `${title} (${flight.id})` : flight.id
  }

  private get flights(): AirshipFlightJson[] {
    return this.host.sighting().interpretation?.airships ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
