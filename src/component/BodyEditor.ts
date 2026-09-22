import type { BodyJson, BodyKeyframe, InterpretationJson } from "../engine/interpretation/Interpretation.js"
import { BODY_PRIMITIVES } from "../engine/interpretation/Interpretation.js"
import type { DecorModelRef } from "../engine/model/Decor.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { SaidTexts } from "../engine/model/SaidText.js"
import type { DecorModelEntry, DecorModelProvider } from "../render3d/decor/DecorModelProvider.js"
import type { BodyReading } from "./SceneElement.js"
import type { BodyEditorMessages } from "./messages/BodyEditorMessages.js"
import { BodyEditorTexts } from "./messages/BodyEditorMessages.js"

/** What the Bodies part needs of the editor it stands in, read at every use: the recording, its
 * texts reader and its model catalogue are all replaced over an editor's life. */
export interface BodyEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  modelProvider(): DecorModelProvider
  /** The shapes of the recording, as the Shape picker names them. */
  shapes(): { id: string, label: string }[]
  /** An edit was written onto the recording. */
  changed(): void
  /** Where a new body starts: the selected shape and the first keyframe that stands it where the
   * scene draws that shape at the playhead. Undefined when no shape is selected. */
  newBodyStart(): { sourceId?: string, label?: string, keyframe: BodyKeyframe } | undefined
  /** Turns the witness towards a body, as the decor's own "Look at it" does. */
  lookAt(body: BodyJson): void
  /** The playhead, ms. */
  currentTime(): number
  /** The body as it stands at `t` — see SceneElement.bodyReading. */
  readingOf(body: BodyJson, t: number): BodyReading | undefined
  /** How far along a line of sight from the eye at `t` the ground is — see SceneElement.groundAlong. */
  groundAlong(azimuthDeg: number, altitudeDeg: number, t: number): number | undefined
}

/**
 * The witness's own interpretation, edited: the bodies of `Sighting.interpretation`, each with the
 * shapes it stands for and the model it is drawn as — a built-in shape, a catalogue entry, or a
 * glTF file at an address (absolute, or relative to the recording's own file: see
 * SceneRenderer.documentUrl).
 *
 * A part of the Phenomenon group rather than a group of its own: a body is what a shape WAS, and
 * the two are edited side by side. What is typed is written as typed — an address whose credit is
 * incomplete is kept, and simply not drawn until it is complete (see SceneRenderer.loadBodyModel).
 * A body's movement (its track) is shown, not edited: it is stated in the file.
 */
export class BodyEditor {
  private messages: BodyEditorMessages
  private currentId?: string
  private catalogueToken = 0
  /** The catalogue model the address block is showing, if it is showing one — see showCatalogueModel. */
  private shownEntry?: DecorModelEntry
  /** The body the fields were last filled for. */
  private syncedId?: string
  /** What the appearance fields were last filled from, to tell an edit from what they could only
   * show (see syncKeyframe). */
  private shownAppearance?: { color: string, albedo: number, luminanceCdM2: number }

  /** A colour as a colour field can hold it: #rgb spelt out, anything else it cannot show left as
   * a mid grey, which only stands in the swatch until the author picks a colour of their own. */
  private static swatchOf(colour: string): string {
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour)
    if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
    return /^#[0-9a-f]{6}$/i.test(colour) ? colour.toLowerCase() : "#c8c8c8"
  }

  constructor(private readonly container: HTMLElement, private readonly host: BodyEditorHost, language: string) {
    this.messages = BodyEditorTexts.of(language)
    this.render()
  }

  /** Rebuilds the part in another language, keeping the body on show. */
  setLanguage(language: string): void {
    const messages = BodyEditorTexts.of(language)
    if (messages === this.messages) return
    this.messages = messages
    this.render()
  }

  /** Shows what the recording states now: after a recording is loaded, or a shape renamed. */
  sync(): void {
    const bodies = this.bodies
    if (!bodies.some(body => body.id === this.currentId)) this.currentId = bodies[0]?.id
    this.input("body-interpretation-title").value = this.host.said().read(this.interpretation?.title) ?? ""
    const select = this.select("body-select")
    select.replaceChildren(...bodies.map(body => new Option(this.labelOf(body), body.id)))
    if (this.currentId !== undefined) select.value = this.currentId
    const start = this.host.newBodyStart()
    const add = this.element("body-add") as HTMLButtonElement
    add.disabled = start === undefined
    add.title = !start ? this.messages.addBody
      : start.label !== undefined ? this.messages.addBodyHint.replace("{shape}", start.label) : this.messages.addBodyHintView
    // Nothing to title before there is an interpretation: adding its first body creates it.
    this.input("body-interpretation-title").closest("label")!.hidden = this.interpretation === undefined
    this.select("body-select").closest("label")!.hidden = bodies.length === 0
    const body = this.current
    this.element("body-none").hidden = bodies.length > 0
    this.element("body-fields").hidden = body === undefined
    if (!body) return
    this.input("body-id").value = body.id
    this.input("body-title").value = this.host.said().read(body.title) ?? ""
    this.syncExplains(body)
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
    this.input("body-outline-node").value = body.outlineNode ?? ""
    this.element("body-track").textContent = this.trackSummary(body)
    this.syncKeyframe()
  }

  /** The fields of the playhead's instant: what the body is there (interpolated between its
   * keyframes), in the form its own keyframes use. Called as the playhead moves; a field being
   * typed in is left alone. */
  syncKeyframe(): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const m = this.messages
    this.element("body-key-legend").textContent = m.atPlayhead.replace("{t}", BodyEditor.seconds(t))
    const reading = this.host.readingOf(body, t)
    const here = body.track.find(key => key.t === t)
    const base = BodyEditor.keyframeBefore(body, t)
    this.element("body-key-note").textContent = !reading ? m.notPlaced : here ? m.keyframeHere : m.keyframeAdded
    ;(this.element("body-key-delete") as HTMLButtonElement).disabled = here === undefined
    const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement
    const mode = base?.eastM !== undefined && base.northM !== undefined ? "world" : "witness"
    if (active !== this.select("body-key-mode")) this.select("body-key-mode").value = mode
    const shown = this.select("body-key-mode").value
    const onGround = base?.onGround === true
    this.input("body-key-ground").checked = onGround
    for (const id of ["body-key-azimuth", "body-key-elevation", "body-key-distance"]) this.input(id).closest("label")!.hidden = shown !== "witness"
    for (const id of ["body-key-east", "body-key-north"]) this.input(id).closest("label")!.hidden = shown !== "world"
    this.input("body-key-above").closest("label")!.hidden = shown !== "world" || onGround
    if (!reading) return
    const values: Record<string, number> = {
      "body-key-azimuth": reading.azimuthDeg, "body-key-elevation": reading.altitudeDeg, "body-key-distance": reading.distanceM,
      "body-key-east": reading.eastM, "body-key-north": reading.northM, "body-key-above": reading.aboveGroundM,
      "body-key-width": reading.sizeM.widthM, "body-key-length": reading.sizeM.lengthM, "body-key-height": reading.sizeM.heightM,
      "body-key-heading": reading.attitude.headingDeg, "body-key-pitch": reading.attitude.pitchDeg, "body-key-roll": reading.attitude.rollDeg,
      "body-key-albedo": reading.appearance.albedo, "body-key-luminance": reading.appearance.luminanceCdM2
    }
    // A colour field can only hold #rrggbb; what a recording states ("#fff", "silver") is kept as
    // it stands until the author picks another, and the swatch shows the nearest it can.
    this.shownAppearance = reading.appearance
    if (this.input("body-key-colour") !== active) this.input("body-key-colour").value = BodyEditor.swatchOf(reading.appearance.color)
    for (const [id, value] of Object.entries(values)) {
      if (this.input(id) !== active) this.input(id).value = String(Number(value.toFixed(2)))
    }
  }

  private render(): void {
    const m = this.messages
    const field = (id: string, label: string, type = "text", placeholder = "") =>
      `<label><span>${label}</span> <input id="${id}" type="${type}" placeholder="${placeholder}" autocomplete="off"/></label>`
    this.container.innerHTML = `<div class="body-editor">
      <p class="body-intro">${m.intro}</p>
      ${field("body-interpretation-title", m.interpretationTitle)}
      <p id="body-none" class="body-intro">${m.none}</p>
      <label><span>${m.body}</span> <select id="body-select"></select></label>
      <button id="body-add" type="button" class="icon-btn" title="${m.addBody}" aria-label="${m.addBody}">+</button>
      <div id="body-fields" class="body-fields">
        <button id="body-look" type="button" class="icon-btn" title="${m.lookAtBody}" aria-label="${m.lookAtBody}">🎯</button>
        <button id="body-delete" type="button" class="icon-btn" title="${m.deleteBody}" aria-label="${m.deleteBody}">🗑</button>
        ${field("body-id", m.id)}
        ${field("body-title", m.title)}
        <fieldset class="body-explains"><legend>${m.explains}</legend><div id="body-explains"></div></fieldset>
        <label><span>${m.model}</span> <select id="body-model"></select></label>
        <details id="body-model-advanced" class="decor-model-advanced">
          <summary>${m.modelAdvanced}</summary>
          ${field("body-model-url", m.modelUrl, "text", m.modelUrlHint)}
          ${field("body-model-title", m.modelTitle)}
          ${field("body-model-author", m.modelAuthor)}
          ${field("body-model-license", m.modelLicense, "text", "CC0 1.0")}
          ${field("body-model-source", m.modelSource, "url", "https://…")}
          <p id="body-model-incomplete" class="body-intro" hidden>${m.modelIncomplete}</p>
          <p id="body-model-catalogue" class="body-intro" hidden>${m.modelFromCatalogue}</p>
        </details>
        ${field("body-outline-node", m.outlineNode, "text", m.outlineNodeHint)}
        <p class="body-track"><span>${m.track}</span> <output id="body-track"></output></p>
        <fieldset class="body-key">
          <legend id="body-key-legend"></legend>
          <p id="body-key-note" class="body-intro"></p>
          <label><span>${m.placement}</span> <select id="body-key-mode"><option value="witness">${m.fromWitness}</option><option value="world">${m.inWorld}</option></select></label>
          ${field("body-key-azimuth", m.azimuth, "number")}
          ${field("body-key-elevation", m.elevation, "number")}
          ${field("body-key-distance", m.distance, "number")}
          ${field("body-key-east", m.east, "number")}
          ${field("body-key-north", m.north, "number")}
          <label><input id="body-key-ground" type="checkbox"/> <span>${m.onGround}</span></label>
          ${field("body-key-above", m.aboveGround, "number")}
          ${field("body-key-width", m.width, "number")}
          ${field("body-key-length", m.length, "number")}
          ${field("body-key-height", m.height, "number")}
          ${field("body-key-heading", m.heading, "number")}
          ${field("body-key-pitch", m.pitch, "number")}
          ${field("body-key-roll", m.roll, "number")}
          <label><span>${m.colour}</span> <input id="body-key-colour" type="color"/></label>
          ${field("body-key-albedo", m.albedo, "number")}
          ${field("body-key-luminance", m.luminance, "number")}
          <p class="body-intro">${m.appearanceNote}</p>
          <button id="body-key-delete" type="button">${m.deleteKeyframe}</button>
          <p class="body-intro">${m.pictureHint}</p>
        </fieldset>
      </div>
    </div>`
    this.select("body-select").addEventListener("change", () => {
      this.currentId = this.select("body-select").value
      this.sync()
    })
    this.input("body-interpretation-title").addEventListener("change", () => this.updateInterpretationTitle())
    this.element("body-delete").addEventListener("click", () => this.deleteCurrent())
    this.element("body-add").addEventListener("click", () => this.addBody())
    this.element("body-look").addEventListener("click", () => {
      const body = this.current
      if (body) this.host.lookAt(body)
    })
    for (const id of ["body-id", "body-title", "body-outline-node", "body-model-url", "body-model-title", "body-model-author", "body-model-license", "body-model-source"]) {
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
    this.element("body-explains").addEventListener("change", () => this.updateCurrent())
    // On every keystroke and every drag of the colour picker, not only when the field is left: a
    // setting is judged by what it does to the picture, and that has to happen as it is made.
    for (const id of BodyEditor.KEY_FIELDS) {
      this.input(id).addEventListener("input", () => this.updateKeyframe())
      this.input(id).addEventListener("change", () => this.updateKeyframe())
    }
    this.select("body-key-mode").addEventListener("change", () => this.updateKeyframe())
    this.element("body-key-delete").addEventListener("click", () => this.deleteKeyframe())
    this.sync()
  }

  private syncExplains(body: BodyJson): void {
    const shapes = this.host.shapes()
    const box = this.element("body-explains")
    // A shape the body names that the recording no longer holds is still listed: dropping it
    // silently would be an edit nobody made.
    const ids = [...new Set([...shapes.map(shape => shape.id), ...(body.explains ?? [])])]
    box.replaceChildren(...ids.map(id => {
      const label = document.createElement("label")
      const check = document.createElement("input")
      check.type = "checkbox"
      check.value = id
      check.checked = body.explains?.includes(id) ?? false
      label.append(check, " ", shapes.find(shape => shape.id === id)?.label ?? id)
      return label
    }))
    if (ids.length === 0) box.textContent = this.messages.explainsNothing
  }

  private async syncModelOptions(body: BodyJson): Promise<void> {
    const token = ++this.catalogueToken
    const entries = await this.host.modelProvider().entries().catch(() => [])
    if (token !== this.catalogueToken) return
    const m = this.messages
    const primitives = document.createElement("optgroup")
    primitives.label = m.primitives
    primitives.append(...BODY_PRIMITIVES.map(id => new Option(m.primitive[id], id)))
    const catalogue = document.createElement("optgroup")
    catalogue.label = m.catalogue
    catalogue.append(...entries.map(entry => new Option(entry.name, entry.id)))
    const select = this.select("body-model")
    select.replaceChildren(primitives, catalogue)
    // A model at an address is named below, in its own block: the picker says so rather than
    // showing a blank that reads as "no model".
    if (body.model.url !== undefined) select.prepend(new Option(m.modelAdvanced, ""))
    const id = body.model.url === undefined ? body.model.id : undefined
    // An id neither list knows is kept on show, as itself, rather than read as another choice.
    if (id !== undefined && ![...select.options].some(option => option.value === id)) select.append(new Option(id, id))
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

  private updateCurrent(): void {
    const body = this.current
    if (!body) return
    const typedId = this.input("body-id").value.trim()
    // An id is what the shapes' confrontation and a case's interpretations name the body by: an
    // empty one, or one another body already has, is refused and the field put back.
    const id = typedId !== "" && !this.bodies.some(other => other !== body && other.id === typedId) ? typedId : body.id
    const explains = [...this.element("body-explains").querySelectorAll<HTMLInputElement>("input:checked")].map(check => check.value)
    const edited: BodyJson = {
      ...body,
      id,
      title: this.host.said().write(body.title, this.input("body-title").value, this.host.writingLanguage()),
      explains: explains.length > 0 ? explains : undefined,
      model: this.statedModel(body.model),
      outlineNode: this.stringOrUndefined(this.input("body-outline-node").value)
    }
    this.currentId = id
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? edited : other) })
  }

  /**
   * A new body, standing for the selected shape where the scene draws it now (its direction, the
   * distance it is drawn at, and the real size its apparent width makes there), or, with no shape
   * to stand for, where the witness is looking. A starting point
   * for the interpretation, not a claim: an ellipsoid until a model is chosen, and a single
   * keyframe, so it stays where it was put. The witness's interpretation is created with it when
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
   * airliner is 36 m across whoever draws it, and what the witness saw was an angle, so a 36 m
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
    const set = (id: string, value: number) => { this.input(id).value = String(Number(Math.max(0.01, value).toFixed(2))) }
    set("body-key-width", sizeM.widthM)
    set("body-key-length", sizeM.lengthM)
    set("body-key-height", sizeM.heightM)
    this.updateKeyframe()
  }

  /** Turns the body on show to this attitude at the playhead — what its rotation handle does. The
   * heading wraps round; pitch and roll are kept within a half-turn either way. */
  turnTo(attitude: { headingDeg: number, pitchDeg: number, rollDeg: number }): void {
    const half = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180
    this.input("body-key-heading").value = String(Number((((attitude.headingDeg % 360) + 360) % 360).toFixed(1)))
    this.input("body-key-pitch").value = String(Number(Math.max(-90, Math.min(90, attitude.pitchDeg)).toFixed(1)))
    this.input("body-key-roll").value = String(Number(half(attitude.rollDeg).toFixed(1)))
    this.updateKeyframe()
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
   * Moves the body on show to a direction from the witness, at the playhead — what dragging it on
   * the picture does, written through the same fields as typing (see updateKeyframe), which then
   * show where it went. On the ground it slides over the relief: its distance becomes where the
   * line of sight meets the ground, when it does. In the air it keeps its distance, and in the
   * world's terms its level distance, the drag raising or lowering it over the ground.
   */
  dragTo(azimuthDeg: number, altitudeDeg: number): void {
    const reading = this.readingNow()
    if (!reading) return
    const t = this.host.currentTime()
    const onGround = this.input("body-key-ground").checked
    const groundM = onGround ? this.host.groundAlong(azimuthDeg, altitudeDeg, t) : undefined
    const rad = Math.PI / 180
    const set = (id: string, value: number) => { this.input(id).value = String(Number(value.toFixed(2))) }
    if (this.select("body-key-mode").value === "world") {
      // The eye, from the body and the line joining them.
      const cosAlt = Math.cos(reading.altitudeDeg * rad)
      const eyeEast = reading.eastM - Math.sin(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
      const eyeNorth = reading.northM - Math.cos(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
      const kept = Math.hypot(reading.eastM - eyeEast, reading.northM - eyeNorth)
      const level = groundM !== undefined ? groundM * Math.cos(altitudeDeg * rad) : kept
      set("body-key-east", eyeEast + Math.sin(azimuthDeg * rad) * level)
      set("body-key-north", eyeNorth + Math.cos(azimuthDeg * rad) * level)
      if (!onGround) {
        const clamp = (deg: number) => Math.max(-89, Math.min(89, deg)) * rad
        set("body-key-above", Math.max(0, reading.aboveGroundM + level * (Math.tan(clamp(altitudeDeg)) - Math.tan(clamp(reading.altitudeDeg)))))
      }
    } else {
      set("body-key-azimuth", ((azimuthDeg % 360) + 360) % 360)
      set("body-key-elevation", Math.max(-90, Math.min(90, altitudeDeg)))
      if (groundM !== undefined) set("body-key-distance", groundM)
    }
    this.updateKeyframe()
  }

  /** Takes the body on show nearer or further along its line of sight, by `factor` — what the wheel
   * over it does. Its direction from the witness stays. */
  scaleDistance(factor: number): void {
    const reading = this.readingNow()
    if (!reading) return
    const set = (id: string, value: number) => { this.input(id).value = String(Number(value.toFixed(2))) }
    if (this.select("body-key-mode").value === "world") {
      const rad = Math.PI / 180
      const cosAlt = Math.cos(reading.altitudeDeg * rad)
      const eyeEast = reading.eastM - Math.sin(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
      const eyeNorth = reading.northM - Math.cos(reading.azimuthDeg * rad) * cosAlt * reading.distanceM
      set("body-key-east", eyeEast + (reading.eastM - eyeEast) * factor)
      set("body-key-north", eyeNorth + (reading.northM - eyeNorth) * factor)
    } else {
      set("body-key-distance", Math.max(0.1, reading.distanceM * factor))
    }
    this.updateKeyframe()
  }

  /** The fields of an instant, written as a keyframe at the playhead: where it is, how big, how
   * turned, and what it looks like. Nothing else — its flame and its movements hold from the
   * keyframe before, and a movement is only read from keyframes that state it (see
   * BodyKeyframe.motions), so an added keyframe moves the body and leaves those alone. Its
   * appearance is written as it already was there, which changes nothing until a field is. One
   * already at this instant keeps the rest of what it states. */
  private updateKeyframe(): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const number = (id: string) => {
      const value = Number(this.input(id).value)
      return Number.isFinite(value) ? value : 0
    }
    const onGround = this.input("body-key-ground").checked
    const position: BodyKeyframe = this.select("body-key-mode").value === "world"
      ? { t, eastM: number("body-key-east"), northM: number("body-key-north"), ...(onGround ? { onGround: true } : { altitudeAboveGroundM: number("body-key-above") }) }
      : { t, azimuthDeg: number("body-key-azimuth"), altitudeDeg: number("body-key-elevation"), distanceM: Math.max(0.1, number("body-key-distance")), ...(onGround ? { onGround: true } : {}) }
    const size = (id: string) => Math.max(0.01, number(id))
    // Its look is written only when it is this instant's own: one the author has just changed, or
    // one this keyframe already stated. A move must not fix a colour the body was only holding.
    const stated = {
      color: this.input("body-key-colour").value,
      albedo: Math.max(0, Math.min(1, number("body-key-albedo"))),
      luminanceCdM2: Math.max(0, number("body-key-luminance"))
    }
    const shown = this.shownAppearance
    const changed = !shown || BodyEditor.swatchOf(shown.color) !== stated.color.toLowerCase()
      || Math.abs(shown.albedo - stated.albedo) > 1e-6 || Math.abs(shown.luminanceCdM2 - stated.luminanceCdM2) > 1e-6
    const here = body.track.find(key => key.t === t)?.appearance
    const appearance = changed ? stated : here ?? undefined
    const keyframe: BodyKeyframe = {
      ...BodyEditor.withoutPlacement(body.track.find(key => key.t === t)),
      ...position,
      sizeM: { widthM: size("body-key-width"), lengthM: size("body-key-length"), heightM: size("body-key-height") },
      attitude: { headingDeg: number("body-key-heading"), pitchDeg: number("body-key-pitch"), rollDeg: number("body-key-roll") },
      ...(appearance ? { appearance } : {})
    }
    const track = [...body.track.filter(key => key.t !== t), keyframe].sort((a, b) => a.t - b.t)
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) })
    this.element("body-track").textContent = this.trackSummary({ ...body, track })
    this.syncKeyframe()
  }

  private deleteKeyframe(): void {
    const body = this.current
    if (!body) return
    const t = this.host.currentTime()
    const track = body.track.filter(key => key.t !== t)
    if (track.length === body.track.length) return
    this.write({ ...this.interpretation!, bodies: this.bodies.map(other => other === body ? { ...body, track } : other) }, true)
  }

  private static readonly KEY_FIELDS = ["body-key-azimuth", "body-key-elevation", "body-key-distance", "body-key-east", "body-key-north",
    "body-key-ground", "body-key-above", "body-key-width", "body-key-length", "body-key-height", "body-key-heading", "body-key-pitch", "body-key-roll",
    "body-key-colour", "body-key-albedo", "body-key-luminance"]

  /** A keyframe's statements other than where it is, how big and how turned. */
  private static withoutPlacement(key: BodyKeyframe | undefined): Partial<BodyKeyframe> {
    if (!key) return {}
    const { eastM, northM, azimuthDeg, altitudeDeg, distanceM, onGround, altitudeAboveGroundM, sizeM, attitude, appearance, ...rest } = key
    return rest
  }

  /** The keyframe in force at `t` — the last at or before it, else the first. */
  private static keyframeBefore(body: BodyJson, t: number): BodyKeyframe | undefined {
    const sorted = [...body.track].sort((a, b) => a.t - b.t)
    return [...sorted].reverse().find(key => key.t <= t) ?? sorted[0]
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
    const select = this.select("body-select")
    select.replaceChildren(...this.bodies.map(body => new Option(this.labelOf(body), body.id)))
    if (this.currentId !== undefined) select.value = this.currentId
    const body = this.current
    if (!body) return
    this.input("body-id").value = body.id
    this.element("body-model-incomplete").hidden = body.model.url === undefined || body.model.credit !== undefined
    void this.syncModelOptions(body)
  }

  private trackSummary(body: BodyJson): string {
    const times = body.track.map(key => key.t)
    if (times.length === 0) return this.messages.trackEmpty
    const seconds = (ms: number) => `${Math.round(ms / 100) / 10} s`
    if (times.length === 1) return this.messages.trackSingle.replace("{at}", seconds(times[0]))
    return this.messages.trackSpan.replace("{n}", String(times.length))
      .replace("{from}", seconds(Math.min(...times))).replace("{to}", seconds(Math.max(...times)))
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
