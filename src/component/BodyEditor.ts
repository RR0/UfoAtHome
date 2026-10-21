import type { BodyJson, BodyKeyframe, InterpretationJson } from "../engine/interpretation/Interpretation.js"
import { BODY_PRIMITIVES } from "../engine/interpretation/Interpretation.js"
import type { BodyPrimitive } from "../engine/interpretation/Interpretation.js"
import type { DecorModelRef } from "../engine/model/Decor.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import type { DecorModelEntry, DecorModelProvider } from "../render3d/decor/DecorModelProvider.js"
import type { BodyReading } from "./SceneElement.js"
import type { ModelPicker } from "./ModelPicker.js"
import { ElementList } from "./ElementList.js"
import { ParameterForm, ParameterTarget } from "./ParameterForm.js"
import { BodyKeyframes, BodyParameterSets } from "../engine/interpretation/BodyParameterSets.js"
import type { BodyContext, BodyKeyframeContext, BodyKeyframeView } from "../engine/interpretation/BodyParameterSets.js"
import type { ParameterHolder } from "../engine/interpretation/Parameters.js"
import type { BodyEditorMessages } from "./messages/BodyEditorMessages.js"
import { bodyEditorMessages_en } from "./messages/BodyEditorMessages_en.js"
import type { UfoLanguage } from "./messages/index.js"
import { loadBodyEditorMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"

/** What the Bodies part needs of the editor it stands in, read at every use: the recording, its
 * texts reader and its model catalogue are all replaced over an editor's life. */
export interface BodyEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  modelProvider(): DecorModelProvider
  /** The window that shows the models as pictures, in the editor's language. */
  modelPicker(): ModelPicker
  /** The shapes of the recording, as the Shape picker names them. */
  shapes(): { id: string, label: string }[]
  /** An edit was written onto the recording. */
  changed(): void
  /** Where a new body starts: the selected shape and the first keyframe that stands it where the
   * scene draws that shape at the playhead. Undefined when no shape is selected. */
  newBodyStart(): { sourceId?: string, label?: string, keyframe: BodyKeyframe } | undefined
  /** Turns the observer towards a body, as the decor's own "Look at it" does. */
  lookAt(body: BodyJson): void
  /** The playhead, ms. */
  currentTime(): number
  /** Moves the playhead to `t`, ms: how a keyframe picked in the list is shown. */
  seekTo(t: number): void
  /** The body as it stands at `t` — see SceneElement.bodyReading. */
  readingOf(body: BodyJson, t: number): BodyReading | undefined
  /** How far along a line of sight from the eye at `t` the ground is — see SceneElement.groundAlong. */
  groundAlong(azimuthDeg: number, altitudeDeg: number, t: number): number | undefined
}

/**
 * The observer's own interpretation, edited: the bodies of `Sighting.interpretation`, each with the
 * shapes it stands for and the model it is drawn as — a built-in shape, a catalogue entry, or a
 * glTF file at an address (absolute, or relative to the recording's own file: see
 * SceneRenderer.documentUrl).
 *
 * A part of the Phenomenon group rather than a group of its own: a body is what a shape WAS, and
 * the two are edited side by side. What is typed is written as typed — an address whose credit is
 * incomplete is kept, and simply not drawn until it is complete (see SceneRenderer.loadBodyModel).
 * A body's movement is its keyframes: listed here, picked to go to their instant, added at the playhead, deleted; what each one states is
 * edited at the playhead by the form of the instant.
 */
export class BodyEditor {
  /** The fields of the look of an instant: an edit of one of them is this keyframe's own statement of its look. */
  private static readonly APPEARANCE_KEYS: readonly string[] = ["color", "albedo", "luminanceCdM2", "transparency", "haloScale"]
  /** English, the fallback baked in, until the chosen language's module has loaded. */
  private messages: BodyEditorMessages = bodyEditorMessages_en
  /** The language last asked for, so a slower load cannot overwrite a later choice. */
  private languageToken = 0
  private currentId?: string
  private catalogueToken = 0
  /** The catalogue model the address block is showing, if it is showing one — see showCatalogueModel. */
  private shownEntry?: DecorModelEntry
  /** The body the fields were last filled for. */
  private syncedId?: string
  /** The properties a body has (its id, its name, the shapes it stands for, the part the observer drew) and its place, size,
   * attitude and look at the playhead, both drawn by the generic form from what a body says it has (see BodyParameterSets). */
  private bodyForm?: ParameterForm
  private keyForm?: ParameterForm

  constructor(private readonly container: HTMLElement, private readonly host: BodyEditorHost, private language: string) {
    this.render()
    void this.setLanguage(language)
  }

  /** Rebuilds the part in another language, keeping the body on show. Only that language's
   * messages are fetched; English is shown meanwhile. */
  async setLanguage(language: string): Promise<void> {
    const token = ++this.languageToken
    this.language = language
    const supported = (UFO_SUPPORTED_LANGUAGES as readonly string[]).includes(language) ? language as UfoLanguage : "en"
    const messages = supported === "en" ? bodyEditorMessages_en : await loadBodyEditorMessages(supported)
    // Superseded by a later choice made while this one was loading.
    if (token !== this.languageToken) return
    if (messages === this.messages) return
    this.messages = messages
    this.render()
  }

  /** Shows what the recording states now: after a recording is loaded, or a shape renamed. */
  sync(): void {
    const bodies = this.bodies
    if (!bodies.some(body => body.id === this.currentId)) this.currentId = bodies[0]?.id
    this.input("body-interpretation-title").value = this.host.said().read(this.interpretation?.title) ?? ""
    this.list?.setItems(bodies.map(body => ({ id: body.id, label: this.labelOf(body) })), this.currentId)
    const start = this.host.newBodyStart()
    this.list?.setAddState(start !== undefined, !start ? undefined
      : start.label !== undefined ? this.messages.addBodyHint.replace("{shape}", start.label) : this.messages.addBodyHintView)
    // Always there, so that a recording can be named before it has a body: typing a title creates the interpretation.
    this.input("body-interpretation-title").closest("label")!.hidden = false
    const body = this.current
    this.element("body-fields").hidden = body === undefined
    if (!body) return
    this.bodyForm?.sync()
    void this.syncModelOptions(body)
    const model = body.model
    this.input("body-model-url").value = model.url ?? ""
    this.input("body-model-title").value = model.credit?.title ?? ""
    this.input("body-model-author").value = model.credit?.author ?? ""
    this.input("body-model-license").value = model.credit?.license ?? ""
    this.input("body-model-source").value = model.credit?.sourceUrl ?? ""
    // Opened for an address; left as the author set it while the same body stays on show.
    const details = this.element("body-model-advanced") as HTMLDetailsElement
    details.open = model.url !== undefined || (details.open && body.id === this.syncedId)
    this.syncedId = body.id
    this.element("body-model-incomplete").hidden = model.url === undefined || (model.credit?.title !== undefined && model.credit.license !== undefined)
    this.syncKeyframe()
  }

  /** The fields of the playhead's instant: what the body is there (interpolated between its
   * keyframes), in the form its own keyframes use. Called as the playhead moves; a field being
   * typed in is left alone. */
  syncKeyframe(force = false): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const m = this.messages
    this.element("body-key-legend").textContent = m.atPlayhead.replace("{t}", BodyEditor.seconds(t))
    const reading = this.host.readingOf(body, t)
    const here = body.track.find(key => key.t === t)
    this.element("body-key-note").textContent = !reading ? m.notPlaced : here ? m.keyframeHere : m.keyframeAdded
    this.keyList?.setItems(body.track.map(key => ({ id: String(key.t), label: BodyEditor.seconds(key.t) })), here ? String(here.t) : "")
    this.keyList?.setAddState(reading !== undefined && here === undefined)
    this.keyList?.setStepState(body.track.some(key => key.t < t), body.track.some(key => key.t > t))
    this.element("body-key-parameters").hidden = !reading
    if (reading) this.keyForm?.sync(force)
  }

  /** Goes to the keyframe before or after the playhead: the one picked, or the nearest where the playhead is between two. */
  private stepKeyframe(direction: -1 | 1): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const times = body.track.map(key => key.t).filter(at => direction < 0 ? at < t : at > t)
    if (times.length === 0) return
    this.host.seekTo(direction < 0 ? Math.max(...times) : Math.min(...times))
    this.syncKeyframe(true)
  }

  /** What the form of the instant needs that the body alone cannot say. */
  private keyframeContext(): BodyKeyframeContext {
    const model = this.current?.model
    // Only the built-in shapes are painted: a model keeps the materials of its file, so a colour picked for it would change nothing.
    return { drawnFromModel: model === undefined || model.url !== undefined || !(BODY_PRIMITIVES as readonly string[]).includes(model.id ?? "") }
  }

  /** The body at the playhead as the form of the instant shows it, or nothing where the scene does not place it. */
  private keyframeView(): BodyKeyframeView | undefined {
    const body = this.current
    if (!body) return undefined
    const t = this.host.currentTime()
    const reading = this.host.readingOf(body, t)
    return reading ? BodyKeyframes.viewOf(body, t, reading) : undefined
  }

  private render(): void {
    const m = this.messages
    // The unit stands AFTER the field, never in the label before it, and a field is as wide as the
    // values it takes (see the CSS) — the user's own rules for every form field here.
    const field = (id: string, label: string, type = "text", placeholder = "", unit = "", bounds = "") =>
      `<label><span>${label}</span> <input id="${id}" type="${type}" placeholder="${placeholder}" ${bounds} autocomplete="off"/>${unit ? ` ${unit}` : ""}</label>`
    this.container.innerHTML = `<div class="body-editor">
      <p class="body-intro">${m.intro}</p>
      ${field("body-interpretation-title", m.interpretationTitle)}
      <div id="body-list" class="body-list"></div>
      <div id="body-fields" class="body-fields">
        <div id="body-parameters" class="body-parameters"></div>
        <label><span>${m.model}</span> <select id="body-model"></select></label>
        <details id="body-model-advanced" class="decor-model-advanced" hidden>
          <summary>${m.modelAdvanced}</summary>
          ${field("body-model-url", m.modelUrl, "text", m.modelUrlHint)}
          ${field("body-model-title", m.modelTitle)}
          ${field("body-model-author", m.modelAuthor)}
          ${field("body-model-license", m.modelLicense, "text", "CC0 1.0")}
          ${field("body-model-source", m.modelSource, "url", "https://…")}
          <p id="body-model-incomplete" class="body-intro" hidden>${m.modelIncomplete}</p>
          <p id="body-model-catalogue" class="body-intro" hidden>${m.modelFromCatalogue}</p>
        </details>
        <div id="body-keys" class="body-keys"></div>
        <fieldset class="body-key">
          <legend id="body-key-legend"></legend>
          <p id="body-key-note" class="body-intro"></p>
          <div id="body-key-parameters" class="body-parameters"></div>
          <p class="body-intro">${m.appearanceNote}</p>
          <p class="body-intro">${m.pictureHint}</p>
        </fieldset>
      </div>
    </div>`
    const list = this.element("body-list")
    this.list = new ElementList({
      header: list, body: this.element("body-fields"),
      ids: { list: "body-select", remove: "body-delete", add: "body-add" },
      actions: [{ id: "body-look", glyph: "🎯", onClick: () => { const body = this.current; if (body) this.host.lookAt(body) } }],
      onSelect: id => { this.currentId = id; this.sync() },
      onAdd: () => this.addBody(),
      onRemove: () => this.deleteCurrent()
    })
    this.list.setLabels({ list: m.body, remove: m.deleteBody, add: m.addBody, empty: m.none, actions: { "body-look": m.lookAtBody } })
    this.input("body-interpretation-title").addEventListener("change", () => this.updateInterpretationTitle())
    for (const id of ["body-model-url", "body-model-title", "body-model-author", "body-model-license", "body-model-source"]) {
      this.input(id).addEventListener("change", () => this.updateCurrent())
    }
    this.select("body-model").addEventListener("change", () => {
      // Picking a built-in shape or a catalogue entry is choosing it over any address typed below.
      const id = this.select("body-model").value
      if (id !== "") this.input("body-model-url").value = ""
      this.updateCurrent()
      void this.syncModelOptions(this.current!)
      if (id !== "") void this.adoptCatalogueSize(id)
      // A catalogue model's address and credit are shown as soon as it is picked; a built-in shape has none.
      ;(this.element("body-model-advanced") as HTMLDetailsElement).open = id !== "" && !(BODY_PRIMITIVES as readonly string[]).includes(id)
    })
    const keys = this.element("body-keys")
    this.keyList = new ElementList({
      header: keys, optional: true,
      ids: { list: "body-key", remove: "body-key-delete", add: "body-key-add" },
      navigation: { scope: this.container, onStep: direction => this.stepKeyframe(direction) },
      onSelect: id => { if (id !== "") this.host.seekTo(Number(id)); this.syncKeyframe(true) },
      onAdd: () => this.editView(() => undefined),
      onRemove: () => this.deleteKeyframe()
    })
    this.keyList.setLabels({ list: m.keyframes, remove: m.deleteKeyframe, add: m.addKeyframe, none: m.noKeyframeHere, previous: m.previousKeyframe, next: m.nextKeyframe })
    // The drop-down gives way to a window of pictures, over the same options and the same "change".
    this.host.modelPicker().enhance(this.select("body-model"), async id => (BODY_PRIMITIVES as readonly string[]).includes(id)
      ? { shape: id as BodyPrimitive }
      : this.host.modelProvider().entry(id).then(entry => entry && { url: entry.url, headingOffsetDeg: entry.headingOffsetDeg }), {
      current: () => {
        const model = this.current?.model
        return model?.url === undefined ? undefined : {
          url: model.url, title: model.credit?.title ?? "", author: model.credit?.author ?? "",
          license: model.credit?.license ?? "", source: model.credit?.sourceUrl ?? ""
        }
      },
      apply: address => {
        // The hidden fields still carry what the form states, and statedModel reads them.
        this.input("body-model-url").value = address.url
        this.input("body-model-title").value = address.title
        this.input("body-model-author").value = address.author
        this.input("body-model-license").value = address.license
        this.input("body-model-source").value = address.source
        this.shownEntry = undefined
        this.select("body-model").value = ""
        this.updateCurrent()
        void this.syncModelOptions(this.current!)
      }
    })
    // The properties of the body and of its instant: drawn from what a body says it has, and written as they are typed.
    const values = { said: () => this.host.said(), writingLanguage: () => this.host.writingLanguage() }
    this.bodyForm = new ParameterForm(this.element("body-parameters"), this.language, "body.", values)
    this.bodyForm.show(BodyParameterSets.BODY, new ParameterTarget(
      () => this.current as unknown as ParameterHolder | undefined,
      apply => this.editBody(apply),
      (): BodyContext => ({ ids: this.bodies.map(body => body.id), shapes: this.host.shapes().map(shape => ({ value: shape.id, label: shape.label })) })
    ), () => undefined)
    this.keyForm = new ParameterForm(this.element("body-key-parameters"), this.language, "bodyKey.")
    this.keyForm.show(BodyParameterSets.KEYFRAME, new ParameterTarget(
      () => this.keyframeView() as unknown as ParameterHolder | undefined,
      (apply, spec) => this.editView(apply, BodyEditor.APPEARANCE_KEYS.includes(spec.key)),
      () => this.keyframeContext()
    ), () => undefined)
    this.sync()
  }

  private async syncModelOptions(body: BodyJson): Promise<void> {
    const token = ++this.catalogueToken
    const entries = await this.host.modelProvider().entries().catch(() => [])
    if (token !== this.catalogueToken) return
    const m = this.messages
    const select = this.select("body-model")
    const id = body.model.url === undefined ? body.model.id : undefined
    // An id neither list knows is kept on show, as itself, rather than read as another choice.
    const known = id === undefined || (BODY_PRIMITIVES as readonly string[]).includes(id) || entries.some(entry => entry.id === id)
    // The options are replaced only when what they list has changed: the picker over them draws a picture for every change of them, and
    // this runs at every movement of a body, which made it flicker, its picture gone and coming back.
    const signature = [m.primitives, m.catalogue, entries.map(entry => `${entry.id}:${entry.name}`).join(), body.model.url !== undefined, known ? "" : id].join("|")
    if (select.dataset.signature !== signature) {
      select.dataset.signature = signature
      const primitives = document.createElement("optgroup")
      primitives.label = m.primitives
      primitives.append(...BODY_PRIMITIVES.map(primitive => new Option(m.primitive[primitive], primitive)))
      const catalogue = document.createElement("optgroup")
      catalogue.label = m.catalogue
      catalogue.append(...entries.map(entry => new Option(entry.name, entry.id)))
      select.replaceChildren(primitives, catalogue)
      // A model at an address is named below, in its own block: the picker says so rather than
      // showing a blank that reads as "no model".
      if (body.model.url !== undefined) select.prepend(new Option(m.modelAdvanced, ""))
      if (!known) select.append(new Option(id, id))
    }
    select.value = id ?? ""
    this.showCatalogueModel(body.model.url === undefined ? entries.find(entry => entry.id === body.model.id) : undefined)
  }

  /**
   * Fills the address block with what the catalogue says of the model picked — where the file is
   * and whose it is — since that is what was fetched. The recording still names it by its id, so
   * a catalogue re-hosting the file never touches it; only a changed field makes the address the
   * recording's own (see statedModel). A built-in shape empties the block.
   */
  private showCatalogueModel(entry: DecorModelEntry | undefined): void {
    const body = this.current
    if (!body || body.model.url !== undefined) {
      this.shownEntry = undefined
      this.element("body-model-catalogue").hidden = true
      return
    }
    this.shownEntry = entry
    const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement
    const values: [string, string | undefined][] = [
      ["body-model-url", entry?.url], ["body-model-title", entry?.credit.title], ["body-model-author", entry?.credit.author],
      ["body-model-license", entry?.credit.license], ["body-model-source", entry?.credit.sourceUrl]
    ]
    for (const [id, value] of values) if (this.input(id) !== active) this.input(id).value = value ?? ""
    this.element("body-model-catalogue").hidden = entry === undefined
    this.element("body-model-incomplete").hidden = true
  }

  private updateInterpretationTitle(): void {
    const interpretation = this.interpretation ?? { bodies: [] }
    const title = this.host.said().write(interpretation.title, this.input("body-interpretation-title").value, this.host.writingLanguage())
    this.write({ ...interpretation, title })
  }

  /** The model the picker and the address block state, written onto the body. */
  private updateCurrent(): void {
    const body = this.current
    if (!body) return
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, model: this.statedModel(body.model) } : other) })
  }

  /**
   * An edit of what the body is — its id, its name, the shapes it stands for, the part the observer drew — as a copy of
   * it to change, since the interpretation is replaced at every edit. A body keeps the id the form was left with.
   */
  private editBody(apply: (draft: ParameterHolder) => void): void {
    const body = this.current
    if (!body) return
    const edited = structuredClone(body)
    apply(edited as unknown as ParameterHolder)
    this.currentId = edited.id
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? edited : other) })
  }

  /**
   * The edit of the body at the playhead, written as a keyframe there (see BodyKeyframes.keyframeOf): where it is, how big,
   * how turned, and its look only when this edit is of the look. `apply` changes the view of the instant, which is what the
   * form's fields, a drag on the picture and the handles all do.
   */
  private editView(apply: (view: ParameterHolder) => void, appearanceEdited = false): void {
    const body = this.current
    const view = this.keyframeView()
    if (!body || !view) return
    const t = this.host.currentTime()
    apply(view as unknown as ParameterHolder)
    const keyframe = BodyKeyframes.keyframeOf(view, t, body.track.find(key => key.t === t), appearanceEdited)
    const track = [...body.track.filter(key => key.t !== t), keyframe].sort((a, b) => a.t - b.t)
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) })
    this.syncKeyframe()
  }

  /**
   * A new body, standing for the selected shape where the scene draws it now (its direction, the
   * distance it is drawn at, and the real size its apparent width makes there), or, with no shape
   * to stand for, where the observer is looking. A starting point
   * for the interpretation, not a claim: an ellipsoid until a model is chosen, and a single
   * keyframe, so it stays where it was put. The observer's interpretation is created with it when
   * the recording has none.
   */
  private addBody(): void {
    const start = this.host.newBodyStart()
    if (!start) return
    const ids = new Set(this.bodies.map(body => body.id))
    let n = ids.size + 1
    while (ids.has(`body-${n}`)) n++
    const body: BodyJson = { id: `body-${n}`, explains: start.sourceId !== undefined ? [start.sourceId] : undefined, model: { id: "ellipsoid" }, track: [start.keyframe] }
    this.currentId = body.id
    const interpretation = this.interpretation ?? { bodies: [] }
    this.write({ ...interpretation, bodies: [...this.bodies, body] }, true)
  }

  /**
   * A catalogue model that knows how big the real thing is (see DecorModelEntry.sizeM) gives the
   * body that size, and moves it along its line of sight so that it keeps the angle it spans: an
   * airliner is 36 m across whoever draws it, and what the observer saw was an angle, so a 36 m
   * airliner seen as wide as a 70 cm one five metres off is 250 m away. Only keyframes stating
   * their size and a distance along a direction move; a body placed in metres keeps its place.
   */
  private async adoptCatalogueSize(id: string): Promise<void> {
    const entry = await this.host.modelProvider().entry(id).catch(() => undefined)
    const real = entry?.sizeM
    const body = this.current
    if (!real || !body || body.model.id !== id) return
    // A body no keyframe gives a size to (one added with no shape to stand for) is drawn a metre
    // across: it takes the real size on its first keyframe, where it has no angle to keep.
    if (!body.track.some(key => key.sizeM) && body.track.length > 0) {
      const [first, ...rest] = [...body.track].sort((a, b) => a.t - b.t)
      const sizeM = { widthM: real.widthM ?? 1, lengthM: real.lengthM ?? real.widthM ?? 1, heightM: real.heightM ?? 1 }
      const track = [{ ...first, sizeM }, ...rest]
      this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) }, true)
      return
    }
    const track = body.track.map(key => {
      const width = key.sizeM?.widthM
      const realWidth = real.widthM ?? width
      if (!key.sizeM || width === undefined || realWidth === undefined || width <= 0) return key
      const ratio = realWidth / width
      const sizeM = { widthM: real.widthM ?? key.sizeM.widthM * ratio, lengthM: real.lengthM ?? key.sizeM.lengthM * ratio, heightM: real.heightM ?? key.sizeM.heightM * ratio }
      return key.distanceM !== undefined && key.azimuthDeg !== undefined
        ? { ...key, sizeM, distanceM: Number((key.distanceM * ratio).toFixed(1)) }
        : { ...key, sizeM }
    })
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) }, true)
  }

  /** The body on show in the fields — the one the picture frames with handles. */
  get currentBodyId(): string | undefined {
    return this.current?.id
  }

  /** Gives the body on show this size at the playhead — what its handles on the picture do. */
  resize(sizeM: { widthM: number, lengthM: number, heightM: number }): void {
    const held = (value: number) => Number(Math.max(0.01, value).toFixed(2))
    this.editView(view => Object.assign(view, { widthM: held(sizeM.widthM), lengthM: held(sizeM.lengthM), heightM: held(sizeM.heightM) }))
  }

  /** Turns the body on show to this attitude at the playhead — what its rotation handle does. The
   * heading wraps round; pitch and roll are kept within a half-turn either way. */
  turnTo(attitude: { headingDeg: number, pitchDeg: number, rollDeg: number }): void {
    const half = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180
    this.editView(view => Object.assign(view, {
      headingDeg: Number((((attitude.headingDeg % 360) + 360) % 360).toFixed(1)),
      pitchDeg: Number(Math.max(-90, Math.min(90, attitude.pitchDeg)).toFixed(1)),
      rollDeg: Number(half(attitude.rollDeg).toFixed(1))
    }))
  }

  /** Puts a body on show in the fields, as a press on it in the picture does. */
  show(id: string): void {
    if (!this.bodies.some(body => body.id === id) || id === this.currentId) return
    this.currentId = id
    this.sync()
  }

  /** The body on show where it stands at the playhead — where a drag on the picture starts from. */
  readingNow(): BodyReading | undefined {
    const body = this.current
    return body && this.host.readingOf(body, this.host.currentTime())
  }

  /**
   * Moves the body on show to a direction from the observer, at the playhead — what dragging it on
   * the picture does, written through the same view as typing (see editView), which the fields then
   * show. On the ground it slides over the relief: its distance becomes where the line of sight meets
   * the ground, when it does. In the air it keeps its distance, and in the world's terms its level
   * distance, the drag raising or lowering it over the ground.
   */
  dragTo(azimuthDeg: number, altitudeDeg: number): void {
    const reading = this.readingNow()
    if (!reading) return
    const t = this.host.currentTime()
    const rad = Math.PI / 180
    const rounded = (value: number) => Number(value.toFixed(2))
    this.editView(raw => {
      const view = raw as unknown as BodyKeyframeView
      const groundM = view.onGround ? this.host.groundAlong(azimuthDeg, altitudeDeg, t) : undefined
      if (view.mode === "world") {
        // The eye, from the body and the line joining them.
        const cosAlt = Math.cos(reading.altitudeDeg * rad)
        const eyeEast = reading.eastM - Math.sin(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
        const eyeNorth = reading.northM - Math.cos(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
        const kept = Math.hypot(reading.eastM - eyeEast, reading.northM - eyeNorth)
        const level = groundM !== undefined ? groundM * Math.cos(altitudeDeg * rad) : kept
        view.eastM = rounded(eyeEast + Math.sin(azimuthDeg * rad) * level)
        view.northM = rounded(eyeNorth + Math.cos(azimuthDeg * rad) * level)
        if (!view.onGround) {
          const clamp = (deg: number) => Math.max(-89, Math.min(89, deg)) * rad
          view.aboveGroundM = rounded(Math.max(0, reading.aboveGroundM + level * (Math.tan(clamp(altitudeDeg)) - Math.tan(clamp(reading.altitudeDeg)))))
        }
      } else {
        view.azimuthDeg = rounded(((azimuthDeg % 360) + 360) % 360)
        view.elevationDeg = rounded(Math.max(-90, Math.min(90, altitudeDeg)))
        if (groundM !== undefined) view.distanceM = rounded(groundM)
      }
    })
  }

  /** Takes the body on show nearer or further along its line of sight, by `factor` — what the wheel
   * over it does. Its direction from the observer stays. */
  scaleDistance(factor: number): void {
    const reading = this.readingNow()
    if (!reading) return
    const rounded = (value: number) => Number(value.toFixed(2))
    this.editView(raw => {
      const view = raw as unknown as BodyKeyframeView
      if (view.mode === "world") {
        const rad = Math.PI / 180
        const cosAlt = Math.cos(reading.altitudeDeg * rad)
        const eyeEast = reading.eastM - Math.sin(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
        const eyeNorth = reading.northM - Math.cos(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
        view.eastM = rounded(eyeEast + (reading.eastM - eyeEast) * factor)
        view.northM = rounded(eyeNorth + (reading.northM - eyeNorth) * factor)
      } else {
        view.distanceM = rounded(Math.max(0.1, reading.distanceM * factor))
      }
    })
  }

  private deleteKeyframe(): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const track = body.track.filter(key => key.t !== t)
    if (track.length === body.track.length) return
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) }, true)
  }

  private static seconds(ms: number): string {
    return `${Math.round(ms / 100) / 10} s`
  }

  private deleteCurrent(): void {
    const body = this.current
    if (!body) return
    this.currentId = undefined
    this.write({ ...this.interpretation!, bodies: this.bodies.filter(other => other !== body) }, true)
  }

  /** What the model picker and the address block state — the address first, as DecorModelRef reads
   * it, with whatever credit has been typed beside it. Kept as typed when incomplete. */
  private statedModel(previous: DecorModelRef): DecorModelRef {
    const url = this.stringOrUndefined(this.input("body-model-url").value)
    // The block showing the catalogue's own entry, untouched, is still that entry.
    const entry = this.shownEntry
    const field = (id: string) => this.stringOrUndefined(this.input(id).value)
    if (entry && url === entry.url && field("body-model-title") === entry.credit.title && field("body-model-author") === entry.credit.author
      && field("body-model-license") === entry.credit.license && field("body-model-source") === entry.credit.sourceUrl) {
      return { id: entry.id }
    }
    if (url) {
      const title = this.stringOrUndefined(this.input("body-model-title").value)
      const license = this.stringOrUndefined(this.input("body-model-license").value)
      return {
        url,
        headingOffsetDeg: previous.url !== undefined ? previous.headingOffsetDeg : undefined,
        credit: title !== undefined && license !== undefined
          ? { title, license, author: this.stringOrUndefined(this.input("body-model-author").value), sourceUrl: this.stringOrUndefined(this.input("body-model-source").value) }
          : undefined
      }
    }
    const id = this.stringOrUndefined(this.select("body-model").value)
    return { id: id ?? previous.id ?? "ellipsoid" }
  }

  /** Writes an edit, then refreshes the list and the notices only: the fields are left as typed.
   * Filled back from the recording, a credit being typed field by field was erased at the first
   * one, since a credit without its name and licence is not stored (see statedModel). */
  private write(interpretation: InterpretationJson, refill = false): void {
    // An interpretation left with no body and no title says nothing, and is not kept as an empty
    // statement.
    const empty = interpretation.bodies.length === 0 && interpretation.title === undefined && interpretation.smoke === undefined
    this.host.sighting().interpretation = empty ? undefined : interpretation
    this.host.changed()
    if (refill) {
      this.sync()
      return
    }
    this.list?.setItems(this.bodies.map(body => ({ id: body.id, label: this.labelOf(body) })), this.currentId)
    const body = this.current
    if (!body) return
    this.element("body-model-incomplete").hidden = body.model.url === undefined || body.model.credit !== undefined
    void this.syncModelOptions(body)
  }

  private labelOf(body: BodyJson): string {
    const title = this.host.said().read(body.title)
    return title ? `${title} (${body.id})` : body.id
  }

  private get interpretation(): InterpretationJson | undefined {
    return this.host.sighting().interpretation
  }

  private get bodies(): BodyJson[] {
    return this.interpretation?.bodies ?? []
  }

  private get current(): BodyJson | undefined {
    return this.bodies.find(body => body.id === this.currentId)
  }

  private stringOrUndefined(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed === "" ? undefined : trimmed
  }

  /** The picker of the bodies, and what is done with them (see ElementList). */
  private list?: ElementList
  /** The keyframes of the body on show, and the one at the playhead (see ElementList). */
  private keyList?: ElementList

  private element(id: string): HTMLElement {
    return this.container.querySelector<HTMLElement>("#" + id)!
  }

  private input(id: string): HTMLInputElement {
    return this.element(id) as HTMLInputElement
  }

  private select(id: string): HTMLSelectElement {
    return this.element(id) as HTMLSelectElement
  }
}
