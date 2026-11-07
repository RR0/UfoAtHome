import { ReentryParameters } from "../engine/interpretation/ReentryParameters.js"
import type { ReentryFragment, ReentryJson, ReentryKeyframe } from "../engine/interpretation/Reentry.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import { SkyEvents } from "../engine/model/SkyEvents.js"
import type { ReentryEditorMessages } from "./messages/ReentryEditorMessages.js"
import { reentryEditorMessages_en } from "./messages/ReentryEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadReentryEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { ElementList } from "./ElementList.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import type { PositionPlace } from "./ParameterForm.js"

/** What the Fireballs part needs of the editor it stands in, read at every use. */
export interface ReentryEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** What a place is said from, and in what words (see PositionPlace); without it, a place is said only the way it is kept. */
  positionPlace?(): PositionPlace
  /** An edit was written onto the recording. */
  changed(): void
}

type Kind = "fireball" | "reentry"

/**
 * The fireballs and re-entries of the recording, edited: facts of its sky (see SkyEventsJson, ReentryJson), each with its name and object,
 * the points of its path, and its burning pieces, each with its light curve (see ReentryParameters).
 *
 * Every edit replaces the re-entry edited with an edited copy, and the list with a new list, never changes them where they stand: the
 * pieces of a re-entry and its detonations are worked out once per re-entry object (see ReentrySighting.piecesOf, SceneElement.hearDetonations),
 * and an edit made in place would not be seen.
 */
export class ReentryEditor {
  private messages: ReentryEditorMessages = reentryEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private places?: ElementList
  private placeForm?: ParameterForm
  private placeIndex = 0
  private fragments?: ElementList
  private fragmentForm?: ParameterForm
  private fragmentIndex = 0
  private curve?: ElementList
  private curveForm?: ParameterForm
  private curveIndex = 0
  private language: string
  /** The re-entries the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly ReentryJson[] = []

  constructor(private readonly container: HTMLElement, private readonly host: ReentryEditorHost, language: string) {
    this.language = language
    this.render()
    void this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the re-entry on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const supported = (UFO_SUPPORTED_LANGUAGES as readonly string[]).includes(language) ? language as UfoLanguage : "en"
    const messages = supported === "en" ? reentryEditorMessages_en : await loadReentryEditorMessages(supported)
    if (token !== this.languageToken) return
    this.messages = messages
    this.render()
    this.sync()
  }

  /** Shows what the recording states now: after a recording is loaded or an edit written. */
  sync(): void {
    const reentries = this.reentries
    this.shown = [...reentries]
    if (!reentries.some(reentry => reentry.id === this.currentId)) this.currentId = reentries[0]?.id
    this.list?.setItems(reentries.map(reentry => ({ id: reentry.id, label: this.labelOf(reentry) })), this.currentId)
    this.syncAddState()
    const reentry = this.current
    this.element("reentry-fields").hidden = reentry === undefined
    if (!reentry) return
    this.syncPlaces(reentry, true)
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
    this.syncAddState()
    const reentries = this.reentries
    if (reentries.length === this.shown.length && reentries.every((reentry, i) => reentry.id === this.shown[i].id)) return
    this.sync()
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
    this.currentId = id
    this.placeIndex = 0
    this.fragmentIndex = 0
    this.curveIndex = 0
    this.sync()
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="reentry-list"></div>
      <div id="reentry-fields" class="launch-fields">
        <div id="reentry-parameters" class="launch-parameters"></div>
        <fieldset id="reentry-path" class="launch-path">
          <legend>${m.path}</legend>
          <div id="reentry-places"></div>
          <div id="reentry-place-parameters" class="launch-parameters"></div>
        </fieldset>
        <fieldset id="reentry-fragments" class="launch-path">
          <legend>${m.fragments}</legend>
          <div id="reentry-fragment-list"></div>
          <div id="reentry-fragment-body" class="launch-parameters">
            <div id="reentry-fragment-parameters" class="launch-parameters"></div>
            <fieldset id="reentry-curve" class="launch-path">
              <legend>${m.curve}</legend>
              <div id="reentry-curve-list"></div>
              <div id="reentry-curve-parameters" class="launch-parameters"></div>
            </fieldset>
          </div>
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
    this.places = new ElementList({
      header: this.element("reentry-places"), body: this.element("reentry-place-parameters"),
      ids: { list: "reentry-place", remove: "reentry-place-delete", add: "reentry-place-add" },
      navigation: { scope: this.element("reentry-path"), onStep: direction => this.selectPlace(this.placeIndex + direction) },
      onSelect: id => this.selectPlace(Number(id)),
      onAdd: () => this.addPlace(),
      onRemove: () => this.removePlace()
    })
    this.places.setLabels({ list: m.place, remove: m.deletePlace, add: m.addPlace, previous: m.previousPlace, next: m.nextPlace })
    this.placeForm = undefined
    this.fragments = new ElementList({
      header: this.element("reentry-fragment-list"), body: this.element("reentry-fragment-body"),
      ids: { list: "reentry-fragment", remove: "reentry-fragment-delete", add: "reentry-fragment-add" },
      onSelect: id => { this.fragmentIndex = Number(id); this.curveIndex = 0; this.syncFragments(this.current!, true) },
      onAdd: () => this.addFragment(),
      onRemove: () => this.removeFragment()
    })
    this.fragments.setLabels({ list: m.fragment, remove: m.deleteFragment, add: m.addFragment })
    this.fragmentForm = undefined
    this.curve = new ElementList({
      header: this.element("reentry-curve-list"), body: this.element("reentry-curve-parameters"),
      ids: { list: "reentry-curve-point", remove: "reentry-curve-delete", add: "reentry-curve-add" },
      navigation: { scope: this.element("reentry-curve"), onStep: direction => this.selectCurvePoint(this.curveIndex + direction) },
      onSelect: id => this.selectCurvePoint(Number(id)),
      onAdd: () => this.addCurvePoint(),
      onRemove: () => this.removeCurvePoint()
    })
    this.curve.setLabels({ list: m.curvePoint, remove: m.deleteCurvePoint, add: m.addCurvePoint, empty: m.noCurve, previous: m.previousCurvePoint, next: m.nextCurvePoint })
    this.curveForm = undefined
  }

  /** A field was written onto the re-entry. */
  private written(): void {
    const reentry = this.current
    if (reentry) this.list?.rename(reentry.id, this.labelOf(reentry))
  }

  private seconds(ms: number): string {
    return `${Math.round(ms / 100) / 10} s`
  }

  // The path.

  /** A path needs two points to be a path at all. */
  private static readonly MIN_PLACES = 2

  private syncPlaces(reentry: ReentryJson, force = false): void {
    const track = reentry.track
    this.placeIndex = Math.max(0, Math.min(this.placeIndex, track.length - 1))
    this.places?.setItems(track.map((place, i) => ({ id: String(i), label: this.seconds(place.t) })), String(this.placeIndex))
    this.places?.setStepState(this.placeIndex > 0, this.placeIndex < track.length - 1)
    this.places?.setRemoveEnabled(track.length > ReentryEditor.MIN_PLACES)
    if (!this.placeForm) {
      this.placeForm = new ParameterForm(this.element("reentry-place-parameters"), this.language, "reentryPlace.")
      this.placeForm.show(ReentryParameters.PLACE, new ParameterTarget(
        () => this.current?.track[this.placeIndex] as unknown as ParameterHolder | undefined,
        apply => this.editPlace(apply),
        undefined,
        this.host.positionPlace?.()
      ), () => undefined)
    } else {
      this.placeForm.sync(force)
    }
  }

  private selectPlace(index: number): void {
    const track = this.current?.track ?? []
    if (index < 0 || index >= track.length) return
    this.placeIndex = index
    this.syncPlaces(this.current!, true)
  }

  /** One field of the place on show was edited: the path is put back in order of the instants, the place followed to where it now stands. */
  private editPlace(apply: (place: ParameterHolder) => void): void {
    let edited: ReentryKeyframe | undefined
    this.editReentry(reentry => {
      edited = { ...reentry.track[this.placeIndex] }
      apply(edited as unknown as ParameterHolder)
      reentry.track = reentry.track.map((other, i) => i === this.placeIndex ? edited! : other).sort((a, b) => a.t - b.t)
    })
    const track = this.current?.track ?? []
    if (edited) this.placeIndex = track.indexOf(edited)
    this.syncPlaces(this.current!)
    this.syncFragments(this.current!)
  }

  private addPlace(): void {
    this.editReentry(reentry => {
      reentry.track = [...reentry.track, ReentryParameters.nextPlace(reentry.track as unknown as Record<string, number>[]) as unknown as ReentryKeyframe]
    })
    this.placeIndex = (this.current?.track.length ?? 1) - 1
    this.syncPlaces(this.current!, true)
  }

  private removePlace(): void {
    if ((this.current?.track.length ?? 0) <= ReentryEditor.MIN_PLACES) return
    const index = this.placeIndex
    this.editReentry(reentry => {
      reentry.track = reentry.track.filter((_, i) => i !== index)
    })
    this.syncPlaces(this.current!, true)
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
    this.fragments?.setItems(fragments.map((fragment, i) => ({ id: String(i), label: this.fragmentLabel(fragment, i) })), String(this.fragmentIndex))
    this.fragments?.setRemoveEnabled(fragments.length > ReentryEditor.MIN_FRAGMENTS)
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

  private get currentFragment(): ReentryFragment | undefined {
    return this.current?.fragments[this.fragmentIndex]
  }

  /** Writes an edit of the piece on show, as a copy (its light curve too) in an edited copy of the re-entry. */
  private editFragment(apply: (fragment: ReentryFragment) => void): void {
    const index = this.fragmentIndex
    this.editReentry(reentry => {
      const fragment: ReentryFragment = { ...reentry.fragments[index] }
      if (fragment.lightCurve) fragment.lightCurve = [...fragment.lightCurve]
      apply(fragment)
      reentry.fragments = reentry.fragments.map((other, i) => i === index ? fragment : other)
    })
    const fragment = this.currentFragment
    if (fragment) this.fragments?.rename(String(index), this.fragmentLabel(fragment, index))
  }

  /** A piece a little behind the last, half as bright again fainter: the train of a break-up. */
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
    this.fragmentIndex = (this.current?.fragments.length ?? 1) - 1
    this.curveIndex = 0
    this.syncFragments(this.current!, true)
  }

  private removeFragment(): void {
    if ((this.current?.fragments.length ?? 0) <= ReentryEditor.MIN_FRAGMENTS) return
    const index = this.fragmentIndex
    this.editReentry(reentry => {
      reentry.fragments = reentry.fragments.filter((_, i) => i !== index)
    })
    this.curveIndex = 0
    this.syncFragments(this.current!, true)
  }

  // The light curve of the piece on show.

  private syncCurve(force = false): void {
    const curve = this.currentFragment?.lightCurve ?? []
    this.curveIndex = Math.max(0, Math.min(this.curveIndex, curve.length - 1))
    this.curve?.setItems(curve.map((point, i) => ({ id: String(i), label: this.seconds(point.t) })), curve.length ? String(this.curveIndex) : undefined)
    this.curve?.setStepState(this.curveIndex > 0, this.curveIndex < curve.length - 1)
    if (!this.curveForm) {
      this.curveForm = new ParameterForm(this.element("reentry-curve-parameters"), this.language, "reentryCurve.")
      this.curveForm.show(ReentryParameters.CURVE_POINT, new ParameterTarget(
        () => this.currentFragment?.lightCurve?.[this.curveIndex] as unknown as ParameterHolder | undefined,
        apply => this.editCurvePoint(apply)
      ), () => undefined)
    } else {
      this.curveForm.sync(force)
    }
  }

  private selectCurvePoint(index: number): void {
    const curve = this.currentFragment?.lightCurve ?? []
    if (index < 0 || index >= curve.length) return
    this.curveIndex = index
    this.syncCurve(true)
  }

  /** One field of the point on show was edited: the curve is put back in order of the instants, the point followed. */
  private editCurvePoint(apply: (point: ParameterHolder) => void): void {
    let edited: { t: number, absoluteMagnitude: number } | undefined
    this.editFragment(fragment => {
      const curve = fragment.lightCurve ?? []
      edited = { ...curve[this.curveIndex] }
      apply(edited as unknown as ParameterHolder)
      fragment.lightCurve = curve.map((other, i) => i === this.curveIndex ? edited! : other).sort((a, b) => a.t - b.t)
    })
    if (edited) this.curveIndex = this.currentFragment?.lightCurve?.indexOf(edited) ?? 0
    this.syncCurve()
  }

  private addCurvePoint(): void {
    const reentry = this.current
    if (!reentry || !this.currentFragment) return
    const point = ReentryParameters.nextCurvePoint(this.currentFragment, reentry)
    this.editFragment(fragment => {
      fragment.lightCurve = [...fragment.lightCurve ?? [], point].sort((a, b) => a.t - b.t)
    })
    this.curveIndex = this.currentFragment?.lightCurve?.indexOf(point) ?? 0
    this.syncCurve(true)
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
   * A new one, in front of the observer and crossing their view from left to right, a placeholder to be given its real path: a fireball
   * 150 km off, 30 km/s for three seconds from 100 down to 60 km, as bright as a fireball is at least; a re-entry 300 km off, 7.5 km/s for
   * a minute at 80 km, a leading piece and two behind it, the formation observers report.
   */
  private newOf(kind: Kind): Omit<ReentryJson, "id"> | undefined {
    const origin = this.origin()
    if (!origin) return undefined
    const cosLat = Math.max(0.05, Math.cos(origin.lat * Math.PI / 180))
    const at = (aheadKm: number, acrossKm: number) => {
      const north = aheadKm * Math.cos(origin.headingRad) - acrossKm * Math.sin(origin.headingRad)
      const east = aheadKm * Math.sin(origin.headingRad) + acrossKm * Math.cos(origin.headingRad)
      return { lat: origin.lat + north / 111.32, lng: origin.lng + east / (111.32 * cosLat) }
    }
    if (kind === "fireball") {
      return {
        track: [{ t: 0, ...at(150, -45), altitudeKm: 100 }, { t: 3000, ...at(150, 45), altitudeKm: 60 }],
        fragments: [{ id: "main", absoluteMagnitude: -6 }]
      }
    }
    return {
      track: [{ t: 0, ...at(300, -225), altitudeKm: 82 }, { t: 60000, ...at(300, 225), altitudeKm: 72 }],
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
