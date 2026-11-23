import { AURORA_PARAMETER_TEXTS } from "./messages/AuroraParameterTexts.js"
import type { AuroraParameterTexts } from "./messages/AuroraParameterTexts.js"
import { AURORA_EDITOR_MESSAGES } from "./messages/AuroraEditorMessages.js"
import type { AuroraEditorMessages } from "./messages/AuroraEditorMessages.js"
import { ParameterRegistry, ParameterTexts } from "../../../engine/interpretation/Parameters.js"
import { SkyEvents } from "../../../engine/model/SkyEvents.js"
import { SkyEventEditorStyle } from "../SkyEventEditorStyle.js"
import type { SkyEventEditor, SkyEventEditorHost } from "../SkyEventKind.js"
import { ElementList } from "../../../component/ElementList.js"
import { ParameterForm } from "../../../component/ParameterForm.js"
import { AuroraParameters } from "./AuroraParameters.js"
import type { AuroraJson } from "./Aurora.js"

/**
 * The aurorae of the recording, edited: each with the fields of AuroraParameters, drawn by the generic ParameterForm. Without one the scene
 * shows the aurora the archived Kp implies (see GeomagneticArchive), which a stated one replaces.
 */
export class AuroraEditor implements SkyEventEditor {
  private messages!: AuroraEditorMessages
  private parameterTexts!: AuroraParameterTexts
  readonly ready: Promise<void>
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private language: string
  private shown: readonly AuroraJson[] = []

  private static readonly STYLE = `.aurora-editor-part { flex-basis: 100%; min-width: 0; } .aurora-editor-part .aurora-editor, .aurora-editor-part .aurora-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .aurora-editor-part #aurora-list, .aurora-editor-part .aurora-fields { flex-basis: 100%; min-width: 0; } .aurora-editor-part [hidden] { display: none !important; } .aurora-editor-part .aurora-intro { flex-basis: 100%; margin: 0; } .aurora-editor-part .aurora-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .aurora-editor-part .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .aurora-editor-part input, .aurora-editor-part select { max-width: 100%; box-sizing: border-box; } .aurora-editor-part label { min-width: 0; max-width: 100%; } .aurora-editor-part input.parameter-derived::placeholder { opacity: .65; }`

  constructor(private readonly container: HTMLElement, private readonly host: SkyEventEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "aurora-editor-part", AuroraEditor.STYLE)
    this.language = language
    if (!ParameterRegistry.of("aurora")) AuroraParameters.publish()
    this.ready = this.setLanguage(language)
  }

  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const [messages, parameterTexts] = await Promise.all([AURORA_EDITOR_MESSAGES.load(language), AURORA_PARAMETER_TEXTS.load(language)])
    if (token !== this.languageToken) return
    this.messages = messages
    this.parameterTexts = parameterTexts
    this.render()
    this.sync()
  }

  sync(): void {
    if (!this.messages) return
    const auroras = this.auroras
    this.shown = [...auroras]
    if (!auroras.some(aurora => aurora.id === this.currentId)) this.currentId = auroras[0]?.id
    this.list?.setItems(auroras.map(aurora => ({ id: aurora.id, label: this.labelOf(aurora) })), this.currentId)
    const aurora = this.current
    this.element("aurora-fields").hidden = aurora === undefined
    if (!aurora) return
    const set = ParameterTexts.resolve(ParameterRegistry.of("aurora")!, this.parameterTexts)
    this.form ??= new ParameterForm(this.element("aurora-parameters"), this.language, "", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(set, aurora as unknown as Record<string, unknown>, () => this.host.changed())
  }

  refresh(): void {
    if (!this.messages) return
    const auroras = this.auroras
    if (auroras.length === this.shown.length && auroras.every((aurora, i) => aurora === this.shown[i])) return
    this.sync()
  }

  setTime(_t: number): void {
    // Nothing of the part follows the playhead.
  }

  private get current(): AuroraJson | undefined {
    return this.auroras.find(aurora => aurora.id === this.currentId)
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="aurora-editor">
      <p class="aurora-intro">${m.intro}</p>
      <div id="aurora-list"></div>
      <div id="aurora-fields" class="aurora-fields">
        <div id="aurora-parameters" class="aurora-parameters"></div>
        <p class="aurora-intro">${m.derivedNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("aurora-list"), body: this.element("aurora-fields"),
      ids: { list: "aurora-select", remove: "aurora-delete", add: "aurora-add" },
      onSelect: id => {
        this.currentId = id
        this.sync()
      },
      onAdd: () => this.addAurora(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.aurora, remove: m.deleteAurora, add: m.addAurora, empty: m.none })
  }

  /** A new aurora, of a disturbed field (Kp 5), over the whole recording. */
  private addAurora(): void {
    const sighting = this.host.sighting()
    const ids = new Set(this.auroras.map(aurora => aurora.id))
    let n = this.auroras.length + 1
    while (ids.has(`aurora-${n}`)) n++
    const aurora: AuroraJson = { id: `aurora-${n}`, kp: 5 }
    sighting.skyEvents = { ...sighting.skyEvents, auroras: [...this.auroras, aurora] }
    this.currentId = aurora.id
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const aurora = this.current
    if (!aurora) return
    const sighting = this.host.sighting()
    sighting.skyEvents = SkyEvents.written({ ...sighting.skyEvents, auroras: this.auroras.filter(other => other !== aurora) })
    this.host.changed()
    this.sync()
  }

  private labelOf(aurora: AuroraJson): string {
    const title = aurora.title ? this.host.said().read(aurora.title) : ""
    return title ? `${title} (${aurora.id})` : aurora.id
  }

  private get auroras(): AuroraJson[] {
    return (this.host.sighting().skyEvents?.auroras as AuroraJson[] | undefined) ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
