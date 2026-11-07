import { BeamParameters } from "./BeamParameters.js"
import { SkyEventEditorStyle } from "../SkyEventEditorStyle.js"
import { LaserBeamSighting } from "./LaserBeam.js"
import type { BeamJson, BeamLightKey, BeamMoveKey, BeamPoint } from "./LaserBeam.js"
import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder } from "../../../engine/interpretation/Parameters.js"
import type { Sighting } from "../../../engine/model/Sighting.js"
import type { SaidTexts } from "../../../engine/model/SaidText.js"
import { SkyEvents } from "../../../engine/model/SkyEvents.js"
import type { BeamEditorMessages } from "./messages/BeamEditorMessages.js"
import { BEAM_EDITOR_MESSAGES } from "./messages/BeamEditorMessages.js"
import { ElementList } from "../../../component/ElementList.js"
import { Icons } from "../../../component/Icons.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import type { PositionPlace } from "../../../component/ParameterForm.js"
import { TimelineTracks } from "../../../component/TimelineTracks.js"
import type { TimelineTrack } from "../../../component/TimelineTracks.js"

/** What the Beams part needs of the editor it stands in, read at every use. */
export interface BeamEditorHost {
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

/** A row of the beam's timeline: when it is on, its light, its path. */
type Row = "on" | "light" | "path"

/**
 * The beams of light of the recording, edited: a laser shot, a searchlight, facts of its sky (see SkyEventsJson, BeamJson), each with the
 * fields its kind publishes (see BeamParameters).
 *
 * What does not change while it is on (its name, how it widens, the haze it crosses) is above its timeline; what happens when is on it (see
 * TimelineTracks), a row each: when it is on, a bar between two diamonds; its light, a diamond for each of its keys (see BeamJson.light); its
 * path, a diamond for each of its keys where it moves (see BeamJson.moves). A row pressed is the one whose details are shown under it, alone:
 * the instants it is switched on and off; its colour and power, the beam's own or those of the key picked; the points of its path, its own or
 * those of the key picked. A diamond pressed takes the playhead to it, so that the scene shows the beam then; dragged, it moves in time; the
 * "+" of a row puts a key there at the playhead, as the beam is then, so that putting it changes nothing until it is edited.
 *
 * Every edit replaces the beam edited with an edited copy, and the list of beams with a new list, never changes them where they stand: the
 * scene keeps the points it cut a beam into for as long as it is the same beam (see BeamSystem), and an edit made in place would not be seen.
 */
export class BeamEditor {
  /** Its texts, once they have come (see ready). */
  private messages!: BeamEditorMessages
  /** Settles once the part has its texts and is drawn: nothing of it is shown before, in no language. */
  readonly ready: Promise<void>
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private timeline?: TimelineTracks
  private row: Row = "on"
  private onForm?: ParameterForm
  private lightForm?: ParameterForm
  private lightKeyForm?: ParameterForm
  /** The key of the light picked, by its place among the beam's keys in order; undefined for the beam's own light. */
  private lightIndex?: number
  private moveKeyForm?: ParameterForm
  /** The key of the path picked, by its place among the beam's keys in order; undefined for the beam's own path. */
  private moveIndex?: number
  /** The points of the path on show, and the one being edited — the only one whose fields are drawn. */
  private places?: ElementList
  private placeForm?: ParameterForm
  private placeIndex = 0
  private language: string
  /** The beams the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly BeamJson[] = []

  /** The part's layout, given with it (see SkyEventKind.editor): the editor it stands in knows nothing of a beam. */
  private static readonly STYLE = `.beam-editor { flex-basis: 100%; min-width: 0; } .beam-editor #beam-timeline { flex-basis: 100%; min-width: 0; padding: 4px 0; } .beam-editor #beam-list, .beam-editor #beam-places { flex-basis: 100%; min-width: 0; } .beam-editor .launch-editor, .beam-editor .launch-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .beam-editor .launch-fields { flex-basis: 100%; min-width: 0; } .beam-editor [hidden] { display: none !important; } .beam-editor select { min-width: 0; width: 100%; } .beam-editor .launch-intro { flex-basis: 100%; margin: 0; } .beam-editor .launch-track { flex-basis: 100%; margin: 0; } .beam-editor .launch-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .beam-editor .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .beam-editor input, .beam-editor select { max-width: 100%; box-sizing: border-box; } .beam-editor input[type="text"] { width: 12em; } .beam-editor #launch-title { width: 18em; } .beam-editor label { min-width: 0; max-width: 100%; } .beam-editor input.parameter-derived::placeholder { opacity: .65; } .beam-editor .launch-path { flex: 1 1 100%; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; }`

  constructor(private readonly container: HTMLElement, private readonly host: BeamEditorHost, language: string) {
    this.language = language
    SkyEventEditorStyle.attach(container, "beam-editor", BeamEditor.STYLE)
    if (!ParameterRegistry.of("beam")) BeamParameters.publish()
    this.ready = this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the beam on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const messages = await BEAM_EDITOR_MESSAGES.load(language)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    if (!this.messages) return
    const beams = this.beams
    this.shown = [...beams]
    if (!beams.some(beam => beam.id === this.currentId)) this.currentId = beams[0]?.id
    this.list?.setItems(beams.map(beam => ({ id: beam.id, label: this.labelOf(beam) })), this.currentId)
    this.syncAddState()
    const beam = this.current
    this.element("beam-fields").hidden = beam === undefined
    if (!beam) return
    const said = { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() }
    this.form ??= new ParameterForm(this.element("beam-parameters"), this.language, "beam.", said)
    this.form.show(BeamParameters.SET, this.targetOfBeam(), () => this.written())
    this.syncDetail(true)
  }

  /** Shows what the recording states only if it holds other beams than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    if (!this.messages) return
    this.syncAddState()
    const beams = this.beams
    if (beams.length === this.shown.length && beams.every((beam, i) => beam.id === this.shown[i].id)) {
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
    if (!this.messages) return
    this.currentId = id
    this.row = "on"
    this.lightIndex = undefined
    this.moveIndex = undefined
    this.placeIndex = 0
    this.sync()
  }

  private render(): void {
    if (!this.messages) return
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="beam-list"></div>
      <div id="beam-fields" class="launch-fields">
        <div id="beam-parameters" class="launch-parameters"></div>
        <div id="beam-timeline" class="launch-timeline"></div>
        <p class="launch-intro">${m.timelineNote}</p>
        <fieldset id="beam-on" class="launch-path">
          <legend>${m.on}</legend>
          <div id="beam-on-parameters" class="launch-parameters"></div>
        </fieldset>
        <fieldset id="beam-light" class="launch-path">
          <legend>${m.light}</legend>
          <p id="beam-light-note" class="launch-intro"></p>
          <div id="beam-light-parameters" class="launch-parameters"></div>
          <div id="beam-light-key-parameters" class="launch-parameters"></div>
          <label class="beam-colour"><span>${m.colour}</span> <input id="beam-colour" type="color" title="${m.colourHint}"/></label>
          <button id="beam-light-delete" class="icon-btn" type="button" title="${m.deleteKey}" aria-label="${m.deleteKey}">${Icons.TRASH}</button>
        </fieldset>
        <fieldset id="beam-path" class="launch-path">
          <legend>${m.path}</legend>
          <p id="beam-path-note" class="launch-intro"></p>
          <div id="beam-move-key-parameters" class="launch-parameters"></div>
          <button id="beam-move-delete" class="icon-btn" type="button" title="${m.deleteKey}" aria-label="${m.deleteKey}">${Icons.TRASH}</button>
          <div id="beam-places"></div>
          <div id="beam-place-parameters" class="launch-parameters"></div>
        </fieldset>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("beam-list"), body: this.element("beam-fields"),
      ids: { list: "beam-select", remove: "beam-delete", add: "beam-add" },
      onSelect: id => this.show(id),
      onAdd: () => this.addBeam(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.beam, remove: m.deleteBeam, add: m.addBeam, empty: m.none })
    this.timeline = new TimelineTracks(this.element("beam-timeline"), t => this.host.seekTo(t), { addKeyframeHere: m.addHere, keyframeHere: m.here, zoomHint: m.zoomHint })
    // The path's points are where the light goes, not when: a list of them, in order, for the path on show.
    this.places = new ElementList({
      header: this.element("beam-places"), body: this.element("beam-place-parameters"),
      ids: { list: "beam-place", remove: "beam-place-delete", add: "beam-place-add" },
      navigation: { scope: this.element("beam-path"), onStep: direction => this.selectPlace(this.placeIndex + direction) },
      onSelect: id => this.selectPlace(Number(id)),
      onAdd: () => this.addPlace(),
      onRemove: () => this.removePlace()
    })
    this.places.setLabels({ list: m.place, remove: m.deletePlace, add: m.addPlace, previous: m.previousPlace, next: m.nextPlace })
    this.element("beam-colour").addEventListener("input", event => this.pickColour((event.target as HTMLInputElement).value))
    this.element("beam-light-delete").addEventListener("click", () => this.removeLightKey())
    this.element("beam-move-delete").addEventListener("click", () => this.removeMoveKey())
    this.onForm = undefined
    this.lightForm = undefined
    this.lightKeyForm = undefined
    this.moveKeyForm = undefined
    this.placeForm = undefined
  }

  /** A field was written onto the beam. */
  private written(): void {
    const beam = this.current
    if (beam) this.list?.rename(beam.id, this.labelOf(beam))
    this.syncTimeline()
  }

  private targetOfBeam(): ParameterTarget {
    return new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editBeam(beam => apply(beam as unknown as ParameterHolder))
    )
  }

  // The timeline.

  /** The rows of the timeline, readable over a light ground and a dark one. */
  private static readonly ON_COLOR = "#2f9e5a"
  private static readonly LIGHT_COLOR = "#c0581b"
  private static readonly PATH_COLOR = "#4f8fd6"

  /** The rows of the beam's timeline (see the class), drawn again only when what they show has changed (see TimelineTracks.show). */
  private syncTimeline(): void {
    const beam = this.current
    if (!this.timeline || !beam) return
    const m = this.messages
    const duration = this.host.duration()
    const from = beam.fromT ?? 0
    const until = beam.untilT ?? duration
    const onSpan = [{ t: from, until, label: "" }]
    const light = this.sortedLight(beam)
    const moves = this.sortedMoves(beam)
    const rows: TimelineTrack[] = [{
      id: "on", label: m.on, color: BeamEditor.ON_COLOR, times: [from, until], spans: onSpan,
      active: this.row === "on",
      open: () => this.selectRow("on"),
      pressed: () => this.selectRow("on"),
      move: (moved, to) => this.moveEnd(moved === from ? "fromT" : "untilT", to),
      add: () => this.moveEnd("fromT", Math.round(this.host.currentTime()))
    }, {
      // Its light where it says none in time: the bar of when it is on, the beam's own light all along it.
      id: "light", label: m.light, color: BeamEditor.LIGHT_COLOR, times: light.map(key => key.t), spans: light.length ? [] : onSpan,
      active: this.row === "light",
      selectedTime: this.row === "light" && this.lightIndex !== undefined ? light[this.lightIndex]?.t : undefined,
      open: () => this.selectLight(this.lightIndex),
      pressed: (_t, key) => this.selectLight(key === undefined ? this.lightIndex : this.sortedLight(this.current!).findIndex(candidate => candidate.t === key)),
      move: (moved, to) => this.moveLightKey(moved, to),
      add: () => this.addLightKey(Math.round(this.host.currentTime()))
    }, {
      id: "path", label: m.path, color: BeamEditor.PATH_COLOR, times: moves.map(key => key.t), spans: moves.length ? [] : onSpan,
      active: this.row === "path",
      selectedTime: this.row === "path" && this.moveIndex !== undefined ? moves[this.moveIndex]?.t : undefined,
      open: () => this.selectMove(this.moveIndex),
      pressed: (_t, key) => this.selectMove(key === undefined ? this.moveIndex : this.sortedMoves(this.current!).findIndex(candidate => candidate.t === key)),
      move: (moved, to) => this.moveMoveKey(moved, to),
      add: () => this.addMoveKey(Math.round(this.host.currentTime()))
    }]
    const instants = [from, until, ...light.map(key => key.t), ...moves.map(key => key.t)]
    this.timeline.show(rows, duration, this.host.currentTime(), { from: Math.min(0, ...instants), to: Math.max(duration, ...instants) })
  }

  private sortedLight(beam: BeamJson): BeamLightKey[] {
    return [...beam.light ?? []].sort((a, b) => a.t - b.t)
  }

  private sortedMoves(beam: BeamJson): BeamMoveKey[] {
    return [...beam.moves ?? []].sort((a, b) => a.t - b.t)
  }

  private selectRow(row: Row): void {
    this.row = row
    this.syncDetail(true)
  }

  /** Under the timeline, the details of its row picked alone (see the class). */
  private syncDetail(force = false): void {
    const beam = this.current
    if (!beam) return
    this.element("beam-on").hidden = this.row !== "on"
    this.element("beam-light").hidden = this.row !== "light"
    this.element("beam-path").hidden = this.row !== "path"
    if (this.row === "on") this.syncOn(force)
    if (this.row === "light") this.syncLight(force)
    if (this.row === "path") this.syncPath(force)
    this.syncTimeline()
  }

  // When it is on.

  private syncOn(force: boolean): void {
    if (!this.onForm) {
      this.onForm = new ParameterForm(this.element("beam-on-parameters"), this.language, "beamOn.")
      this.onForm.show(BeamParameters.ON, this.targetOfBeam(), () => this.syncTimeline())
    } else {
      this.onForm.sync(force)
    }
  }

  /** An end of the time the beam is on, now at `to`: the other kept after the start, or let go back to the recording's end. */
  private moveEnd(key: "fromT" | "untilT", to: number): void {
    this.editBeam(beam => {
      beam[key] = to
      if (beam.fromT !== undefined && beam.untilT !== undefined && beam.untilT < beam.fromT) {
        if (key === "fromT") delete beam.untilT
        else [beam.fromT, beam.untilT] = [beam.untilT, beam.fromT]
      }
    })
    this.selectRow("on")
  }

  // Its light.

  /** Picks the key of the light at `index`, or the beam's own light where there is none. */
  private selectLight(index: number | undefined): void {
    const keys = this.current ? this.sortedLight(this.current) : []
    this.lightIndex = index !== undefined && index >= 0 && index < keys.length ? index : keys.length ? 0 : undefined
    this.selectRow("light")
  }

  private get currentLightKey(): BeamLightKey | undefined {
    const beam = this.current
    return beam && this.lightIndex !== undefined ? this.sortedLight(beam)[this.lightIndex] : undefined
  }

  private syncLight(force: boolean): void {
    const m = this.messages
    const key = this.currentLightKey
    this.element("beam-light-note").textContent = key ? m.lightKeyNote : m.lightNoKeyNote
    this.element("beam-light-parameters").hidden = key !== undefined
    this.element("beam-light-key-parameters").hidden = key === undefined
    this.element("beam-light-delete").hidden = key === undefined
    if (!this.lightForm) {
      this.lightForm = new ParameterForm(this.element("beam-light-parameters"), this.language, "beamLight.")
      this.lightForm.show(BeamParameters.LIGHT, this.targetOfBeam(), () => this.syncColour())
    } else {
      this.lightForm.sync(force)
    }
    if (!this.lightKeyForm) {
      this.lightKeyForm = new ParameterForm(this.element("beam-light-key-parameters"), this.language, "beamLightKey.")
      this.lightKeyForm.show(BeamParameters.LIGHT_KEY, new ParameterTarget(
        () => this.currentLightKey as unknown as ParameterHolder | undefined,
        apply => this.editLightKey(this.lightIndex!, apply),
        () => this.current
      ), () => this.syncColour())
    } else {
      this.lightKeyForm.sync(force)
    }
    this.syncColour()
  }

  /** The swatch beside the wavelength: the colour of the light shown, the key's or the beam's own. */
  private syncColour(): void {
    const beam = this.current
    if (!beam) return
    ;(this.element("beam-colour") as HTMLInputElement).value = BeamParameters.hexOf(this.currentLightKey?.wavelengthNm ?? beam.wavelengthNm)
  }

  /** A colour picked: the wavelength nearest it in hue, a laser's light being of one wavelength (see BeamParameters.wavelengthOf). */
  private pickColour(hex: string): void {
    const wavelengthNm = BeamParameters.wavelengthOf(hex)
    if (this.lightIndex === undefined) {
      this.editBeam(beam => { beam.wavelengthNm = wavelengthNm })
      this.lightForm?.sync(true)
    } else {
      this.editLightKey(this.lightIndex, key => { key.wavelengthNm = wavelengthNm })
      this.lightKeyForm?.sync(true)
    }
  }

  /** One field of the key of the light at `index` (among the keys in order) was edited: the keys are put back in order, the key followed. */
  private editLightKey(index: number, apply: (key: ParameterHolder) => void): void {
    const beam = this.current
    if (!beam) return
    const keys = this.sortedLight(beam)
    const edited = { ...keys[index] }
    apply(edited as unknown as ParameterHolder)
    const light = keys.map((other, i) => i === index ? edited : other).sort((a, b) => a.t - b.t)
    this.editBeam(copy => { copy.light = light })
    this.lightIndex = light.indexOf(edited)
    this.syncTimeline()
  }

  /** A key of the light at `t`, as the light is then; the one already there when there is one. */
  private addLightKey(t: number): void {
    const beam = this.current
    if (!beam) return
    const keys = this.sortedLight(beam)
    const there = keys.findIndex(key => Math.abs(key.t - t) < 1)
    if (there >= 0) {
      this.selectLight(there)
      return
    }
    const state = LaserBeamSighting.stateAt(beam, t)
    const key: BeamLightKey = { t, wavelengthNm: Math.round(state.wavelengthNm), powerW: Number(state.powerW.toFixed(3)) }
    const light = [...keys, key].sort((a, b) => a.t - b.t)
    this.editBeam(copy => { copy.light = light })
    this.selectLight(light.indexOf(key))
  }

  private moveLightKey(from: number, to: number): void {
    const index = this.current ? this.sortedLight(this.current).findIndex(key => key.t === from) : -1
    if (index < 0) return
    this.editLightKey(index, key => { key.t = to })
    this.selectRow("light")
  }

  /** Taking out the last key of the light leaves the beam's own light all along. */
  private removeLightKey(): void {
    const beam = this.current
    const index = this.lightIndex
    if (!beam || index === undefined) return
    const light = this.sortedLight(beam).filter((_, i) => i !== index)
    this.editBeam(copy => {
      if (light.length) copy.light = light
      else delete copy.light
    })
    this.selectLight(light.length ? Math.min(index, light.length - 1) : undefined)
  }

  // Its path.

  /** Picks the key of the path at `index`, or the beam's own path where there is none. */
  private selectMove(index: number | undefined): void {
    const keys = this.current ? this.sortedMoves(this.current) : []
    const next = index !== undefined && index >= 0 && index < keys.length ? index : keys.length ? 0 : undefined
    if (next !== this.moveIndex) this.placeIndex = 0
    this.moveIndex = next
    this.selectRow("path")
  }

  private get currentMoveKey(): BeamMoveKey | undefined {
    const beam = this.current
    return beam && this.moveIndex !== undefined ? this.sortedMoves(beam)[this.moveIndex] : undefined
  }

  /** The points of the path on show: the key's picked, or the beam's own. */
  private get shownPath(): BeamPoint[] {
    return this.currentMoveKey?.path ?? this.current?.path ?? []
  }

  private syncPath(force: boolean): void {
    const m = this.messages
    const key = this.currentMoveKey
    this.element("beam-path-note").textContent = key ? m.pathKeyNote : m.pathNoKeyNote
    this.element("beam-move-key-parameters").hidden = key === undefined
    this.element("beam-move-delete").hidden = key === undefined
    if (!this.moveKeyForm) {
      this.moveKeyForm = new ParameterForm(this.element("beam-move-key-parameters"), this.language, "beamMoveKey.")
      this.moveKeyForm.show(BeamParameters.MOVE_KEY, new ParameterTarget(
        () => this.currentMoveKey as unknown as ParameterHolder | undefined,
        apply => this.editMoveKey(this.moveIndex!, edited => apply(edited as unknown as ParameterHolder))
      ), () => undefined)
    } else {
      this.moveKeyForm.sync(force)
    }
    this.syncPlaces(force)
  }

  /** Writes an edit of the key of the path at `index` (among the keys in order), as a copy: the keys are put back in order, the key followed. */
  private editMoveKey(index: number, apply: (key: BeamMoveKey) => void): void {
    const beam = this.current
    if (!beam) return
    const keys = this.sortedMoves(beam)
    const edited: BeamMoveKey = { ...keys[index], path: [...keys[index].path] }
    apply(edited)
    const moves = keys.map((other, i) => i === index ? edited : other).sort((a, b) => a.t - b.t)
    this.editBeam(copy => { copy.moves = moves })
    this.moveIndex = moves.indexOf(edited)
    this.syncTimeline()
  }

  /** A key of the path at `t`, where the beam goes then; the one already there when there is one. */
  private addMoveKey(t: number): void {
    const beam = this.current
    if (!beam) return
    const keys = this.sortedMoves(beam)
    const there = keys.findIndex(key => Math.abs(key.t - t) < 1)
    if (there >= 0) {
      this.selectMove(there)
      return
    }
    const key: BeamMoveKey = { t, path: LaserBeamSighting.stateAt(beam, t).path.map(point => ({ ...point })) }
    const moves = [...keys, key].sort((a, b) => a.t - b.t)
    this.editBeam(copy => { copy.moves = moves })
    this.selectMove(moves.indexOf(key))
  }

  private moveMoveKey(from: number, to: number): void {
    const index = this.current ? this.sortedMoves(this.current).findIndex(key => key.t === from) : -1
    if (index < 0) return
    this.editMoveKey(index, key => { key.t = to })
    this.selectRow("path")
  }

  /** Taking out the last key of the path leaves the beam on its own path all along. */
  private removeMoveKey(): void {
    const beam = this.current
    const index = this.moveIndex
    if (!beam || index === undefined) return
    const moves = this.sortedMoves(beam).filter((_, i) => i !== index)
    this.editBeam(copy => {
      if (moves.length) copy.moves = moves
      else delete copy.moves
    })
    this.selectMove(moves.length ? Math.min(index, moves.length - 1) : undefined)
  }

  /** The points of the path on show, the one being edited picked, and its fields drawn (see BeamParameters.PLACE). */
  private syncPlaces(force = false): void {
    const path = this.shownPath
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, path.length - 1))
    this.places?.setItems(path.map((_, i) => ({ id: String(i), label: `${i + 1}/${path.length}` })), String(this.placeIndex))
    this.places?.setStepState(this.placeIndex > 0, this.placeIndex < path.length - 1)
    this.places?.setRemoveEnabled(path.length > BeamEditor.MIN_PLACES)
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("beam-place-parameters"), this.language, "beamPlace.")
      this.placeForm.show(BeamParameters.PLACE, new ParameterTarget(
        () => this.shownPath[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPath(path => {
          const place = { ...path[this.placeIndex] }
          apply(place as unknown as ParameterHolder)
          return path.map((other, i) => i === this.placeIndex ? place : other)
        }),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      this.placeForm.sync(force)
    }
  }

  /** Writes a new path for the path on show: the key's picked, or the beam's own. */
  private editPath(edit: (path: BeamPoint[]) => BeamPoint[]): void {
    if (this.moveIndex !== undefined) this.editMoveKey(this.moveIndex, key => { key.path = edit(key.path) })
    else this.editBeam(beam => { beam.path = edit(beam.path) })
  }

  /** A beam needs two points to be a beam at all: where it leaves the emitter and where it ends. */
  private static readonly MIN_PLACES = 2

  private selectPlace(index: number): void {
    const path = this.shownPath
    if (index < 0 || index >= path.length) return
    this.placeIndex = index
    this.syncPlaces(true)
  }

  private addPlace(): void {
    this.editPath(path => [...path, BeamParameters.nextPlace(path as unknown as Record<string, number>[]) as unknown as BeamPoint])
    this.placeIndex = this.shownPath.length - 1
    this.syncPlaces(true)
  }

  private removePlace(): void {
    if (this.shownPath.length <= BeamEditor.MIN_PLACES) return
    const index = this.placeIndex
    this.editPath(path => path.filter((_, i) => i !== index))
    this.syncPlaces(true)
  }

  // The beams.

  /** Writes an edit of the beam on show: a copy edited by `apply`, in a new list of beams (see the class), told to the editor. */
  private editBeam(apply: (beam: BeamJson) => void): void {
    const beam = this.current
    if (!beam) return
    const edited: BeamJson = { ...beam, path: [...beam.path] }
    apply(edited)
    this.writeBeams(this.beams.map(other => other === beam ? edited : other))
    this.host.changed()
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
    this.host.changed()
    this.show(beam.id)
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
