import type { Sighting } from "../engine/model/Sighting.js"
import type { RecordingEventJson } from "../engine/events/RecordingEvent.js"
import { RecordingEvents } from "../engine/events/RecordingEvents.js"
import type { EventsMessages } from "./messages/EventsMessages.js"
import { ElementList } from "./ElementList.js"
import type { ProvenanceEntry } from "../engine/persistence/Provenance.js"
import type { GeoPoint, PositionFrame, SaidPosition } from "../engine/model/SaidPosition.js"
import { register as registerPositionInput } from "./PositionInputElement.js"
import type { PositionChange, PositionInputElement, PositionInputMessages } from "./PositionInputElement.js"

/** What the panel needs of the editor that holds it. */
export interface EventsPanelHost {
  sighting(): Sighting
  /** An event is about to be edited: the recording as it stands is what an undo goes back to. */
  editing(): void
  /** An event was edited, added, removed, or the events given back: an edit of the recording, whose values have been worked out again. */
  changed(): void
  /** Moves the playhead to `t`, ms. */
  seek(t: number): void
  /** The playhead, ms: where an event added starts. */
  now(): number
  /** The body whose events a panel of the bodies shows: the one picked in the list of bodies. */
  currentBody?(): string | undefined
  /** What a body is called, as the list of bodies names it. */
  bodyLabel?(id: string): string
  /** Another event was picked: the tracks show it picked too. */
  picked?(): void
  /** What a place can be said from (see PositionFrame): with it, a place is said as every position of the editor is, relative or absolute. */
  positionFrame?(): PositionFrame
  positionMessages?(): PositionInputMessages
}

/** Whose events a panel shows: the observer's (their poses, the tracks of what carries them), the phenomenon's (the account's shapes), a body's. */
export type EventsActor = "observer" | "phenomenon" | "bodies"

/**
 * An actor's events in the editor (see RecordingEvents), laid out as every list of the editor is (see ElementList): one picked from the list,
 * its own fields under it (when it starts and ends, and its parameters, with what each says of where it came from), "+" to add one of the
 * kinds an author can state by hand, 🗑 to remove the picked one. A number, a list of speeds, a name, a place is edited where it stands, and the
 * values are worked out again at once; a value typed is the author's, and forgets the basis it had. While the author's own values win over the
 * events (they moved the observer by hand), it says so, and offers the events back.
 */
export class EventsPanel {
  static readonly CSS = `
.events-section[hidden] { display: none; }
.events-note { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--ink-dim); }
.events-row, .events-fields { grid-column: 1 / -1; min-width: 0; }
.events-fields { display: grid; gap: 6px; }
.event-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.event-params { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; align-items: baseline; font-size: 14px; }
.event-params input[type="number"] { width: 6em; }
.event-params input[type="text"] { width: 10em; }
.event-rows { display: grid; grid-template-columns: repeat(var(--columns, 2), max-content); gap: 2px 8px; }
.event-basis { margin-left: 6px; font-size: 12px; font-style: italic; color: var(--ink-dim); }
`

  /** What an author can add by hand, by actor: the kinds whose parameters this panel edits (a drive's route comes from a survey). */
  private static readonly ADDABLE: Record<EventsActor, string[]> = {
    observer: ["look", "walk", "follow"],
    phenomenon: ["stand", "blink", "vanish"],
    bodies: ["motion", "spin", "rise", "turn", "ride", "vanish"]
  }

  private messages: EventsMessages
  private readonly note: HTMLElement
  private readonly reset: HTMLButtonElement
  private readonly fields: HTMLElement
  private readonly list: ElementList
  /** The picked event, by its place among the recording's events. */
  private picked?: number

  constructor(private readonly root: HTMLElement, private readonly host: EventsPanelHost, messages: EventsMessages, private readonly actor: EventsActor = "observer") {
    this.messages = messages
    const body = root.querySelector<HTMLElement>(".events-body")!
    this.note = document.createElement("p")
    this.note.className = "events-note"
    this.reset = document.createElement("button")
    this.reset.type = "button"
    this.reset.className = "events-reset"
    this.reset.addEventListener("click", () => {
      this.host.editing()
      RecordingEvents.reset(this.host.sighting())
      this.host.changed()
    })
    const row = document.createElement("div")
    row.className = "events-row"
    this.fields = document.createElement("div")
    this.fields.className = "events-fields"
    body.replaceChildren(this.note, this.reset, row, this.fields)
    this.list = new ElementList({
      header: row, body: this.fields,
      ids: { list: `${actor}-event`, remove: `${actor}-event-delete`, add: `${actor}-event-add`, kinds: `${actor}-event-kinds`, kind: kind => `${actor}-event-kind-${kind}` },
      onSelect: id => {
        this.picked = Number(id)
        const event = this.host.sighting().events?.[this.picked]
        if (event) this.host.seek(event.t)
        this.render()
        this.host.picked?.()
      },
      onAdd: kind => { if (kind) this.add(kind) },
      onRemove: () => this.remove()
    })
    this.localizeList()
  }

  localize(messages: EventsMessages): void {
    this.messages = messages
    this.localizeList()
    this.render()
  }

  private localizeList(): void {
    const m = this.messages
    this.list.setLabels({ list: m.title, remove: m.remove, add: m.add, empty: m.none })
    this.list.setKinds(EventsPanel.ADDABLE[this.actor].map(kind => ({ value: kind, label: m.kinds[kind] ?? kind })))
  }

  /** Whether what it says was said of values that were the events' (see sync). */
  private shownTheirs?: boolean

  /** Shows the events again if whose values they are changed since it last did. */
  sync(): void {
    if (this.theirs() !== this.shownTheirs) this.render()
  }

  /** Whether what the actor's events give is still theirs: no pose, no shape, no keyframe written by hand since. */
  private theirs(): boolean {
    const sighting = this.host.sighting()
    return this.actor === "observer" ? RecordingEvents.observerTrackIsExpanded(sighting)
      : this.actor === "phenomenon" ? RecordingEvents.timelineIsExpanded(sighting)
      : RecordingEvents.bodiesAreExpanded(sighting)
  }

  /** Whose events these are: the observer, the phenomenon, or the body picked in the list of bodies. */
  private who(): string | undefined {
    return this.actor === "bodies" ? this.host.currentBody?.() : this.actor
  }

  /** The actor's events, each with its place among the recording's events, which is where what it says of its parameters is kept. */
  private events(): { event: RecordingEventJson, index: number }[] {
    const who = this.who()
    return (this.host.sighting().events ?? []).map((event, index) => ({ event, index })).filter(({ event }) => who !== undefined && (event.who ?? "observer") === who)
  }

  /** The picked event, by its place among the recording's events: the one whose fields are shown. */
  get pickedIndex(): number | undefined {
    return this.picked
  }

  /** Picks the event at `index` among the recording's events (one of this panel's), as a press on its bar in the tracks does, and shows its fields. */
  pick(index: number): void {
    this.picked = index
    this.render()
    // Its title at the top of the part that scrolls: whose events these are is read first.
    this.root.scrollIntoView?.({ block: "start" })
  }

  /** Shows the actor's events as they now stand, and the picked one's fields. */
  render(): void {
    this.shownTheirs = this.theirs()
    // Whose events these are, said in the title: the list under it is theirs, not that of the shapes or the bodies above.
    this.root.querySelector<HTMLElement>(".events-title")!.textContent = this.actor === "observer" ? this.messages.title
      : this.actor === "phenomenon" ? this.messages.phenomenonTitle
      : this.messages.bodyTitle.replace("{body}", this.host.bodyLabel?.(this.who() ?? "") ?? this.who() ?? "")
    // A panel of the bodies needs a body to say whose events it would add.
    this.root.hidden = this.who() === undefined
    const events = this.events()
    if (!events.some(({ index }) => index === this.picked)) this.picked = events[0]?.index
    const theirs = this.shownTheirs
    this.note.hidden = events.length === 0
    this.note.textContent = this.actor === "observer"
      ? theirs ? this.messages.derivedNote : this.messages.overriddenNote
      : this.actor === "phenomenon"
        ? theirs ? this.messages.derivedShapesNote : this.messages.overriddenShapesNote
        : theirs ? this.messages.derivedBodiesNote : this.messages.overriddenBodiesNote
    this.reset.hidden = events.length === 0 || theirs
    this.reset.textContent = this.messages.resetToEvents
    this.list.setItems(events.map(({ event, index }) => ({ id: String(index), label: `${EventsPanel.clock(event.t)} · ${this.messages.kinds[event.eventType] ?? event.eventType}` })),
      this.picked === undefined ? undefined : String(this.picked))
    const picked = this.picked === undefined ? undefined : this.host.sighting().events?.[this.picked]
    this.fields.replaceChildren(...(picked ? this.details(picked, this.picked!) : []))
  }

  /** "1:02.5": an instant of the recording, as the list names an event by it. */
  private static clock(ms: number): string {
    const seconds = ms / 1000
    const minutes = Math.floor(seconds / 60)
    const rest = Math.round((seconds - minutes * 60) * 10) / 10
    return `${minutes}:${rest < 10 ? "0" : ""}${rest}`
  }

  /** Adds an event of `kind` at the playhead, with what a first draft of it says, and picks it. */
  private add(kind: string): void {
    const sighting = this.host.sighting()
    const who = this.who()
    if (who === undefined) return
    const t = Math.round(this.host.now())
    const pose = sighting.observerTrack.getInterpolatedPoseAt(t) ?? sighting.observerTrack.getLatestPoseAt(t)
    const here = pose?.lat !== undefined && pose.lng !== undefined ? { lat: pose.lat, lng: pose.lng } : sighting.event.place?.[0] && { lat: sighting.event.place[0].lat, lng: sighting.event.place[0].lng }
    const firstBody = sighting.interpretation?.bodies.find(body => body.id !== who)?.id ?? ""
    const drafts: Record<string, { until?: number, params?: Record<string, unknown> }> = {
      look: { params: { headingDeg: Math.round(pose?.headingDeg ?? 0), pitchDeg: Math.round(pose?.pitchDeg ?? 0) } },
      walk: { until: t + 10000, params: { from: { ...here }, to: { ...here } } },
      follow: { until: t + 5000, params: { target: firstBody } },
      stand: { params: { place: { ...here }, metres: [{ t, widthM: 1, heightM: 1 }] } },
      blink: { until: t + 5000, params: { parts: [], onS: 0.5, offS: 0.5, off: { transparency: 1 } } },
      vanish: {},
      motion: { until: t + 2000, params: { motion: "", to: 1 } },
      spin: { until: t + 5000, params: { motion: "", turnsPerS: 0.5 } },
      rise: { until: t + 3000, params: { distanceM: 1, angleDeg: 0, headingDeg: 0, stops: true } },
      ride: { params: { in: firstBody, aboveM: 0 } },
      turn: { until: t + 1000, params: { headingDeg: 0 } }
    }
    const draft = drafts[kind] ?? {}
    const event: RecordingEventJson = {
      type: "event", eventType: kind, ...(who === "observer" ? {} : { who }), t,
      ...(draft.until === undefined ? {} : { until: draft.until }), ...(draft.params ? { params: draft.params } : {})
    }
    this.host.editing()
    sighting.events = [...(sighting.events ?? []), event]
    this.picked = sighting.events.length - 1
    RecordingEvents.refresh(sighting)
    this.host.changed()
  }

  /** Removes the picked event; what the recording says of the parameters of the events after it moves with them. */
  private remove(): void {
    const sighting = this.host.sighting()
    const index = this.picked
    if (index === undefined || !sighting.events?.[index]) return
    this.host.editing()
    const provenance = sighting.provenance
    const moved: [string, ProvenanceEntry][] = []
    for (const path of provenance.paths()) {
      const match = /^events\.(\d+)(\..*)?$/.exec(path)
      if (!match) continue
      const at = Number(match[1])
      if (at > index) moved.push([`events.${at - 1}${match[2] ?? ""}`, provenance.at(path)!])
      if (at >= index) provenance.clear(path)
    }
    for (const [path, entry] of moved) provenance.set(path, entry)
    sighting.events = sighting.events.filter((_, at) => at !== index)
    this.picked = undefined
    RecordingEvents.refresh(sighting)
    this.host.changed()
  }

  /** The picked event's fields: when it starts and ends, then its parameters, each with what the recording says of where it came from. */
  private details(event: RecordingEventJson, index: number): HTMLElement[] {
    const head = document.createElement("div")
    head.className = "event-head"
    head.append(this.messages.from, this.seconds(event.t, value => { event.t = value }, `events.${index}.t`))
    if (event.until !== undefined) head.append(this.messages.to, this.seconds(event.until, value => { event.until = value }, `events.${index}.until`))
    const params = document.createElement("div")
    params.className = "event-params"
    for (const [key, value] of Object.entries(event.params ?? {})) {
      const label = document.createElement("span")
      label.textContent = this.messages.params[key] ?? key
      const cell = document.createElement("span")
      cell.append(this.value(event, key, value, `events.${index}.params.${key}`))
      const basis = this.basis(`events.${index}.params.${key}`)
      if (basis) cell.append(basis)
      params.append(label, cell)
    }
    return [head, params]
  }

  /** A parameter: edited where it is a number or a list of instants and numbers, shown otherwise. */
  private value(event: RecordingEventJson, key: string, value: unknown, path: string): Node {
    const params = event.params!
    // A name (a body, a movement of a model): typed as it is.
    if (typeof value === "string") return this.text(value, typed => { params[key] = typed }, path)
    if (typeof value === "boolean") return this.check(value, ticked => { params[key] = ticked }, path)
    if (typeof value === "number") {
      // An instant of the recording is shown and typed in seconds, like the event's own.
      if (key === "glancesUntil") return this.seconds(value, typed => { params[key] = typed }, path)
      // By the parameter's name: degrees, seconds (glanceS, but not turnsPerS, a rate), metres.
      const seconds = key.endsWith("S") && !key.endsWith("PerS")
      const unit = key.endsWith("Deg") ? "°" : seconds ? "s" : key.endsWith("M") ? "m" : ""
      return this.number(value, typed => { params[key] = typed }, path, unit, key === "pitchShare" || seconds || key.endsWith("PerS") ? 0.05 : key.endsWith("M") ? 0.01 : 1)
    }
    if (Array.isArray(value) && value.every(row => typeof row === "object" && row !== null && typeof row.t === "number")) {
      // A table of instants: each row's instant and its numbers (a speed, a divisor, a width and a height), edited where they stand.
      const fields = Object.keys(value[0] ?? {}).filter(field => field !== "t" && typeof value[0][field] === "number")
      const units: Record<string, string> = { kmh: "km/h", widthM: "m", heightM: "m", altitudeM: "m" }
      const rows = document.createElement("span")
      rows.className = "event-rows"
      rows.style.setProperty("--columns", String(1 + fields.length))
      for (const row of value as Record<string, number>[]) {
        rows.append(this.seconds(row.t, typed => { row.t = typed }, path, `${this.messages.at} `))
        for (const field of fields) rows.append(this.number(row[field], typed => { row[field] = typed }, path, units[field] ?? "", field === "divisor" ? 0.05 : 1))
      }
      return rows
    }
    // A look's parts: how many; a blink's: which.
    if (Array.isArray(value) && value.every(part => typeof part === "object" && part !== null && typeof part.sourceId === "string")) {
      return document.createTextNode(this.messages.parts.replace("{n}", String(value.length)))
    }
    if (Array.isArray(value) && value.every(part => typeof part === "string")) return document.createTextNode(value.join(", "))
    // A route: its places, which a survey drew.
    if (Array.isArray(value)) return document.createTextNode(this.messages.points.replace("{n}", String(value.length)))
    if (typeof value === "object" && value !== null) {
      const place = value as Record<string, number>
      if (typeof place.lat === "number" && typeof place.lng === "number") {
        // A place: its latitude and longitude, and when it was there, for a drive's.
        const span = document.createElement("span")
        if (typeof place.t === "number") span.append(this.seconds(place.t, typed => { place.t = typed }, path, `${this.messages.at} `), " ")
        span.append(this.position(value as GeoPoint & { said?: SaidPosition }, path))
        return span
      }
      if (typeof place.x === "number") return document.createTextNode(`${place.x}, ${place.y}, ${place.z} m`)
      // What a blinking part is when off: its fields, as the file says them (a colour shows as itself).
      return document.createTextNode(Object.entries(place).map(([field, said]) => `${field} ${said ?? "∅"}`).join(", "))
    }
    return document.createTextNode(String(value))
  }

  /**
   * A place, as every position of the editor is said (see PositionInputElement): from the observer or something else in the scene, or as a
   * latitude and a longitude. The event keeps its latitude and longitude, and how it was said beside them (`said`). Written once the
   * focus leaves it, as a number field is on its "change": a write draws the fields again, which would take the one being typed in away.
   */
  private position(place: GeoPoint & { said?: SaidPosition }, path: string): Node {
    const frame = this.host.positionFrame?.()
    const messages = this.host.positionMessages?.()
    if (!frame || !messages) {
      const span = document.createElement("span")
      span.append(this.number(place.lat, typed => { place.lat = typed }, path, "°", 0.000001), " ", this.number(place.lng, typed => { place.lng = typed }, path, "°", 0.000001))
      return span
    }
    registerPositionInput()
    const element = document.createElement("rr0-input-position") as PositionInputElement
    element.setAttribute("native", "geo")
    element.setAttribute("name", path.replace(/\./g, "-"))
    element.build()
    element.messages = messages
    // What it stands on is the parameter's, said after it (see basis): not twice.
    element.basisShown = false
    element.frame = frame
    element.value = { lat: place.lat, lng: place.lng }
    element.said = place.said
    let pending: PositionChange | undefined
    element.addEventListener("positionchange", event => { pending = (event as CustomEvent<PositionChange>).detail })
    element.addEventListener("focusout", event => {
      if (!pending || element.contains(event.relatedTarget as Node | null)) return
      const { value, said } = pending
      pending = undefined
      if (!("lat" in value)) return
      this.edited(() => {
        place.lat = Math.round(value.lat * 1e7) / 1e7
        place.lng = Math.round(value.lng * 1e7) / 1e7
        if (said) place.said = said
        else delete place.said
      }, path)
    })
    return element
  }

  private text(value: string, set: (value: string) => void, path: string): Node {
    const input = document.createElement("input")
    input.type = "text"
    input.value = value
    input.addEventListener("change", () => this.edited(() => set(input.value.trim()), path))
    return input
  }

  private check(value: boolean, set: (value: boolean) => void, path: string): Node {
    const input = document.createElement("input")
    input.type = "checkbox"
    input.checked = value
    input.addEventListener("change", () => this.edited(() => set(input.checked), path))
    return input
  }

  /** Writes what was typed, as the author's, and works the events' values out again. */
  private edited(write: () => void, path: string): void {
    this.host.editing()
    write()
    // A value typed is the author's: what it said of where it came from was said of the value it replaced.
    this.host.sighting().provenance.clear(path)
    RecordingEvents.refresh(this.host.sighting())
    this.host.changed()
  }

  /** An instant of the recording, ms, typed in seconds. */
  private seconds(ms: number, set: (ms: number) => void, path: string, prefix = ""): Node {
    const input = this.number(ms / 1000, typed => set(Math.round(typed * 1000)), path, "s", 0.1)
    if (!prefix) return input
    const span = document.createElement("span")
    span.append(prefix, input)
    return span
  }

  private number(value: number, set: (value: number) => void, path: string, unit: string, step: number): Node {
    const label = document.createElement("label")
    const input = document.createElement("input")
    input.type = "number"
    input.step = String(step)
    // Shown to the thousandth, as far as a field is typed to: a place's degrees to the millionth.
    input.value = String(step < 0.001 ? value : Math.round(value * 1000) / 1000)
    input.addEventListener("change", () => {
      const typed = Number(input.value)
      if (input.value === "" || !Number.isFinite(typed)) return
      this.edited(() => set(typed), path)
    })
    label.append(input)
    if (unit) label.append(` ${unit}`)
    return label
  }

  /** What the recording says of where a parameter came from, when it says something other than that the observer stated it. */
  private basis(path: string): HTMLElement | undefined {
    const entry = this.host.sighting().provenance.at(path)
    if (!entry) return undefined
    const mark = document.createElement("span")
    mark.className = "event-basis"
    mark.dataset.basis = entry.basis
    mark.textContent = this.messages.basis[entry.basis as keyof EventsMessages["basis"]] ?? entry.basis
    if (entry.rationale) mark.title = entry.rationale
    return mark
  }
}
