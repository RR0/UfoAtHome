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
import { ParameterForm } from "./ParameterForm.js"

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
 * What is edited here is what a launch IS and how its exhaust behaves. Where it flew is its path,
 * stated in the file and shown, as a body's movement is: a path is a table of places and instants,
 * and typing one into fields is slower and worse than writing it down once with its sources.
 */
export class LaunchEditor {
  private messages: LaunchEditorMessages = launchEditorMessages_en
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
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
    const select = this.select("launch-select")
    select.replaceChildren(...launches.map(launch => new Option(this.labelOf(launch), launch.id)))
    if (this.currentId !== undefined) select.value = this.currentId
    select.closest("label")!.hidden = launches.length === 0
    this.element("launch-none").hidden = launches.length > 0
    const launch = this.current
    this.element("launch-fields").hidden = launch === undefined
    if (!launch) return
    this.element("launch-track").textContent = this.trackSummary(launch)
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
    this.sync()
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="launch-editor">
      <p class="launch-intro">${m.intro}</p>
      <p id="launch-none" class="launch-intro">${m.none}</p>
      <label><span>${m.launch}</span> <select id="launch-select"></select></label>
      <button id="launch-delete" type="button" class="icon-btn" title="${m.deleteLaunch}" aria-label="${m.deleteLaunch}">🗑</button>
      <div id="launch-fields" class="launch-fields">
        <p class="launch-track"><span>${m.track}</span> <output id="launch-track"></output></p>
        <div id="launch-parameters" class="launch-parameters"></div>
        <p class="launch-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.select("launch-select").addEventListener("change", () => {
      this.currentId = this.select("launch-select").value
      this.sync()
    })
    this.element("launch-delete").addEventListener("click", () => this.deleteCurrent())
  }

  /** A field of the form was written onto the launch. */
  private written(): void {
    this.host.changed()
    const launch = this.current
    if (!launch) return
    const select = this.select("launch-select")
    const option = [...select.options].find(candidate => candidate.value === launch.id)
    if (option) option.textContent = this.labelOf(launch)
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

  private trackSummary(launch: LaunchJson): string {
    const keys = launch.track ?? []
    if (keys.length < 2) return this.messages.trackEmpty
    const seconds = (ms: number) => `${Math.round(ms / 100) / 10} s`
    const times = keys.map(key => key.t)
    const top = Math.max(...keys.map(key => key.altitudeKm))
    return this.messages.trackSpan.replace("{n}", String(keys.length)).replace("{from}", seconds(Math.min(...times)))
      .replace("{to}", seconds(Math.max(...times))).replace("{top}", String(Math.round(top)))
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


  private select(id: string): HTMLSelectElement {
    return this.element(id) as HTMLSelectElement
  }
}
