import { BALLOON_PARAMETER_TEXTS } from "./messages/BalloonParameterTexts.js"
import type { BalloonParameterTexts } from "./messages/BalloonParameterTexts.js"
import { ParameterRegistry, ParameterTexts } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet } from "../../../engine/interpretation/Parameters.js"
import { SkyEventEditorStyle } from "../../sky-events/SkyEventEditorStyle.js"
import { BalloonParameters } from "./BalloonParameters.js"
import type { BalloonContext, BalloonView } from "./BalloonParameters.js"
import type { BalloonFlightJson } from "./BalloonFlight.js"
import type { InterpretationJson } from "../../../engine/interpretation/Interpretation.js"
import type { InterpretationEditorHost } from "../InterpretationKind.js"
import { resolveWeatherAt } from "../../../engine/model/Sighting.js"
import type { BalloonEditorMessages } from "./messages/BalloonEditorMessages.js"
import { BALLOON_EDITOR_MESSAGES } from "./messages/BalloonEditorMessages.js"
import { ElementList } from "../../../component/ElementList.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import { InterpretationKinds } from "../InterpretationKind.js"
import { InterpretationRegistry } from "../interpretationSources.js"

/**
 * The balloons of the recording, edited: balloons read into the account as what it saw (see InterpretationJson.balloons,
 * BalloonFlightJson), each with the fields the balloon kind publishes (see BalloonParameters). Their flights are computed, not edited.
 *
 * The form edits the flight's view (see BalloonView), turned back into what the recording states at every edit. Every edit replaces the
 * flight edited with an edited copy, in a new interpretation, never changes it where it stands: the scene computes the balloons again when
 * the interpretation it is given is another one (see SightingEditorElement.syncBodiesShown).
 */
export class BalloonEditor {
  /** Its texts, once they have come (see ready). */
  private messages!: BalloonEditorMessages
  /** Settles once the part has its texts and is drawn: nothing of it is shown before, in no language. */
  readonly ready: Promise<void>
  /** The words of its parameters, in its language (see ParameterTexts). */
  private parameterTexts!: BalloonParameterTexts
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private language: string
  /** The flights the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly BalloonFlightJson[] = []
  /** The view of the flight on show, made again whenever it is another (see view). */
  private viewed?: { of: BalloonFlightJson, view: BalloonView }

  /** The part's layout, given with it (see InterpretationKind.editor): a lantern's (see LanternEditor). */
  private static readonly STYLE = `
.balloon-editor-part, .balloon-editor-part #balloon-list, .balloon-editor-part .launch-fields { flex-basis: 100%; min-width: 0; }
.balloon-editor-part .launch-editor, .balloon-editor-part .launch-fields { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
.balloon-editor-part [hidden] { display: none !important; }
.balloon-editor-part .launch-intro { flex-basis: 100%; margin: 0; }
.balloon-editor-part .launch-parameters { flex-basis: 100%; min-width: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 20em), 1fr)); gap: 12px; align-items: start; }
.balloon-editor-part .parameter-group { min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
.balloon-editor-part .parameter-group > label { display: flex; flex-wrap: wrap; align-items: center; gap: .35em .5em; min-width: 0; max-width: 100%; }
.balloon-editor-part .parameter-group > label > span { flex: 1 1 11em; min-width: 0; overflow-wrap: anywhere; }
.balloon-editor-part .parameter-row { width: 100%; min-width: 0; }
.balloon-editor-part rr0-input-position { min-width: 0; max-width: 100%; }
.balloon-editor-part rr0-input-position .position-from { flex-wrap: wrap; white-space: normal; min-width: 0; max-width: 100%; }
.balloon-editor-part input, .balloon-editor-part select { min-width: 0; max-width: 100%; box-sizing: border-box; }
.balloon-editor-part input[type="text"] { width: 12em; }
.balloon-editor-part input.parameter-derived::placeholder { opacity: .65; }
`

  constructor(private readonly container: HTMLElement, private readonly host: InterpretationEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "balloon-editor-part", BalloonEditor.STYLE)
    this.language = language
    if (!ParameterRegistry.of("balloons")) BalloonParameters.publish()
    this.ready = this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the flight on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const [messages, parameterTexts] = await Promise.all([BALLOON_EDITOR_MESSAGES.load(language), BALLOON_PARAMETER_TEXTS.load(language)])
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
    this.element("balloon-fields").hidden = flight === undefined
    if (!flight) return
    this.syncNotes()
    this.form ??= new ParameterForm(this.element("balloon-parameters"), this.language, "balloons.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(this.resolved(BalloonParameters.SET), new ParameterTarget(
      () => this.view as unknown as ParameterHolder | undefined,
      apply => this.editView(view => apply(view as unknown as ParameterHolder)),
      (): BalloonContext => ({ shapes: this.host.shapes().map(shape => ({ value: shape.id, label: shape.label })) }),
      this.host.positionPlace?.()
    ), () => this.written())
  }

  /** Shows what the recording states only if it holds other flights than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    if (!this.messages) return
    this.syncAddState()
    const flights = this.flights
    if (flights.length === this.shown.length && flights.every((flight, i) => flight.id === this.shown[i].id)) return
    this.sync()
  }

  /** The flight on show, if any. */
  get current(): BalloonFlightJson | undefined {
    return this.flights.find(flight => flight.id === this.currentId)
  }

  /** The form's view of the flight on show (see BalloonView): the same object for as long as the flight is the same. */
  private get view(): BalloonView | undefined {
    const flight = this.current
    if (!flight) return undefined
    if (this.viewed?.of !== flight) this.viewed = { of: flight, view: BalloonParameters.viewOf(flight) }
    return this.viewed.view
  }

  /** Balloons are let go in front of the observer: they can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.frontOfObserver() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addNowhere)
  }

  /** What the recording states that the form does not show, said: releases one by one past the first, winds aloft past the first, a plan. */
  private syncNotes(): void {
    const flight = this.current!
    const releases = flight.group ? flight.releases?.length ?? 0 : Math.max(0, (flight.releases?.length ?? 0) - 1)
    const winds = Math.max(0, (flight.windsAloft?.length ?? 0) - 1)
    const plan = (flight.plan?.length ?? 0) > 1 ? flight.plan!.length : 0
    const notes = [
      releases > 0 ? this.messages.releasesNote.replace("{n}", String(releases)) : "",
      winds > 0 ? this.messages.windsNote.replace("{n}", String(winds)) : "",
      plan > 0 ? this.messages.planNote.replace("{n}", String(plan)) : ""
    ].filter(Boolean)
    const note = this.element("balloon-kept")
    note.hidden = notes.length === 0
    note.textContent = notes.join(" ")
  }

  /** A set of its parameters in its language (see ParameterTexts.resolve). */
  private resolved(set: ParameterSet): ParameterSet {
    return ParameterTexts.resolve(set, this.parameterTexts)
  }

  private render(): void {
    if (!this.messages) return
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="balloon-list"></div>
      <div id="balloon-fields" class="launch-fields">
        <div id="balloon-parameters" class="launch-parameters"></div>
        <p id="balloon-kept" class="launch-intro" hidden></p>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("balloon-list"), body: this.element("balloon-fields"),
      ids: { list: "balloon-select", remove: "balloon-delete", add: "balloon-add" },
      onSelect: id => { this.currentId = id; this.sync() },
      onAdd: () => this.addBalloon(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.balloon, remove: m.deleteBalloon, add: m.addBalloon, empty: m.none })
  }

  /** A field was written onto the flight. */
  private written(): void {
    const flight = this.current
    if (!flight) return
    this.list?.rename(flight.id, this.labelOf(flight))
    this.syncNotes()
  }

  /** Writes an edit of the flight on show: its view edited by `apply`, turned back into what the recording states, in a new interpretation. */
  private editView(apply: (view: BalloonView) => void): void {
    const flight = this.current
    if (!flight) return
    const view = structuredClone(this.view!)
    apply(view)
    const edited = BalloonParameters.fromView(view, flight)
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
   * A weather balloon let go at the playhead a kilometre in front of the observer, into the recording's wind: the commonest balloon taken for
   * something else, to be given its real type, site and instant.
   */
  private addBalloon(): void {
    const front = this.frontOfObserver()
    if (!front) return
    let n = this.flights.length + 1
    while (this.flights.some(flight => flight.id === `balloon-${n}`)) n++
    const sighting = this.host.sighting()
    // The recording's wind, where it states a weather.
    const weather = sighting.weatherTrack ? resolveWeatherAt(sighting, this.host.currentTime?.() ?? 0) : undefined
    const flight: BalloonFlightJson = {
      id: `balloon-${n}`,
      balloon: "weather",
      site: { eastM: Math.round(front.eastM + 1000 * Math.sin(front.headingRad)), northM: Math.round(front.northM + 1000 * Math.cos(front.headingRad)) },
      releases: [{ t: Math.round(this.host.currentTime?.() ?? 0) }],
      // Where the wind blows TOWARDS, where a weather states where it comes FROM.
      ...(weather ? { wind: { towardDeg: Math.round((weather.windDirectionDeg + 180) % 360), speedMS: Math.round(weather.windSpeed * 10) / 10 } } : {})
    }
    this.writeFlights([...this.flights, flight])
    this.currentId = flight.id
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const flight = this.current
    if (!flight) return
    this.currentId = undefined
    this.writeFlights(this.flights.filter(other => other !== flight))
    this.host.changed()
    this.sync()
  }

  /** The interpretation with these flights, a new one; none left of it when it then says nothing at all. */
  private writeFlights(balloons: BalloonFlightJson[]): void {
    const sighting = this.host.sighting()
    const interpretation: InterpretationJson = { ...(sighting.interpretation ?? { bodies: [] }), balloons: balloons.length > 0 ? balloons : undefined }
    if (interpretation.balloons === undefined) delete interpretation.balloons
    const empty = InterpretationKinds.saysNothing(interpretation, InterpretationRegistry.kinds())
    sighting.interpretation = empty ? undefined : interpretation
  }

  private labelOf(flight: BalloonFlightJson): string {
    const title = this.host.said().read(flight.title)
    return title ? `${title} (${flight.id})` : flight.id
  }

  private get flights(): BalloonFlightJson[] {
    return this.host.sighting().interpretation?.balloons ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
