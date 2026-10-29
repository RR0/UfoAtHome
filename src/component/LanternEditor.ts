import { LanternParameters } from "../engine/interpretation/LanternParameters.js"
import type { LanternContext } from "../engine/interpretation/LanternParameters.js"
import { ParameterRegistry } from "../engine/interpretation/Parameters.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"
import type { InterpretationJson } from "../engine/interpretation/Interpretation.js"
import type { LanternLaunchJson } from "../engine/interpretation/SkyLantern.js"
import { resolveWeatherAt } from "../engine/model/Sighting.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import type { LanternEditorMessages } from "./messages/LanternEditorMessages.js"
import { lanternEditorMessages_en } from "./messages/LanternEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadLanternEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import { ElementList } from "./ElementList.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import type { PositionPlace } from "./ParameterForm.js"

/** What the Lanterns part needs of the editor it stands in, read at every use. */
export interface LanternEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** The shapes of the account, which lanterns may stand for. */
  shapes(): { id: string, label: string }[]
  /** What a place is said from, and in what words (see PositionPlace); without it, a place is said only the way it is kept. */
  positionPlace?(): PositionPlace
  /** An edit was written onto the recording. */
  changed(): void
}

/**
 * The sky lanterns of the recording, edited: launches of lanterns let go from the ground, read into the account as what its lights were
 * (see InterpretationJson.lanterns, LanternLaunchJson), each with the fields the lantern kind publishes (see LanternParameters). Their
 * flights are computed, not edited.
 *
 * Every edit replaces the launch edited with an edited copy, in a new interpretation, never changes them where they stand: the scene
 * computes the lanterns again when the interpretation it is given is another one (see SightingEditorElement.syncBodiesShown).
 */
export class LanternEditor {
  private messages: LanternEditorMessages = lanternEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private language: string
  /** The launches the fields were last filled for, to tell a recording replaced from an edit written. */
  private shown: readonly LanternLaunchJson[] = []

  constructor(private readonly container: HTMLElement, private readonly host: LanternEditorHost, language: string) {
    this.language = language
    if (!ParameterRegistry.of("lantern")) LanternParameters.publish()
    this.render()
    void this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the launch on show. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const supported = (UFO_SUPPORTED_LANGUAGES as readonly string[]).includes(language) ? language as UfoLanguage : "en"
    const messages = supported === "en" ? lanternEditorMessages_en : await loadLanternEditorMessages(supported)
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
    this.element("lantern-fields").hidden = launch === undefined
    if (!launch) return
    const stated = launch.releases?.length ?? 0
    const note = this.element("lantern-releases")
    note.hidden = stated === 0
    note.textContent = this.messages.releasesNote.replace("{n}", String(stated))
    this.form ??= new ParameterForm(this.element("lantern-parameters"), this.language, "lantern.", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(LanternParameters.SET, new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editLaunch(launch => apply(launch as unknown as ParameterHolder)),
      (): LanternContext => ({ shapes: this.host.shapes().map(shape => ({ value: shape.id, label: shape.label })) }),
      this.host.positionPlace?.()
    ), () => this.written())
  }

  /** Shows what the recording states only if it holds other launches than the fields were filled for: one loaded, one deleted. */
  refresh(): void {
    this.syncAddState()
    const launches = this.launches
    if (launches.length === this.shown.length && launches.every((launch, i) => launch.id === this.shown[i].id)) return
    this.sync()
  }

  /** Lanterns are let go in front of the observer: they can be added once the recording has a place. */
  private syncAddState(): void {
    const placed = this.siteOfNew() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addLaunchNowhere)
  }

  /** The launch on show, if any. */
  get current(): LanternLaunchJson | undefined {
    return this.launches.find(launch => launch.id === this.currentId)
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <div id="lantern-list"></div>
      <div id="lantern-fields" class="launch-fields">
        <div id="lantern-parameters" class="launch-parameters"></div>
        <p id="lantern-releases" class="launch-intro" hidden></p>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("lantern-list"), body: this.element("lantern-fields"),
      ids: { list: "lantern-select", remove: "lantern-delete", add: "lantern-add" },
      onSelect: id => { this.currentId = id; this.sync() },
      onAdd: () => this.addLaunch(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.launch, remove: m.deleteLaunch, add: m.addLaunch, empty: m.none })
  }

  /** A field was written onto the launch. */
  private written(): void {
    const launch = this.current
    if (launch) this.list?.rename(launch.id, this.labelOf(launch))
  }

  /** Writes an edit of the launch on show: a copy edited by `apply`, in a new interpretation (see the class), told to the editor. */
  private editLaunch(apply: (launch: LanternLaunchJson) => void): void {
    const launch = this.current
    if (!launch) return
    const edited: LanternLaunchJson = structuredClone(launch)
    apply(edited)
    this.writeLaunches(this.launches.map(other => other === launch ? edited : other))
    this.host.changed()
  }

  /**
   * Where new lanterns are let go: a kilometre and a half in front of the observer, at the ground of the recording's place — a placeholder
   * to be given the real garden. Undefined where the recording has no place.
   */
  private siteOfNew(): { eastM: number, northM: number } | undefined {
    const sighting = this.host.sighting()
    const origin = sighting.event?.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return undefined
    const pose = sighting.observerTrack?.getInterpolatedPoseAt(0)
    const heading = (pose?.headingDeg ?? 0) * Math.PI / 180
    const metresPerDegree = 111320
    // The observer may not stand at the place itself: in front of them, in the place's own frame.
    const eastOfPlace = pose?.lng !== undefined ? (pose.lng - origin.lng) * metresPerDegree * Math.cos(origin.lat * Math.PI / 180) : 0
    const northOfPlace = pose?.lat !== undefined ? (pose.lat - origin.lat) * metresPerDegree : 0
    return { eastM: Math.round(eastOfPlace + 1500 * Math.sin(heading)), northM: Math.round(northOfPlace + 1500 * Math.cos(heading)) }
  }

  /**
   * Adds a dozen lanterns let go over two minutes from the start of the recording, carried by the recording's own wind — the common case,
   * to be told apart by the fields.
   */
  private addLaunch(): void {
    const site = this.siteOfNew()
    if (!site) return
    let n = this.launches.length + 1
    while (this.launches.some(launch => launch.id === `lanterns-${n}`)) n++
    const weather = resolveWeatherAt(this.host.sighting(), 0)
    const launch: LanternLaunchJson = {
      id: `lanterns-${n}`,
      site,
      group: { count: 12, fromT: 0, untilT: 120000, seed: n },
      // Where the wind blows TOWARDS, where a weather states where it comes FROM.
      wind: { towardDeg: Math.round((weather.windDirectionDeg + 180) % 360), speedMS: Math.round(weather.windSpeed * 10) / 10 }
    }
    this.writeLaunches([...this.launches, launch])
    this.currentId = launch.id
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const launch = this.current
    if (!launch) return
    this.currentId = undefined
    this.writeLaunches(this.launches.filter(other => other !== launch))
    this.host.changed()
    this.sync()
  }

  /** The interpretation with these launches, a new one; none left of it when it then says nothing at all. */
  private writeLaunches(lanterns: LanternLaunchJson[]): void {
    const sighting = this.host.sighting()
    const interpretation: InterpretationJson = { ...(sighting.interpretation ?? { bodies: [] }), lanterns: lanterns.length > 0 ? lanterns : undefined }
    if (interpretation.lanterns === undefined) delete interpretation.lanterns
    const empty = interpretation.bodies.length === 0 && interpretation.title === undefined && interpretation.smoke === undefined
      && interpretation.flares === undefined && interpretation.lanterns === undefined
    sighting.interpretation = empty ? undefined : interpretation
  }

  private labelOf(launch: LanternLaunchJson): string {
    const title = this.host.said().read(launch.title)
    return title ? `${title} (${launch.id})` : launch.id
  }

  private get launches(): LanternLaunchJson[] {
    return this.host.sighting().interpretation?.lanterns ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
