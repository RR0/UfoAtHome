import { SkyEventEditorStyle } from "../SkyEventEditorStyle.js"
import { ReentryParameters } from "./ReentryParameters.js"
import type { ReentryFragment, ReentryJson, ReentryKeyframe } from "./Reentry.js"
import type { ParameterHolder } from "../../../engine/interpretation/Parameters.js"
import type { Sighting } from "../../../engine/model/Sighting.js"
import type { SaidTexts } from "../../../engine/model/SaidText.js"
import { SkyEvents } from "../../../engine/model/SkyEvents.js"
import type { ReentryEditorMessages } from "./messages/ReentryEditorMessages.js"
import { REENTRY_EDITOR_MESSAGES } from "./messages/ReentryEditorMessages.js"
import { ElementList } from "../../../component/ElementList.js"
import { Icons } from "../../../component/Icons.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import type { PositionPlace } from "../../../component/ParameterForm.js"
import { TimelineTracks } from "../../../component/TimelineTracks.js"
import type { TimelineTrack } from "../../../component/TimelineTracks.js"

/** What the Fireballs part needs of the editor it stands in, read at every use. */
export interface ReentryEditorHost {
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

type Kind = "fireball" | "reentry"

/**
 * The fireballs and re-entries of the recording, edited: facts of its sky (see SkyEventsJson, ReentryJson), each with its name and object,
 * the points of its path, and its burning pieces, each with its light curve (see ReentryParameters).
 *
 * What happens when is laid out on a timeline of its own, beside the recording's playhead (see TimelineTracks): a row for the path, its
 * points as diamonds, and a row for each piece, its life as a bar and the points of its light curve as diamonds. A diamond pressed is the
 * point whose fields are shown, and the playhead goes to it, so that the scene shows the fireball then; dragged, it moves in time; the "+"
 * of a row puts a point at the playhead, where the path or the light is then, so that putting it changes nothing until it is edited.
 *
 * Every edit replaces the re-entry edited with an edited copy, and the list with a new list, never changes them where they stand: the
 * pieces of a re-entry and its detonations are worked out once per re-entry object (see ReentrySighting.piecesOf, SceneElement.hearDetonations),
 * and an edit made in place would not be seen.
 */
export class ReentryEditor {
  /** Its texts, once they have come (see ready). */
  private messages!: ReentryEditorMessages
  /** Settles once the part has its texts and is drawn: nothing of it is shown before, in no language. */
  readonly ready: Promise<void>
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private timeline?: TimelineTracks
  private placeForm?: ParameterForm
  private placeIndex = 0
  /** The row of the timeline whose details are shown under it: the path, or the piece at fragmentIndex. */
  private row: "path" | "fragment" = "path"
  private fragmentForm?: ParameterForm
  private fragmentIndex = 0
  private curveForm?: ParameterForm
  private curveIndex = 0
  private language: string
  /** The re-entries the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly ReentryJson[] = []

  /** The part's layout, given with it (see SkyEventKind.editor). */
  private static readonly STYLE = `.reentry-editor-part { flex-basis: 100%; min-width: 0; } .reentry-editor-part #reentry-timeline { flex-basis: 100%; min-width: 0; padding: 4px 0; } .reentry-editor-part #reentry-path > .icon-btn, .reentry-editor-part #reentry-curve > .icon-btn { align-self: flex-end; } .reentry-editor-part #reentry-list, .reentry-editor-part #reentry-places, .reentry-editor-part #reentry-fragment-list, .reentry-editor-part #reentry-curve-list { flex-basis: 100%; min-width: 0; } .reentry-editor-part .launch-editor, .reentry-editor-part .launch-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .reentry-editor-part .launch-fields { flex-basis: 100%; min-width: 0; } .reentry-editor-part [hidden] { display: none !important; } .reentry-editor-part select { min-width: 0; width: 100%; } .reentry-editor-part .launch-intro { flex-basis: 100%; margin: 0; } .reentry-editor-part .launch-track { flex-basis: 100%; margin: 0; } .reentry-editor-part .launch-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .reentry-editor-part .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .reentry-editor-part input, .reentry-editor-part select { max-width: 100%; box-sizing: border-box; } .reentry-editor-part input[type="text"] { width: 12em; } .reentry-editor-part input[data-key="title"] { width: 18em; } .reentry-editor-part label { min-width: 0; max-width: 100%; } .reentry-editor-part input.parameter-derived::placeholder { opacity: .65; } .reentry-editor-part .launch-path { flex: 1 1 100%; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; }`

  constructor(private readonly container: HTMLElement, private readonly host: ReentryEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "reentry-editor-part", ReentryEditor.STYLE)
    this.language = language
    this.ready = this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the re-entry on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const messages = await REENTRY_EDITOR_MESSAGES.load(language)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    if (!this.messages) return
    const reentries = this.reentries
    this.shown = [...reentries]
    if (!reentries.some(reentry => reentry.id === this.currentId)) this.currentId = reentries[0]?.id
    this.list?.setItems(reentries.map(reentry => ({ id: reentry.id, label: this.labelOf(reentry) })), this.currentId)
    this.syncAddState()
    const reentry = this.current
    this.element("reentry-fields").hidden = reentry === undefined
    if (!reentry) return
    this.syncPlace(true)
    this.syncFragments(reentry, true)
    this.form ??= new ParameterForm(this.element("reentry-parameters"), this.language, "reentry.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(ReentryParameters.SET, new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editReentry(edited => {
        // The object is copied before it is written to: the one of the re-entry before the edit is left as it was.
        if (edited.object) edited.object = { ...edited.object }
        apply(edited as unknown as ParameterHolder)
        if (edited.object && Object.values(edited.object).every(value => value === undefined || value === "")) delete edited.object
      })
    ), () => this.written())
  }

  /** Shows what the recording states only if it holds other re-entries than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    if (!this.messages) return
    this.syncAddState()
    const reentries = this.reentries
    if (reentries.length === this.shown.length && reentries.every((reentry, i) => reentry.id === this.shown[i].id)) {
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

  /** A fireball is put in front of the observer: it can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.origin() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addNowhere)
  }

  /** The re-entry on show, if any. */
  get current(): ReentryJson | undefined {
    return this.reentries.find(reentry => reentry.id === this.currentId)
  }

  /** Shows a re-entry by its id. */
  show(id: string): void {
    if (!this.messages) return
    this.currentId = id
    this.row = "path"
    this.placeIndex = 0
    this.fragmentIndex = 0
    this.curveIndex = 0
    this.sync()
  }

  private render(): void {
    if (!this.messages) return
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="reentry-list"></div>
      <div id="reentry-fields" class="launch-fields">
        <div id="reentry-parameters" class="launch-parameters"></div>
        <div id="reentry-timeline"></div>
        <button id="reentry-fragment-add" type="button" title="${m.addFragment}">${Icons.PLUS} ${m.fragment}</button>
        <p class="launch-intro">${m.timelineNote}</p>
        <fieldset id="reentry-path" class="launch-path">
          <legend>${m.path}</legend>
          <div id="reentry-place-parameters" class="launch-parameters"></div>
          <button id="reentry-place-delete" class="icon-btn" type="button" title="${m.deletePlace}" aria-label="${m.deletePlace}">${Icons.TRASH}</button>
        </fieldset>
        <fieldset id="reentry-fragments" class="launch-path">
          <legend id="reentry-fragment-legend">${m.fragment}</legend>
          <div id="reentry-fragment-parameters" class="launch-parameters"></div>
          <button id="reentry-fragment-delete" class="icon-btn" type="button" title="${m.deleteFragment}" aria-label="${m.deleteFragment}">${Icons.TRASH}</button>
          <fieldset id="reentry-curve" class="launch-path">
            <legend>${m.curve}</legend>
            <p id="reentry-curve-empty" class="launch-intro">${m.noCurve}</p>
            <div id="reentry-curve-parameters" class="launch-parameters"></div>
            <button id="reentry-curve-delete" class="icon-btn" type="button" title="${m.deleteCurvePoint}" aria-label="${m.deleteCurvePoint}">${Icons.TRASH}</button>
          </fieldset>
        </fieldset>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("reentry-list"), body: this.element("reentry-fields"),
      ids: { list: "reentry-select", remove: "reentry-delete", add: "reentry-add", kinds: "reentry-add-kind", kind: kind => `reentry-add-${kind}` },
      onSelect: id => this.show(id),
      onAdd: kind => this.addReentry(kind === "reentry" ? "reentry" : "fireball"),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.reentry, remove: m.deleteReentry, add: m.addReentry, empty: m.none })
    this.list.setKinds([{ value: "fireball", label: m.kindFireball }, { value: "reentry", label: m.kindReentry }])
    this.timeline = new TimelineTracks(this.element("reentry-timeline"), t => this.host.seekTo(t), { addKeyframeHere: m.addPointHere, keyframeHere: m.pointHere, zoomHint: m.zoomHint })
    this.element("reentry-place-delete").addEventListener("click", () => this.removePlace())
    this.element("reentry-curve-delete").addEventListener("click", () => this.removeCurvePoint())
    this.placeForm = undefined
    this.element("reentry-fragment-add").addEventListener("click", () => this.addFragment())
    this.element("reentry-fragment-delete").addEventListener("click", () => this.removeFragment())
    this.fragmentForm = undefined
    this.curveForm = undefined
  }

  /** A field was written onto the re-entry. */
  private written(): void {
    const reentry = this.current
    if (reentry) this.list?.rename(reentry.id, this.labelOf(reentry))
  }

  // The timeline.

  /**
   * The rows of the part's timeline (see the class): drawn again only when what they show has changed (see TimelineTracks.show), the
   * point whose fields are shown marked on its row.
   */
  private syncTimeline(): void {
    const reentry = this.current
    if (!this.timeline || !reentry) return
    const m = this.messages
    const first = reentry.track[0]?.t ?? 0
    const last = reentry.track[reentry.track.length - 1]?.t ?? 0
    const path: TimelineTrack = {
      id: "path", label: m.path, color: ReentryEditor.PATH_COLOR,
      times: reentry.track.map(place => place.t),
      active: this.row === "path",
      selectedTime: this.row === "path" ? reentry.track[this.placeIndex]?.t : undefined,
      open: () => this.selectPlace(this.placeIndex),
      pressed: (_t, key) => {
        const index = key === undefined ? -1 : (this.current?.track ?? []).findIndex(place => place.t === key)
        this.selectPlace(index >= 0 ? index : this.placeIndex)
      },
      move: (from, to) => this.movePlace(from, to),
      add: () => this.addPlaceAt(this.host.currentTime())
    }
    const pieces = reentry.fragments.map((fragment, i): TimelineTrack => {
      const curve = fragment.lightCurve ?? []
      return {
        // Not the piece's own colour, a near white for the brightest, which no diamond would show on a light ground.
        id: `fragment-${i}`, label: this.fragmentLabel(fragment, i), color: ReentryEditor.PIECE_COLOR,
        times: curve.map(point => point.t),
        spans: [{ t: fragment.fromT ?? first, until: fragment.untilT ?? last, label: "" }],
        active: this.row === "fragment" && i === this.fragmentIndex,
        selectedTime: this.row === "fragment" && i === this.fragmentIndex ? curve[this.curveIndex]?.t : undefined,
        open: () => this.selectFragment(i),
        pressed: (_t, key) => {
          const index = key === undefined ? -1 : (this.current?.fragments[i]?.lightCurve ?? []).findIndex(point => point.t === key)
          this.selectFragment(i, index >= 0 ? index : undefined)
        },
        move: (from, to) => this.moveCurvePoint(i, from, to),
        add: () => this.addCurvePointAt(i, this.host.currentTime())
      }
    })
    // Over what happens to it, a tenth more on either side so that a diamond at either end can be pressed and dragged.
    const instants = ReentryParameters.instantsOf(reentry)
    const from = Math.min(...instants)
    const to = Math.max(...instants)
    const margin = Math.max(500, (to - from) / 10)
    this.timeline.show([path, ...pieces], this.host.duration(), this.host.currentTime(), { from: from - margin, to: to + margin })
  }

  // The path.

  /** The rows of the timeline: the path's, and every piece's, readable over a light ground and a dark one. */
  private static readonly PATH_COLOR = "#e08a1e"
  private static readonly PIECE_COLOR = "#c0581b"

  /** A path needs two points to be a path at all. */
  private static readonly MIN_PLACES = 2

  /** The fields of the point of the path picked. */
  private syncPlace(force = false): void {
    const track = this.current?.track ?? []
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, track.length - 1))
    ;(this.element("reentry-place-delete") as HTMLButtonElement).disabled = track.length <= ReentryEditor.MIN_PLACES
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("reentry-place-parameters"), this.language, "reentryPlace.")
      this.placeForm.show(ReentryParameters.PLACE, new ParameterTarget(
        () => this.current?.track[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPlace(this.placeIndex, apply),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      this.placeForm.sync(force)
    }
    this.syncTimeline()
  }

  private selectPlace(index: number): void {
    this.row = "path"
    this.placeIndex = index
    this.syncDetail()
    this.syncPlace(true)
  }

  /** Under the timeline, the details of its row picked alone: the path's point, or the piece and its light curve. */
  private syncDetail(): void {
    this.element("reentry-path").hidden = this.row !== "path"
    this.element("reentry-fragments").hidden = this.row !== "fragment"
    const fragment = this.currentFragment
    this.element("reentry-fragment-legend").textContent = fragment ? `${this.messages.fragment} ${this.fragmentLabel(fragment, this.fragmentIndex)}` : this.messages.fragment
  }

  /** One field of the place at `index` was edited: the path is put back in order of the instants, the place followed to where it now stands. */
  private editPlace(index: number, apply: (place: ParameterHolder) => void): void {
    let edited: ReentryKeyframe | undefined
    this.editReentry(reentry => {
      edited = { ...reentry.track[index] }
      apply(edited as unknown as ParameterHolder)
      reentry.track = reentry.track.map((other, i) => i === index ? edited! : other).sort((a, b) => a.t - b.t)
    })
    if (edited) this.placeIndex = this.current?.track.indexOf(edited) ?? 0
    this.syncPlace()
  }

  /** A diamond of the path dragged in time: the point it stands for, picked, now at `to`. */
  private movePlace(from: number, to: number): void {
    const index = this.current?.track.findIndex(place => place.t === from) ?? -1
    if (index < 0) return
    this.editPlace(index, place => { place.t = to })
    this.syncPlace(true)
  }

  /** A point of the path at `t`, where the fireball is then; the one already there when there is one. */
  private addPlaceAt(t: number): void {
    const reentry = this.current
    if (!reentry) return
    const there = reentry.track.findIndex(place => Math.abs(place.t - t) < 1)
    if (there >= 0) {
      this.selectPlace(there)
      return
    }
    const place = ReentryParameters.placeAt(reentry, t)
    this.editReentry(edited => {
      edited.track = [...edited.track, place].sort((a, b) => a.t - b.t)
    })
    this.selectPlace(this.current?.track.indexOf(place) ?? 0)
  }

  private removePlace(): void {
    if ((this.current?.track.length ?? 0) <= ReentryEditor.MIN_PLACES) return
    const index = this.placeIndex
    this.editReentry(reentry => {
      reentry.track = reentry.track.filter((_, i) => i !== index)
    })
    this.syncPlace(true)
  }

  // The pieces.

  /** Something has to burn for anything to be seen. */
  private static readonly MIN_FRAGMENTS = 1

  private fragmentLabel(fragment: ReentryFragment, index: number): string {
    return fragment.id ?? String(index + 1)
  }

  private syncFragments(reentry: ReentryJson, force = false): void {
    const fragments = reentry.fragments
    this.fragmentIndex = Math.max(0, Math.min(this.fragmentIndex, fragments.length - 1))
    ;(this.element("reentry-fragment-delete") as HTMLButtonElement).disabled = fragments.length <= ReentryEditor.MIN_FRAGMENTS
    this.syncDetail()
    if (!this.fragmentForm) {
      this.fragmentForm = new ParameterForm(this.element("reentry-fragment-parameters"), this.language, "reentryFragment.")
      this.fragmentForm.show(ReentryParameters.FRAGMENT, new ParameterTarget(
        () => this.currentFragment as unknown as ParameterHolder | undefined,
        apply => this.editFragment(fragment => apply(fragment as unknown as ParameterHolder)),
        () => this.current
      ), () => undefined)
    } else {
      this.fragmentForm.sync(force)
    }
    this.syncCurve(force)
  }

  /** Picks the piece at `index`, and the point of its light curve at `curveIndex` when one is said. */
  private selectFragment(index: number, curveIndex?: number): void {
    const changed = index !== this.fragmentIndex
    this.row = "fragment"
    this.fragmentIndex = index
    if (curveIndex !== undefined) this.curveIndex = curveIndex
    else if (changed) this.curveIndex = 0
    if (this.current) this.syncFragments(this.current, true)
  }

  private get currentFragment(): ReentryFragment | undefined {
    return this.current?.fragments[this.fragmentIndex]
  }

  /** Writes an edit of the piece at `index`, as a copy (its light curve too) in an edited copy of the re-entry. */
  private editFragment(apply: (fragment: ReentryFragment) => void, index = this.fragmentIndex): void {
    this.editReentry(reentry => {
      const fragment: ReentryFragment = { ...reentry.fragments[index] }
      if (fragment.lightCurve) fragment.lightCurve = [...fragment.lightCurve]
      apply(fragment)
      reentry.fragments = reentry.fragments.map((other, i) => i === index ? fragment : other)
    })
    this.syncDetail()
    this.syncTimeline()
  }

  /** A piece a little behind the last, a magnitude fainter: the train of a break-up. */
  private addFragment(): void {
    const reentry = this.current
    if (!reentry) return
    const last = reentry.fragments[reentry.fragments.length - 1]
    let n = reentry.fragments.length + 1
    while (reentry.fragments.some(fragment => fragment.id === `piece-${n}`)) n++
    const fragment: ReentryFragment = { id: `piece-${n}`, lagS: (last?.lagS ?? 0) + 1, absoluteMagnitude: (last?.absoluteMagnitude ?? -4) + 1 }
    this.editReentry(edited => {
      edited.fragments = [...edited.fragments, fragment]
    })
    this.selectFragment((this.current?.fragments.length ?? 1) - 1)
  }

  private removeFragment(): void {
    if ((this.current?.fragments.length ?? 0) <= ReentryEditor.MIN_FRAGMENTS) return
    const index = this.fragmentIndex
    this.editReentry(reentry => {
      reentry.fragments = reentry.fragments.filter((_, i) => i !== index)
    })
    this.curveIndex = 0
    this.selectFragment(Math.min(index, (this.current?.fragments.length ?? 1) - 1))
  }

  // The light curve of the piece on show.

  /** The fields of the point of the light curve picked, or what stands for a piece that has none. */
  private syncCurve(force = false): void {
    const curve = this.currentFragment?.lightCurve ?? []
    this.curveIndex = Math.max(0, Math.min(this.curveIndex, curve.length - 1))
    this.element("reentry-curve-empty").hidden = curve.length > 0
    this.element("reentry-curve-parameters").hidden = curve.length === 0
    this.element("reentry-curve-delete").hidden = curve.length === 0
    if (!this.curveForm) {
      this.curveForm = new ParameterForm(this.element("reentry-curve-parameters"), this.language, "reentryCurve.")
      this.curveForm.show(ReentryParameters.CURVE_POINT, new ParameterTarget(
        () => this.currentFragment?.lightCurve?.[this.curveIndex] as unknown as ParameterHolder | undefined,
        apply => this.editCurvePoint(this.fragmentIndex, this.curveIndex, apply)
      ), () => undefined)
    } else {
      this.curveForm.sync(force)
    }
    this.syncTimeline()
  }

  /** One field of the point at `index` of a piece's light curve was edited: the curve is put back in order of the instants, the point followed. */
  private editCurvePoint(fragmentIndex: number, index: number, apply: (point: ParameterHolder) => void): void {
    let edited: { t: number, absoluteMagnitude: number } | undefined
    this.editFragment(fragment => {
      const curve = fragment.lightCurve ?? []
      edited = { ...curve[index] }
      apply(edited as unknown as ParameterHolder)
      fragment.lightCurve = curve.map((other, i) => i === index ? edited! : other).sort((a, b) => a.t - b.t)
    }, fragmentIndex)
    if (edited) this.curveIndex = this.current?.fragments[fragmentIndex]?.lightCurve?.indexOf(edited) ?? 0
    this.syncCurve()
  }

  /** A diamond of a light curve dragged in time: the piece and the point it stands for, picked, the point now at `to`. */
  private moveCurvePoint(fragmentIndex: number, from: number, to: number): void {
    const index = this.current?.fragments[fragmentIndex]?.lightCurve?.findIndex(point => point.t === from) ?? -1
    if (index < 0) return
    this.fragmentIndex = fragmentIndex
    this.editCurvePoint(fragmentIndex, index, point => { point.t = to })
    this.syncFragments(this.current!, true)
  }

  /** A point of the light curve of the piece at `fragmentIndex` at `t`, as bright as it is then; the one already there when there is one. */
  private addCurvePointAt(fragmentIndex: number, t: number): void {
    const fragment = this.current?.fragments[fragmentIndex]
    if (!fragment) return
    const there = (fragment.lightCurve ?? []).findIndex(point => Math.abs(point.t - t) < 1)
    if (there >= 0) {
      this.selectFragment(fragmentIndex, there)
      return
    }
    const point = ReentryParameters.curvePointAt(fragment, t)
    this.editFragment(edited => {
      edited.lightCurve = [...edited.lightCurve ?? [], point].sort((a, b) => a.t - b.t)
    }, fragmentIndex)
    this.selectFragment(fragmentIndex, this.current?.fragments[fragmentIndex]?.lightCurve?.indexOf(point) ?? 0)
  }

  /** Taking out the last point leaves the piece with no curve: its absolute magnitude stands again. */
  private removeCurvePoint(): void {
    if (!this.currentFragment?.lightCurve?.length) return
    const index = this.curveIndex
    this.editFragment(fragment => {
      const curve = (fragment.lightCurve ?? []).filter((_, i) => i !== index)
      if (curve.length) fragment.lightCurve = curve
      else delete fragment.lightCurve
    })
    this.syncCurve(true)
  }

  // The re-entries.

  /** Writes an edit of the re-entry on show: a copy edited by `apply`, in a new list (see the class), told to the editor. */
  private editReentry(apply: (reentry: ReentryJson) => void): void {
    const reentry = this.current
    if (!reentry) return
    const edited: ReentryJson = { ...reentry, track: [...reentry.track], fragments: [...reentry.fragments] }
    apply(edited)
    this.writeReentries(this.reentries.map(other => other === reentry ? edited : other))
    this.host.changed()
  }

  /** Where the recording is, and the direction the observer faces at its start; undefined where it has no place. */
  private origin(): { lat: number, lng: number, headingRad: number } | undefined {
    const sighting = this.host.sighting()
    const place = sighting.event?.place?.[0]
    if (place?.lat === undefined || place.lng === undefined) return undefined
    return { lat: place.lat, lng: place.lng, headingRad: (sighting.observerTrack?.getInterpolatedPoseAt(0)?.headingDeg ?? 0) * Math.PI / 180 }
  }

  /**
   * A new one, in front of the observer and crossing their view from left to right, from the playhead on, a placeholder to be given its
   * real path: a fireball 150 km off, 30 km/s for three seconds from 100 down to 60 km, as bright as a fireball is at least; a re-entry
   * 300 km off, 7.5 km/s for a minute at 80 km, a leading piece and two behind it, the formation observers report.
   */
  private newOf(kind: Kind): Omit<ReentryJson, "id"> | undefined {
    const origin = this.origin()
    if (!origin) return undefined
    const start = Math.round(this.host.currentTime())
    const cosLat = Math.max(0.05, Math.cos(origin.lat * Math.PI / 180))
    const at = (aheadKm: number, acrossKm: number) => {
      const north = aheadKm * Math.cos(origin.headingRad) - acrossKm * Math.sin(origin.headingRad)
      const east = aheadKm * Math.sin(origin.headingRad) + acrossKm * Math.cos(origin.headingRad)
      return { lat: origin.lat + north / 111.32, lng: origin.lng + east / (111.32 * cosLat) }
    }
    if (kind === "fireball") {
      return {
        track: [{ t: start, ...at(150, -45), altitudeKm: 100 }, { t: start + 3000, ...at(150, 45), altitudeKm: 60 }],
        fragments: [{ id: "main", absoluteMagnitude: -6 }]
      }
    }
    return {
      track: [{ t: start, ...at(300, -225), altitudeKm: 82 }, { t: start + 60000, ...at(300, 225), altitudeKm: 72 }],
      fragments: [{ id: "main", absoluteMagnitude: -4 }, { id: "piece-2", lagS: 1.5, absoluteMagnitude: -2.5 }, { id: "piece-3", lagS: 3, absoluteMagnitude: -1.5 }]
    }
  }

  private addReentry(kind: Kind): void {
    const stated = this.newOf(kind)
    if (!stated) return
    let n = this.reentries.length + 1
    while (this.reentries.some(reentry => reentry.id === `${kind}-${n}`)) n++
    const reentry: ReentryJson = { id: `${kind}-${n}`, ...stated }
    this.writeReentries([...this.reentries, reentry])
    this.host.changed()
    this.show(reentry.id)
  }

  private deleteCurrent(): void {
    const reentry = this.current
    if (!reentry) return
    this.currentId = undefined
    this.writeReentries(this.reentries.filter(other => other !== reentry))
    this.host.changed()
    this.sync()
  }

  private writeReentries(reentries: ReentryJson[]): void {
    const sighting = this.host.sighting()
    sighting.skyEvents = SkyEvents.written({ ...sighting.skyEvents, reentries })
  }

  private labelOf(reentry: ReentryJson): string {
    const title = this.host.said().read(reentry.title) || reentry.object?.name
    return title ? `${title} (${reentry.id})` : reentry.id
  }

  private get reentries(): ReentryJson[] {
    return this.host.sighting().skyEvents?.reentries ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
