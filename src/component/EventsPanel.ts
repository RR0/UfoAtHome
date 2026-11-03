import type { Sighting } from "../engine/model/Sighting.js"
import type { RecordingEventJson } from "../engine/events/RecordingEvent.js"
import { RecordingEvents } from "../engine/events/RecordingEvents.js"
import type { EventsMessages } from "./messages/EventsMessages.js"

/** What the panel needs of the editor that holds it. */
export interface EventsPanelHost {
  sighting(): Sighting
  /** An event is about to be edited: the recording as it stands is what an undo goes back to. */
  editing(): void
  /** An event was edited, or the events given back: an edit of the recording, whose poses have been worked out again. */
  changed(): void
  /** Moves the playhead to `t`, ms. */
  seek(t: number): void
}

/** Whose events a panel shows: the observer's (their poses, the tracks of what carries them), or the phenomenon's (the account's shapes). */
export type EventsActor = "observer" | "phenomenon" | "bodies"

/**
 * An actor's events in the editor (see RecordingEvents): each one, when it starts and ends, and its parameters, with what each says of
 * where it came from. A number or a list of speeds is edited where it stands, and the poses are worked out again at once; a value typed is the
 * author's, and forgets the basis it had. A path, a place or a point of the vehicle is shown, not edited here: they come from a survey or a
 * model. While the author's own poses win over the events (they moved the observer by hand), it says so, and offers the events back.
 */
export class EventsPanel {
  static readonly CSS = `
.events-section[hidden] { display: none; }
.events-note { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--ink-dim); }
.events-list { grid-column: 1 / -1; list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.events-list > li { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; }
.event-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.event-kind { font-weight: 600; min-height: 0; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.event-kind:hover { text-decoration: underline; background: none; }
.event-params { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; align-items: baseline; font-size: 14px; }
.event-params input[type="number"] { width: 6em; }
.event-rows { display: grid; grid-template-columns: repeat(var(--columns, 2), max-content); gap: 2px 8px; }
.event-basis { margin-left: 6px; font-size: 12px; font-style: italic; color: var(--ink-dim); }
`

  private messages: EventsMessages

  constructor(private readonly root: HTMLElement, private readonly host: EventsPanelHost, messages: EventsMessages, private readonly actor: EventsActor = "observer") {
    this.messages = messages
  }

  localize(messages: EventsMessages): void {
    this.messages = messages
    this.render()
  }

  /** Whether what it says was said of poses that were the events' (see sync). */
  private shownTheirs?: boolean

  /** Shows the events again if whose poses they are changed since it last did. */
  sync(): void {
    if (this.theirs() !== this.shownTheirs) this.render()
  }

  /** Whether what the actor's events give is still theirs: no pose, no shape written by hand since. */
  private theirs(): boolean {
    const sighting = this.host.sighting()
    return this.actor === "observer" ? RecordingEvents.observerTrackIsExpanded(sighting)
      : this.actor === "phenomenon" ? RecordingEvents.timelineIsExpanded(sighting)
      : RecordingEvents.bodiesAreExpanded(sighting)
  }

  /** Shows the recording's events as they now stand: nothing at all for a recording that states none. */
  render(): void {
    const sighting = this.host.sighting()
    this.shownTheirs = this.theirs()
    // The actor's own, each with its place among the recording's events, which is where what it says of its parameters is kept.
    const bodyIds = new Set((sighting.interpretation?.bodies ?? []).map(body => body.id))
    const mine = (who: string) => this.actor === "bodies" ? bodyIds.has(who) : who === this.actor
    const events = (sighting.events ?? []).map((event, index) => ({ event, index })).filter(({ event }) => mine(event.who ?? "observer"))
    this.root.hidden = events.length === 0
    this.root.querySelector<HTMLElement>(".events-title")!.textContent = this.messages.title
    const body = this.root.querySelector<HTMLElement>(".events-body")!
    body.replaceChildren()
    if (events.length === 0) return
    const theirs = this.shownTheirs
    const note = document.createElement("p")
    note.className = "events-note"
    note.textContent = this.actor === "observer"
      ? theirs ? this.messages.derivedNote : this.messages.overriddenNote
      : this.actor === "phenomenon"
        ? theirs ? this.messages.derivedShapesNote : this.messages.overriddenShapesNote
        : theirs ? this.messages.derivedBodiesNote : this.messages.overriddenBodiesNote
    body.append(note)
    if (!theirs) {
      const reset = document.createElement("button")
      reset.type = "button"
      reset.className = "events-reset"
      reset.textContent = this.messages.resetToEvents
      reset.addEventListener("click", () => {
        this.host.editing()
        RecordingEvents.reset(this.host.sighting())
        this.host.changed()
      })
      body.append(reset)
    }
    const list = document.createElement("ul")
    list.className = "events-list"
    for (const { event, index } of events) list.append(this.item(event, index))
    body.append(list)
  }

  private item(event: RecordingEventJson, index: number): HTMLLIElement {
    const item = document.createElement("li")
    const head = document.createElement("div")
    head.className = "event-head"
    const kind = document.createElement("button")
    kind.type = "button"
    kind.className = "event-kind"
    kind.textContent = this.messages.kinds[event.eventType] ?? event.eventType
    // Several bodies may have events: whose each one is.
    if (this.actor === "bodies" && event.who) kind.textContent = `${event.who} · ${kind.textContent}`
    kind.addEventListener("click", () => this.host.seek(event.t))
    head.append(kind, this.messages.from, this.seconds(event.t, value => { event.t = value }, `events.${index}.t`))
    if (event.until !== undefined) head.append(this.messages.to, this.seconds(event.until, value => { event.until = value }, `events.${index}.until`))
    item.append(head)
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
    item.append(params)
    return item
  }

  /** A parameter: edited where it is a number or a list of instants and numbers, shown otherwise. */
  private value(event: RecordingEventJson, key: string, value: unknown, path: string): Node {
    const params = event.params!
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
        const where = `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`
        if (typeof place.t !== "number") return document.createTextNode(where)
        const span = document.createElement("span")
        span.append(this.seconds(place.t, typed => { place.t = typed }, path, `${this.messages.at} `), ` ${where}`)
        return span
      }
      if (typeof place.x === "number") return document.createTextNode(`${place.x}, ${place.y}, ${place.z} m`)
      // What a blinking part is when off: its fields, as the file says them (a colour shows as itself).
      return document.createTextNode(Object.entries(place).map(([field, said]) => `${field} ${said ?? "∅"}`).join(", "))
    }
    return document.createTextNode(String(value))
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
    input.value = String(Math.round(value * 1000) / 1000)
    input.addEventListener("change", () => {
      const typed = Number(input.value)
      if (input.value === "" || !Number.isFinite(typed)) return
      this.host.editing()
      set(typed)
      // A value typed is the author's: what it said of where it came from was said of the value it replaced.
      this.host.sighting().provenance.clear(path)
      RecordingEvents.refresh(this.host.sighting())
      this.host.changed()
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
