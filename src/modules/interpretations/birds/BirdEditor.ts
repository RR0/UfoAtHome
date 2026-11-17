import { BIRD_PARAMETER_TEXTS } from "./messages/BirdParameterTexts.js"
import type { BirdParameterTexts } from "./messages/BirdParameterTexts.js"
import { ParameterRegistry, ParameterTexts } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet } from "../../../engine/interpretation/Parameters.js"
import { SkyEventEditorStyle } from "../../sky-events/SkyEventEditorStyle.js"
import { BirdParameters } from "./BirdParameters.js"
import type { BirdContext } from "./BirdParameters.js"
import type { BirdFlockJson, BirdWaypoint } from "./BirdFlock.js"
import type { InterpretationJson } from "../../../engine/interpretation/Interpretation.js"
import type { InterpretationEditorHost } from "../InterpretationKind.js"
import type { BirdEditorMessages } from "./messages/BirdEditorMessages.js"
import { BIRD_EDITOR_MESSAGES } from "./messages/BirdEditorMessages.js"
import { ElementList } from "../../../component/ElementList.js"
import { Icons } from "../../../component/Icons.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import { TimelineTracks } from "../../../component/TimelineTracks.js"
import type { TimelineTrack } from "../../../component/TimelineTracks.js"
import { InterpretationKinds } from "../InterpretationKind.js"
import { InterpretationRegistry } from "../interpretationSources.js"

/**
 * The birds of the recording, edited: flocks read into the account as what it saw (see InterpretationJson.birds, BirdFlockJson), each with
 * the fields the bird kind publishes (see BirdParameters), and the points of its path on a timeline of its own beside the recording's
 * playhead (see TimelineTracks): a diamond pressed is the point whose fields are shown, and the playhead goes to it, so that the scene shows
 * the flock then; dragged, it moves in time; the row's "+" puts a point at the playhead, where the flock is then. Every bird's own flight is
 * computed from these, not edited.
 *
 * Every edit replaces the flock edited with an edited copy, in a new interpretation, never changes them where they stand: the scene computes
 * the birds again when the interpretation it is given is another one (see SightingEditorElement.syncBodiesShown).
 */
export class BirdEditor {
  /** Its texts, once they have come (see ready). */
  private messages!: BirdEditorMessages
  /** Settles once the part has its texts and is drawn: nothing of it is shown before, in no language. */
  readonly ready: Promise<void>
  /** The words of its parameters, in its language (see ParameterTexts). */
  private parameterTexts!: BirdParameterTexts
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private timeline?: TimelineTracks
  private pointForm?: ParameterForm
  private pointIndex = 0
  private language: string
  /** The flocks the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly BirdFlockJson[] = []

  /** The part's layout, given with it (see InterpretationKind.editor). */
  private static readonly STYLE = `.bird-editor-part { flex-basis: 100%; min-width: 0; } .bird-editor-part #bird-list, .bird-editor-part #bird-timeline { flex-basis: 100%; min-width: 0; } .bird-editor-part #bird-timeline { padding: 4px 0; } .bird-editor-part #bird-path > .icon-btn { align-self: flex-end; } .bird-editor-part .launch-editor, .bird-editor-part .launch-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .bird-editor-part .launch-fields { flex-basis: 100%; min-width: 0; } .bird-editor-part [hidden] { display: none !important; } .bird-editor-part select { min-width: 0; width: 100%; } .bird-editor-part .launch-intro { flex-basis: 100%; margin: 0; } .bird-editor-part .launch-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .bird-editor-part .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .bird-editor-part input, .bird-editor-part select { max-width: 100%; box-sizing: border-box; } .bird-editor-part input[type="text"] { width: 12em; } .bird-editor-part label { min-width: 0; max-width: 100%; } .bird-editor-part input.parameter-derived::placeholder { opacity: .65; } .bird-editor-part .launch-path { flex: 1 1 100%; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; }`

  /** The path's row, readable over a light ground and a dark one. */
  private static readonly PATH_COLOR = "#3b82c4"

  constructor(private readonly container: HTMLElement, private readonly host: InterpretationEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "bird-editor-part", BirdEditor.STYLE)
    this.language = language
    if (!ParameterRegistry.of("birds")) BirdParameters.publish()
    this.ready = this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the flock on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const [messages, parameterTexts] = await Promise.all([BIRD_EDITOR_MESSAGES.load(language), BIRD_PARAMETER_TEXTS.load(language)])
    if (token !== this.languageToken) return
    this.messages = messages
    this.parameterTexts = parameterTexts
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    if (!this.messages) return
    const flocks = this.flocks
    this.shown = [...flocks]
    if (!flocks.some(flock => flock.id === this.currentId)) this.currentId = flocks[0]?.id
    this.list?.setItems(flocks.map(flock => ({ id: flock.id, label: this.labelOf(flock) })), this.currentId)
    this.syncAddState()
    const flock = this.current
    this.element("bird-fields").hidden = flock === undefined
    if (!flock) return
    const each = this.element("bird-each")
    each.hidden = flock.explainsEach === undefined
    each.textContent = this.messages.explainsEachNote.replace("{n}", String(flock.explainsEach?.length ?? 0))
    this.form ??= new ParameterForm(this.element("bird-parameters"), this.language, "birds.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(this.resolved(BirdParameters.SET), new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editFlock(edited => apply(edited as unknown as ParameterHolder)),
      (): BirdContext => ({ shapes: this.host.shapes().map(shape => ({ value: shape.id, label: shape.label })) }),
      this.host.positionPlace?.()
    ), () => this.written())
    this.syncPoint(true)
  }

  /** Shows what the recording states only if it holds other flocks than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    if (!this.messages) return
    this.syncAddState()
    const flocks = this.flocks
    if (flocks.length === this.shown.length && flocks.every((flock, i) => flock.id === this.shown[i].id)) {
      // The recording's length or its playhead may have changed meanwhile.
      this.syncTimeline()
      return
    }
    this.sync()
  }

  /** The playhead has moved: only it is drawn again, as at every frame of a playback. */
  setTime(t: number): void {
    if (!this.messages) return
    this.timeline?.setTime(t)
  }

  /** Birds are put in front of the observer: they can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.frontOfObserver() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addNowhere)
  }

  /** The flock on show, if any. */
  get current(): BirdFlockJson | undefined {
    return this.flocks.find(flock => flock.id === this.currentId)
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
      <div id="bird-list"></div>
      <div id="bird-fields" class="launch-fields">
        <div id="bird-parameters" class="launch-parameters"></div>
        <p id="bird-each" class="launch-intro" hidden></p>
        <div id="bird-timeline"></div>
        <p class="launch-intro">${m.timelineNote}</p>
        <fieldset id="bird-path" class="launch-path">
          <legend>${this.parameterTexts.pointOfThePath}</legend>
          <div id="bird-point-parameters" class="launch-parameters"></div>
          <button id="bird-point-delete" class="icon-btn" type="button" title="${m.deletePoint}" aria-label="${m.deletePoint}">${Icons.TRASH}</button>
        </fieldset>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("bird-list"), body: this.element("bird-fields"),
      ids: { list: "bird-select", remove: "bird-delete", add: "bird-add" },
      onSelect: id => this.show(id),
      onAdd: () => this.addFlock(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.flock, remove: m.deleteFlock, add: m.addFlock, empty: m.none })
    this.timeline = new TimelineTracks(this.element("bird-timeline"), t => this.host.seekTo?.(t), { addKeyframeHere: m.addPointHere, keyframeHere: m.pointHere, zoomHint: m.zoomHint })
    this.element("bird-point-delete").addEventListener("click", () => this.removePoint())
  }

  /** Shows a flock by its id, from the first point of its path. */
  show(id: string): void {
    if (!this.messages) return
    this.currentId = id
    this.pointIndex = 0
    this.sync()
  }

  /** A field was written onto the flock. */
  private written(): void {
    const flock = this.current
    if (flock) this.list?.rename(flock.id, this.labelOf(flock))
    this.syncPoint()
  }

  // The path.

  /** The points of the path, in the order of their instants. */
  private pathOf(flock: BirdFlockJson | undefined): BirdWaypoint[] {
    return [...flock?.path ?? []].sort((a, b) => a.t - b.t)
  }

  /** A flock needs one point to be somewhere; two to fly. */
  private static readonly MIN_POINTS = 1

  /** The path's row of the timeline, drawn again only when what it shows has changed (see TimelineTracks.show). */
  private syncTimeline(): void {
    const flock = this.current
    if (!this.timeline || !flock) return
    const path = this.pathOf(flock)
    const row: TimelineTrack = {
      id: "path", label: this.messages.path, color: BirdEditor.PATH_COLOR,
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
    // Over its path, a tenth more on either side so that a diamond at either end can be pressed and dragged.
    const from = path[0]?.t ?? 0
    const to = path[path.length - 1]?.t ?? 0
    const margin = Math.max(500, (to - from) / 10)
    this.timeline.show([row], this.host.duration?.() ?? to, this.host.currentTime?.() ?? 0, { from: from - margin, to: to + margin })
  }

  /** The fields of the point of the path picked. */
  private syncPoint(force = false): void {
    const path = this.pathOf(this.current)
    this.pointIndex = Math.max(0, Math.min(this.pointIndex, path.length - 1))
    ;(this.element("bird-point-delete") as HTMLButtonElement).disabled = path.length <= BirdEditor.MIN_POINTS
    if (!this.pointForm) {
      this.pointForm = new ParameterForm(this.element("bird-point-parameters"), this.language, "birdsPoint.")
      this.pointForm.show(this.resolved(BirdParameters.WAYPOINT), new ParameterTarget(
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
    let edited: BirdWaypoint | undefined
    this.editFlock(flock => {
      const path = this.pathOf(flock)
      edited = { ...path[index] } as BirdWaypoint
      apply(edited as unknown as ParameterHolder)
      flock.path = path.map((other, i) => i === index ? edited! : other).sort((a, b) => a.t - b.t)
    })
    if (edited) this.pointIndex = this.current?.path.indexOf(edited) ?? 0
    this.syncPoint()
  }

  /** A diamond dragged in time: the point it stands for, picked, now at `to`. */
  private movePoint(from: number, to: number): void {
    const index = this.pathOf(this.current).findIndex(point => point.t === from)
    if (index < 0) return
    this.editPoint(index, point => { point.t = Math.round(to) })
    this.syncPoint(true)
  }

  /** A point of the path at `t`, where the flock is then; the one already there when there is one. */
  private addPointAt(t: number): void {
    const flock = this.current
    if (!flock) return
    const there = this.pathOf(flock).findIndex(point => Math.abs(point.t - t) < 1)
    if (there >= 0) {
      this.selectPoint(there)
      return
    }
    const point = BirdParameters.waypointAt(flock, t)
    this.editFlock(edited => {
      edited.path = [...this.pathOf(edited), point].sort((a, b) => a.t - b.t)
    })
    this.selectPoint(this.current?.path.indexOf(point) ?? 0)
  }

  private removePoint(): void {
    const path = this.pathOf(this.current)
    if (path.length <= BirdEditor.MIN_POINTS) return
    const index = this.pointIndex
    this.editFlock(flock => {
      flock.path = path.filter((_, i) => i !== index)
    })
    this.syncPoint(true)
  }

  // The flocks.

  /**
   * Writes an edit of the flock on show: a copy edited by `apply`, in a new interpretation (see the class), told to the editor. What a
   * field leaves half said is completed with what was in force, so that the birds can still be computed: an arrangement given an angle
   * and no kind keeps the kind it had, bursts given no count of beats beat as many as before.
   */
  private editFlock(apply: (flock: BirdFlockJson) => void): void {
    const flock = this.current
    if (!flock) return
    const edited: BirdFlockJson = structuredClone(flock)
    apply(edited)
    if (edited.formation && edited.formation.kind === undefined) {
      const rest = Object.entries(edited.formation).some(([key, value]) => key !== "kind" && value !== undefined)
      if (rest) edited.formation.kind = flock.formation?.kind ?? ((edited.count ?? 1) > 1 ? "cluster" : "single")
      else delete edited.formation
    }
    const flight = edited.flight as Partial<{ kind: string, beats: number, glideS: number }> | undefined
    if (flight) {
      if (flight.kind === undefined) delete edited.flight
      else if (flight.kind !== "flapping") {
        const before = flock.flight?.kind !== "flapping" ? flock.flight : undefined
        const own = BirdParameters.BURST
        flight.beats ??= before?.beats ?? own.beats
        flight.glideS ??= before?.glideS ?? own.glideS
      }
    }
    this.writeFlocks(this.flocks.map(other => other === flock ? edited : other))
    this.host.changed()
  }

  /**
   * Where new birds fly: from three hundred metres in front of the observer and a hundred and twenty to their left, sixty metres up,
   * across their view to the right in twenty seconds from the playhead — a placeholder to be given the real path. Undefined where the
   * recording has no place.
   */
  private frontOfObserver(): { eastM: number, northM: number, headingRad: number } | undefined {
    const sighting = this.host.sighting()
    const origin = sighting.event?.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return undefined
    const pose = sighting.observerTrack?.getInterpolatedPoseAt(this.host.currentTime?.() ?? 0)
    const metresPerDegree = 111320
    // The observer may not stand at the place itself: in front of them, in the place's own frame.
    const eastM = pose?.lng !== undefined ? (pose.lng - origin.lng) * metresPerDegree * Math.cos(origin.lat * Math.PI / 180) : 0
    const northM = pose?.lat !== undefined ? (pose.lat - origin.lat) * metresPerDegree : 0
    return { eastM, northM, headingRad: (pose?.headingDeg ?? 0) * Math.PI / 180 }
  }

  /** A dozen herring gulls in a loose crowd crossing in front of the observer (see frontOfObserver): the common case, to be told apart by the fields. */
  private addFlock(): void {
    const front = this.frontOfObserver()
    if (!front) return
    let n = this.flocks.length + 1
    while (this.flocks.some(flock => flock.id === `birds-${n}`)) n++
    const start = Math.round(this.host.currentTime?.() ?? 0)
    const at = (t: number, aheadM: number, acrossM: number): BirdWaypoint => ({
      t,
      eastM: Math.round(front.eastM + aheadM * Math.sin(front.headingRad) + acrossM * Math.cos(front.headingRad)),
      northM: Math.round(front.northM + aheadM * Math.cos(front.headingRad) - acrossM * Math.sin(front.headingRad)),
      altitudeM: 60
    })
    const flock: BirdFlockJson = {
      id: `birds-${n}`,
      species: "herring-gull",
      count: 12,
      formation: { kind: "cluster" },
      path: [at(start, 300, -120), at(start + 20000, 300, 120)],
      seed: n
    }
    this.writeFlocks([...this.flocks, flock])
    this.host.changed()
    this.show(flock.id)
  }

  private deleteCurrent(): void {
    const flock = this.current
    if (!flock) return
    this.currentId = undefined
    this.writeFlocks(this.flocks.filter(other => other !== flock))
    this.host.changed()
    this.sync()
  }

  /** The interpretation with these flocks, a new one; none left of it when it then says nothing at all. */
  private writeFlocks(birds: BirdFlockJson[]): void {
    const sighting = this.host.sighting()
    const interpretation = { ...(sighting.interpretation ?? { bodies: [] }), birds: birds.length > 0 ? birds : undefined } as InterpretationJson & { birds?: BirdFlockJson[] }
    if (interpretation.birds === undefined) delete interpretation.birds
    const empty = InterpretationKinds.saysNothing(interpretation, InterpretationRegistry.kinds())
    sighting.interpretation = empty ? undefined : interpretation
  }

  private labelOf(flock: BirdFlockJson): string {
    const title = this.host.said().read(flock.title)
    return title ? `${title} (${flock.id})` : flock.id
  }

  private get flocks(): BirdFlockJson[] {
    return (this.host.sighting().interpretation as { birds?: BirdFlockJson[] } | undefined)?.birds ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
