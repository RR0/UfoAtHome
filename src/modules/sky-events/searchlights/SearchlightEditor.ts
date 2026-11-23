import { SEARCHLIGHT_PARAMETER_TEXTS } from "./messages/SearchlightParameterTexts.js"
import type { SearchlightParameterTexts } from "./messages/SearchlightParameterTexts.js"
import { SEARCHLIGHT_EDITOR_MESSAGES } from "./messages/SearchlightEditorMessages.js"
import type { SearchlightEditorMessages } from "./messages/SearchlightEditorMessages.js"
import { ParameterRegistry, ParameterTexts } from "../../../engine/interpretation/Parameters.js"
import { SkyEvents } from "../../../engine/model/SkyEvents.js"
import { SkyEventEditorStyle } from "../SkyEventEditorStyle.js"
import type { SkyEventEditor, SkyEventEditorHost } from "../SkyEventKind.js"
import { ElementList } from "../../../component/ElementList.js"
import { ParameterForm, ParameterTarget } from "../../../component/ParameterForm.js"
import type { ParameterHolder } from "../../../engine/interpretation/Parameters.js"
import { SearchlightParameters } from "./SearchlightParameters.js"
import type { SearchlightJson } from "./Searchlight.js"

/**
 * The searchlights of the recording, edited: each with the fields of SearchlightParameters, drawn by the generic ParameterForm, its position
 * said as degrees or from the witness or a decor object (see PositionPlace). A new one is put beside the witness, to be moved where it stood.
 */
export class SearchlightEditor implements SkyEventEditor {
  private messages!: SearchlightEditorMessages
  private parameterTexts!: SearchlightParameterTexts
  readonly ready: Promise<void>
  private languageToken = 0
  private currentId?: string
  private form?: ParameterForm
  private list?: ElementList
  private language: string
  private shown: readonly SearchlightJson[] = []

  private static readonly STYLE = `.searchlight-editor-part { flex-basis: 100%; min-width: 0; } .searchlight-editor-part .searchlight-editor, .searchlight-editor-part .searchlight-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; } .searchlight-editor-part #searchlight-list, .searchlight-editor-part .searchlight-fields { flex-basis: 100%; min-width: 0; } .searchlight-editor-part [hidden] { display: none !important; } .searchlight-editor-part .searchlight-intro { flex-basis: 100%; margin: 0; } .searchlight-editor-part .searchlight-parameters { flex-basis: 100%; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; } .searchlight-editor-part .parameter-group { flex: 1 1 14em; min-width: 0; box-sizing: border-box; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: flex-start; align-content: flex-start; } .searchlight-editor-part input, .searchlight-editor-part select { max-width: 100%; box-sizing: border-box; } .searchlight-editor-part label { min-width: 0; max-width: 100%; } .searchlight-editor-part input.parameter-derived::placeholder { opacity: .65; }`

  constructor(private readonly container: HTMLElement, private readonly host: SkyEventEditorHost, language: string) {
    SkyEventEditorStyle.attach(container, "searchlight-editor-part", SearchlightEditor.STYLE)
    this.language = language
    if (!ParameterRegistry.of("searchlight")) SearchlightParameters.publish()
    this.ready = this.setLanguage(language)
  }

  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const [messages, parameterTexts] = await Promise.all([SEARCHLIGHT_EDITOR_MESSAGES.load(language), SEARCHLIGHT_PARAMETER_TEXTS.load(language)])
    if (token !== this.languageToken) return
    this.messages = messages
    this.parameterTexts = parameterTexts
    this.render()
    this.sync()
  }

  sync(): void {
    if (!this.messages) return
    const searchlights = this.searchlights
    this.shown = [...searchlights]
    if (!searchlights.some(searchlight => searchlight.id === this.currentId)) this.currentId = searchlights[0]?.id
    this.list?.setItems(searchlights.map(searchlight => ({ id: searchlight.id, label: this.labelOf(searchlight) })), this.currentId)
    const placed = this.placeOfNew() !== undefined
    this.list?.setAddState(placed, placed ? undefined : this.messages.addNowhere)
    const searchlight = this.current
    this.element("searchlight-fields").hidden = searchlight === undefined
    if (!searchlight) return
    const set = ParameterTexts.resolve(ParameterRegistry.of("searchlight")!, this.parameterTexts)
    this.form ??= new ParameterForm(this.element("searchlight-parameters"), this.language, "", { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() })
    this.form.show(set, new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => {
        const current = this.current
        if (current) apply(current as unknown as ParameterHolder)
      },
      undefined,
      this.host.positionPlace?.()
    ), () => this.host.changed())
  }

  refresh(): void {
    if (!this.messages) return
    const searchlights = this.searchlights
    if (searchlights.length === this.shown.length && searchlights.every((searchlight, i) => searchlight === this.shown[i])) return
    this.sync()
  }

  setTime(_t: number): void {
    // Nothing of the part follows the playhead.
  }

  private get current(): SearchlightJson | undefined {
    return this.searchlights.find(searchlight => searchlight.id === this.currentId)
  }

  private render(): void {
    const m = this.messages
    this.form = undefined
    this.container.innerHTML = `<div class="searchlight-editor">
      <p class="searchlight-intro">${m.intro}</p>
      <div id="searchlight-list"></div>
      <div id="searchlight-fields" class="searchlight-fields">
        <div id="searchlight-parameters" class="searchlight-parameters"></div>
        <p class="searchlight-intro">${m.defaultsNote}</p>
      </div>
    </div>`
    this.list = new ElementList({
      header: this.element("searchlight-list"), body: this.element("searchlight-fields"),
      ids: { list: "searchlight-select", remove: "searchlight-delete", add: "searchlight-add" },
      onSelect: id => {
        this.currentId = id
        this.sync()
      },
      onAdd: () => this.addSearchlight(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.searchlight, remove: m.deleteSearchlight, add: m.addSearchlight, empty: m.none })
  }

  /** Where a new searchlight goes: the recording's place, beside the witness. Undefined where the recording has no place. */
  private placeOfNew(): { lat: number, lng: number } | undefined {
    const origin = this.host.sighting().event?.place?.[0]
    return origin?.lat === undefined || origin.lng === undefined ? undefined : { lat: origin.lat, lng: origin.lng }
  }

  /** A new searchlight beside the witness, over the whole recording: a skytracker's four heads, the commonest there is, its other fields empty. */
  private addSearchlight(): void {
    const place = this.placeOfNew()
    if (!place) return
    const sighting = this.host.sighting()
    const ids = new Set(this.searchlights.map(searchlight => searchlight.id))
    let n = this.searchlights.length + 1
    while (ids.has(`searchlight-${n}`)) n++
    const searchlight: SearchlightJson = { id: `searchlight-${n}`, lat: place.lat, lng: place.lng, beams: 4 }
    sighting.skyEvents = { ...sighting.skyEvents, searchlights: [...this.searchlights, searchlight] }
    this.currentId = searchlight.id
    this.host.changed()
    this.sync()
  }

  private deleteCurrent(): void {
    const searchlight = this.current
    if (!searchlight) return
    const sighting = this.host.sighting()
    sighting.skyEvents = SkyEvents.written({ ...sighting.skyEvents, searchlights: this.searchlights.filter(other => other !== searchlight) })
    this.host.changed()
    this.sync()
  }

  private labelOf(searchlight: SearchlightJson): string {
    const title = searchlight.title ? this.host.said().read(searchlight.title) : ""
    return title ? `${title} (${searchlight.id})` : searchlight.id
  }

  private get searchlights(): SearchlightJson[] {
    return (this.host.sighting().skyEvents?.searchlights as SearchlightJson[] | undefined) ?? []
  }

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>(`#${id}`)!
  }
}
