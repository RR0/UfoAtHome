import type { Basis } from "../engine/persistence/Provenance.js"
import type { GeoPoint, LocalPoint, PositionFrame, PositionReference, SaidPosition } from "../engine/model/SaidPosition.js"
import { SaidPositions } from "../engine/model/SaidPosition.js"

export const POSITION_INPUT_ELEMENT_NAME = "rr0-input-position"

/** What the element says: how a position is said, from what, and on what basis. */
export interface PositionInputMessages {
  /** The way of a position said from something else ("relative"). */
  positionRelative: string
  /** The way of a position said as a latitude and a longitude ("absolute"). */
  positionAbsolute: string
  /** The tooltip of the switch: that it switches. */
  positionModeHint: string
  /** Why the switch does not switch: there is no place on the Earth to turn metres into degrees from. */
  positionNoPlace: string
  /** Before the reference ("from"). */
  positionFrom: string
  /** The observer, as a reference: the default one. */
  positionObserver: string
  positionEast: string
  positionNorth: string
  positionLatitude: string
  positionLongitude: string
  /** What a position is called where it stands alone ("Position"). */
  positionLabel: string
  /** The tooltip of the basis: what it says. */
  positionBasisHint: string
  positionBasisStated: string
  positionBasisMeasured: string
  positionBasisDerived: string
  positionBasisAssumed: string
}

export const positionInputMessages_en: PositionInputMessages = {
  positionRelative: "relative",
  positionAbsolute: "absolute",
  positionModeHint: "Click to say it the other way: from something else, or as a latitude and a longitude",
  positionNoPlace: "The recording has no place yet: give the observer a latitude and a longitude first",
  positionFrom: "from",
  positionObserver: "the observer",
  positionEast: "East",
  positionNorth: "North",
  positionLatitude: "Latitude",
  positionLongitude: "Longitude",
  positionLabel: "Position",
  positionBasisHint: "Where this position comes from",
  positionBasisStated: "stated",
  positionBasisMeasured: "measured",
  positionBasisDerived: "derived",
  positionBasisAssumed: "assumed"
}

/**
 * What a position becomes as it is typed: the position the recording keeps (see `native`) and how it was said, which is undefined when
 * it was said the way the recording keeps it (metres from the observer, or degrees for a `native="geo"` one): that says nothing more.
 */
export interface PositionChange {
  value: LocalPoint | GeoPoint
  said?: SaidPosition
}

const STYLE = `
rr0-input-position { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .3em .5em; }
/* As the date's own switch (see DateInputElement): it reads as part of the label, before the fields. */
rr0-input-position .position-mode { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; text-decoration: underline; text-underline-offset: .15em; }
rr0-input-position .position-mode:hover:not(:disabled) { text-decoration-thickness: 2px; }
rr0-input-position .position-mode:disabled { cursor: default; text-decoration: none; opacity: .75; }
rr0-input-position .position-mode:focus-visible { outline: 2px solid #4af; outline-offset: 2px; border-radius: 2px; }
rr0-input-position .position-axis { display: inline-flex; align-items: center; gap: .3em; white-space: nowrap; }
/* East and North are two fields, each with its unit: room between the unit of one and the name of the next. */
rr0-input-position :is(.position-local, .position-geo) { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .3em 1em; }
rr0-input-position .position-from { display: inline-flex; align-items: center; gap: .3em; white-space: nowrap; }
rr0-input-position .position-from select { width: auto; max-width: 14em; }
rr0-input-position input[type="number"] { width: 7em; }
rr0-input-position .position-geo input[type="number"] { width: 9.5em; }
/* What it stands on looks as a date's does (see WitnessErrorView's basis mark): a pill after the name, shown on hover or while
   edited, and always when it is not "stated". A list, for the keyboard, drawn as the pill. */
rr0-input-position select.position-basis.position-basis {
  order: -2; appearance: none; -webkit-appearance: none; width: auto; height: auto !important; min-height: 0; margin: 0;
  padding: 0 8px !important; border: 1px solid var(--glow-dim, #b08a3e) !important; border-radius: 999px !important; background: none !important;
  font: 600 11px/1.6 var(--sans, sans-serif) !important; color: var(--glow, #8a6a2a) !important; cursor: pointer; visibility: hidden;
}
:is(label, .parameter-row, .observer-position):is(:hover, :focus-within) rr0-input-position select.position-basis,
rr0-input-position:is(:hover, :focus-within) select.position-basis,
rr0-input-position select.position-basis:is(.measured, .derived, .assumed) { visibility: visible; }
rr0-input-position select.position-basis:is(.assumed, .derived) { font-style: italic; }
rr0-input-position .position-mode { order: -1; }
rr0-input-position [hidden] { display: none !important; }
`

/**
 * A position, said either way it can be: from something else in the scene (metres east and north of it, the observer by default),
 * or as a latitude and a longitude; with a switch between the two that reads as part of the label, as a date says whether it is
 * precise (see DateInputElement), and what the position stands on (stated, measured, derived, assumed: see Basis).
 *
 * What the recording keeps does not change with the way it is said: `native="local"` (the default) is metres east and north of the
 * observer where the recording sets off, which is how decor, clouds and bodies are kept; `native="geo"` is a latitude and a longitude,
 * which is how the observer, a launch or a beam is. Switching says the same place the other way (a conversion, through the frame's
 * `origin`); it writes nothing. How it is said is the `said` it reports (see SaidPosition), for the host to keep beside the value.
 *
 * `<rr0-input-position name="decor">` makes, in its own light DOM so that the page's styles reach them, the switch, the reference picked
 * (`decor-from`), the east and north fields (`decor-east`, `decor-north`), the latitude and longitude fields (`decor-lat`, `decor-lng`) and the
 * basis (`decor-basis`); an `east-id`, `north-id`, `lat-id` or `lng-id` attribute names that field instead, for a host whose other code
 * reaches it by an id it already had. `step` is the step of the metres (0.1 by default).
 *
 * It tells by a `positionchange` event, whose `detail` is a PositionChange, once what is typed reads as a number — never for "-" or "1." on
 * their way to one — and by a `basischange` event whose `detail.basis` is the basis picked (undefined for stated, the default). `frame`
 * says what it can be said from and where the recording is (see PositionFrame), `value` what it shows, `said` how, `basis` on what: setting
 * them tells nobody. A field being typed in is not written over.
 */
export class PositionInputElement extends HTMLElement {
  private modeButton?: HTMLButtonElement
  private fromRow?: HTMLElement
  private fromSelect?: HTMLSelectElement
  private localRow?: HTMLElement
  private geoRow?: HTMLElement
  private eastField?: HTMLInputElement
  private northField?: HTMLInputElement
  private latField?: HTMLInputElement
  private lngField?: HTMLInputElement
  private basisSelect?: HTMLSelectElement
  private eastLabel?: HTMLElement
  private northLabel?: HTMLElement
  private latLabel?: HTMLElement
  private lngLabel?: HTMLElement
  private wording: PositionInputMessages = positionInputMessages_en
  private shownFrame: PositionFrame = { references: [] }
  private shownValue?: LocalPoint | GeoPoint
  private shownBasis?: Basis
  private relativeShown = true
  /** The reference picked, by id; undefined is the observer. */
  private referenceId?: string

  /** Makes the controls, once: an element in a template is not upgraded until it is in a page, and its host has to reach them before that. */
  build(): void {
    if (this.modeButton) return
    const name = this.getAttribute("name") ?? "position"
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const mode = doc.createElement("button")
    mode.type = "button"
    mode.className = "position-mode"
    mode.addEventListener("click", () => this.setRelative(!this.relativeShown))
    const fromRow = doc.createElement("span")
    fromRow.className = "position-from"
    const fromText = doc.createElement("span")
    fromText.className = "position-from-text"
    const from = doc.createElement("select")
    from.id = `${name}-from`
    from.addEventListener("input", () => this.pickReference(from.value))
    fromRow.append(fromText, from)
    const step = this.getAttribute("step") ?? "0.1"
    const number = (id: string, min: number, max: number, numberStep: string) => {
      const input = doc.createElement("input")
      input.type = "number"
      input.id = id
      input.min = String(min)
      input.max = String(max)
      input.step = numberStep
      input.autocomplete = "off"
      return input
    }
    const axis = (field: HTMLInputElement, unit: string): { row: HTMLElement, label: HTMLElement } => {
      const row = doc.createElement("label")
      row.className = "position-axis"
      const label = doc.createElement("span")
      row.append(label, field, unit)
      return { row, label }
    }
    const range = Number(this.getAttribute("range") ?? 30000)
    const east = number(this.getAttribute("east-id") ?? `${name}-east`, -range, range, step)
    const north = number(this.getAttribute("north-id") ?? `${name}-north`, -range, range, step)
    const lat = number(this.getAttribute("lat-id") ?? `${name}-lat`, -90, 90, "0.000001")
    const lng = number(this.getAttribute("lng-id") ?? `${name}-lng`, -180, 180, "0.000001")
    const localRow = doc.createElement("span")
    localRow.className = "position-local"
    const eastAxis = axis(east, "m")
    const northAxis = axis(north, "m")
    localRow.append(eastAxis.row, northAxis.row)
    const geoRow = doc.createElement("span")
    geoRow.className = "position-geo"
    const latAxis = axis(lat, "°")
    const lngAxis = axis(lng, "°")
    geoRow.append(latAxis.row, lngAxis.row)
    for (const field of [east, north]) field.addEventListener("input", () => this.typedLocal())
    for (const field of [lat, lng]) field.addEventListener("input", () => this.typedGeo())
    const basis = doc.createElement("select")
    basis.id = `${name}-basis`
    basis.className = "position-basis"
    basis.addEventListener("input", () => {
      this.shownBasis = basis.value === "" ? undefined : basis.value as Basis
      this.markBasis()
      this.dispatchEvent(new CustomEvent("basischange", { detail: { basis: this.shownBasis }, bubbles: true, composed: true }))
    })
    this.append(style, mode, fromRow, localRow, geoRow, basis)
    this.modeButton = mode
    this.fromRow = fromRow
    this.fromSelect = from
    this.localRow = localRow
    this.geoRow = geoRow
    this.eastField = east
    this.northField = north
    this.latField = lat
    this.lngField = lng
    this.basisSelect = basis
    this.eastLabel = eastAxis.label
    this.northLabel = northAxis.label
    this.latLabel = latAxis.label
    this.lngLabel = lngAxis.label
    this.relativeShown = !this.isGeo
    this.word()
    this.show()
  }

  connectedCallback(): void {
    this.build()
  }

  /** Whether what the recording keeps is a latitude and a longitude rather than metres. */
  private get isGeo(): boolean {
    return this.getAttribute("native") === "geo"
  }

  /** The fields, for a host that reaches them as it did before it had this element. */
  get eastInput(): HTMLInputElement {
    this.build()
    return this.eastField!
  }

  get northInput(): HTMLInputElement {
    this.build()
    return this.northField!
  }

  get latInput(): HTMLInputElement {
    this.build()
    return this.latField!
  }

  get lngInput(): HTMLInputElement {
    this.build()
    return this.lngField!
  }

  /** What it can be said from, and where the recording is. The observer comes first; an element the position is of is not among them. */
  get frame(): PositionFrame {
    return this.shownFrame
  }

  set frame(frame: PositionFrame) {
    this.shownFrame = frame
    this.build()
    this.pullDegrees()
    this.show()
  }

  /** The position shown, as the recording keeps it (see `native`). */
  get value(): LocalPoint | GeoPoint | undefined {
    return this.shownValue
  }

  set value(value: LocalPoint | GeoPoint | undefined) {
    this.shownValue = value
    this.build()
    if (this.isGeo) {
      // Degrees set are what the fields of degrees say, which is where they are read from (see pullDegrees).
      const geo = value as GeoPoint | undefined
      this.latField!.value = geo ? String(SaidPositions.degrees(geo.lat)) : ""
      this.lngField!.value = geo ? String(SaidPositions.degrees(geo.lng)) : ""
    }
    this.show()
  }

  /** How it is said: the way and the reference shown. Absent, it is shown the way the recording keeps it, from the observer. */
  set said(said: SaidPosition | undefined) {
    this.build()
    this.pullDegrees()
    if (SaidPositions.isRelative(said)) {
      this.relativeShown = true
      this.referenceId = said.relativeTo
    } else if (SaidPositions.isAbsolute(said)) {
      this.relativeShown = false
    } else {
      this.relativeShown = !this.isGeo
      this.referenceId = undefined
    }
    this.show()
  }

  /** How it is said now, from what is shown; undefined while nothing is. */
  get said(): SaidPosition | undefined {
    const local = this.localValue()
    if (!local) return undefined
    return SaidPositions.restated(this.relativeShown ? SaidPositions.relative(0, 0, this.referenceId) : { lat: 0, lng: 0 }, local, this.shownFrame)
  }

  /** Whether it is said from something else rather than as a latitude and a longitude. */
  get relative(): boolean {
    return this.relativeShown
  }

  /** What the position stands on (see Basis); undefined is stated, the default. */
  get basis(): Basis | undefined {
    return this.shownBasis
  }

  set basis(basis: Basis | undefined) {
    this.shownBasis = basis === "stated" ? undefined : basis
    this.build()
    if (this.basisSelect) this.basisSelect.value = this.shownBasis ?? ""
    this.markBasis()
  }

  /** Whether what the position stands on is shown, and can be picked: only where the host keeps it. */
  set basisShown(shown: boolean) {
    this.build()
    this.basisSelect!.hidden = !shown
  }

  /** Words it again. */
  set messages(messages: PositionInputMessages) {
    this.wording = messages
    if (this.modeButton) {
      this.word()
      this.show()
    }
  }

  /**
   * Says it the other way: from something else, or as a latitude and a longitude. A way of saying a position, not a statement of it:
   * nothing is written. Refused for a latitude when the recording has no place to turn metres into one.
   */
  setRelative(relative: boolean): void {
    if (!this.shownFrame.origin || this.references().length === 0) return
    this.pullDegrees()
    this.relativeShown = relative
    this.show()
  }

  /**
   * A host that keeps degrees may write its fields itself, as it did before this element (a walk, a place found): what they say is then
   * the position, read before it is said another way. Not at every draw, which follows what is typed in the other way.
   */
  private pullDegrees(): void {
    if (!this.isGeo || !this.latField) return
    const lat = PositionInputElement.typed(this.latField)
    const lng = PositionInputElement.typed(this.lngField!)
    this.shownValue = lat !== undefined && lng !== undefined ? { lat, lng } : (this.latField.value === "" && this.lngField!.value === "" ? undefined : this.shownValue)
  }

  private word(): void {
    const wording = this.wording
    this.eastLabel!.textContent = wording.positionEast
    this.northLabel!.textContent = wording.positionNorth
    this.latLabel!.textContent = wording.positionLatitude
    this.lngLabel!.textContent = wording.positionLongitude
    this.fromRow!.querySelector(".position-from-text")!.textContent = wording.positionFrom
    const basis = this.basisSelect!
    basis.title = wording.positionBasisHint
    basis.replaceChildren(
      new Option(wording.positionBasisStated, ""), new Option(wording.positionBasisMeasured, "measured"),
      new Option(wording.positionBasisDerived, "derived"), new Option(wording.positionBasisAssumed, "assumed"))
    basis.value = this.shownBasis ?? ""
    this.markBasis()
  }

  private markBasis(): void {
    const basis = this.basisSelect
    if (!basis) return
    for (const name of ["measured", "derived", "assumed"]) basis.classList.toggle(name, this.shownBasis === name)
  }

  /** The references, the observer first, and the one picked if it is still there. */
  private references(): ReadonlyArray<PositionReference> {
    // Metres are from the observer when nothing else is said; degrees are said from something only if there is something.
    const references = this.shownFrame.references
    return references.length > 0 || this.isGeo ? references : [{ label: this.wording.positionObserver, eastM: 0, northM: 0 }]
  }

  private reference(): PositionReference {
    const references = this.references()
    return references.find(reference => reference.id === this.referenceId) ?? references[0] ?? { label: "", eastM: 0, northM: 0 }
  }

  /** The position shown, in the recording's frame; undefined while there is none, or no place to turn degrees into metres. */
  private localValue(): LocalPoint | undefined {
    const value = this.shownValue
    if (!value) return undefined
    if (!this.isGeo) return value as LocalPoint
    const origin = this.shownFrame.origin
    return origin ? SaidPositions.toLocal(value as GeoPoint, origin) : undefined
  }

  private geoValue(): GeoPoint | undefined {
    const value = this.shownValue
    if (!value) return undefined
    if (this.isGeo) return value as GeoPoint
    const origin = this.shownFrame.origin
    return origin ? SaidPositions.toGeo(value as LocalPoint, origin) : undefined
  }

  /** Draws the way it is said and the numbers it is said with, leaving alone a field being typed in. */
  private show(): void {
    if (!this.modeButton) return
    const wording = this.wording
    const canSwitch = this.shownFrame.origin !== undefined && this.references().length > 0
    if (!canSwitch) this.relativeShown = !this.isGeo
    const mode = this.modeButton
    mode.textContent = this.relativeShown ? wording.positionRelative : wording.positionAbsolute
    mode.disabled = !canSwitch
    mode.title = canSwitch ? wording.positionModeHint : wording.positionNoPlace
    const references = this.references()
    const from = this.fromSelect!
    const ids = references.map(reference => reference.id ?? "")
    if ([...from.options].map(option => option.value).join("\n") !== ids.join("\n") || [...from.options].map(option => option.text).join("\n") !== references.map(reference => reference.label).join("\n")) {
      from.replaceChildren(...references.map(reference => new Option(reference.label, reference.id ?? "")))
    }
    if (this.referenceId !== undefined && !references.some(reference => reference.id === this.referenceId)) this.referenceId = undefined
    from.value = this.referenceId ?? ids[0] ?? ""
    this.fromRow!.hidden = !this.relativeShown
    this.localRow!.hidden = !this.relativeShown
    this.geoRow!.hidden = this.relativeShown
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement
    const write = (field: HTMLInputElement, value: number | undefined) => {
      if (field !== active) field.value = value === undefined ? "" : String(value)
    }
    const local = this.localValue()
    const reference = this.reference()
    write(this.eastField!, local ? SaidPositions.metres(local.eastM - reference.eastM) : undefined)
    write(this.northField!, local ? SaidPositions.metres(local.northM - reference.northM) : undefined)
    // Degrees kept as degrees are the host's fields, half typed as they may be: written here only when they follow from metres.
    if (this.isGeo && !this.relativeShown) return
    const geo = this.geoValue()
    write(this.latField!, geo ? SaidPositions.degrees(geo.lat) : undefined)
    write(this.lngField!, geo ? SaidPositions.degrees(geo.lng) : undefined)
  }

  private pickReference(id: string): void {
    this.pullDegrees()
    this.referenceId = id === "" ? undefined : id
    this.show()
    // The same place said from another reference is said otherwise: the host keeps how.
    const said = this.said
    if (said && this.shownValue) this.tell(this.shownValue, said)
  }

  private static typed(field: HTMLInputElement): number | undefined {
    const typed = field.value.trim()
    const value = typed === "" ? NaN : Number(typed)
    return Number.isFinite(value) ? value : undefined
  }

  private typedLocal(): void {
    const east = PositionInputElement.typed(this.eastField!)
    const north = PositionInputElement.typed(this.northField!)
    if (east === undefined || north === undefined) return
    const reference = this.reference()
    const local = { eastM: reference.eastM + east, northM: reference.northM + north }
    let value: LocalPoint | GeoPoint = local
    if (this.isGeo) {
      const origin = this.shownFrame.origin
      if (!origin) return
      value = SaidPositions.toGeo(local, origin)
    }
    this.shownValue = value
    this.tell(value, SaidPositions.relative(east, north, this.referenceId))
  }

  private typedGeo(): void {
    const lat = PositionInputElement.typed(this.latField!)
    const lng = PositionInputElement.typed(this.lngField!)
    if (lat === undefined || lng === undefined) return
    let value: LocalPoint | GeoPoint = { lat, lng }
    if (!this.isGeo) {
      const origin = this.shownFrame.origin
      if (!origin) return
      value = SaidPositions.toLocal({ lat, lng }, origin)
    }
    this.shownValue = value
    this.tell(value, { lat, lng })
  }

  private tell(value: LocalPoint | GeoPoint, said: SaidPosition): void {
    // The fields of the other way follow, for whoever reads them.
    this.show()
    const native = this.isGeo ? SaidPositions.isAbsolute(said) : SaidPositions.isRelative(said) && said.relativeTo === undefined
    this.dispatchEvent(new CustomEvent<PositionChange>("positionchange", { detail: { value, said: native ? undefined : said }, bubbles: true, composed: true }))
  }
}

export function register(): void {
  if (!customElements.get(POSITION_INPUT_ELEMENT_NAME)) customElements.define(POSITION_INPUT_ELEMENT_NAME, PositionInputElement)
}
