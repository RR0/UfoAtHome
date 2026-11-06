import type { Sighting } from "../engine/model/Sighting.js"
import type { RecordingEventJson } from "../engine/events/RecordingEvent.js"
import { RecordingEvents } from "../engine/events/RecordingEvents.js"
import { RecordingActors, type ActorKind } from "../engine/events/RecordingActors.js"
import type { EventsMessages } from "./messages/EventsMessages.js"
import { ElementList } from "./ElementList.js"
import { Icons } from "./Icons.js"
import { BasisInputElement, register as registerBasisInput, type BasisEntry } from "./BasisInputElement.js"
import { HintElement } from "./HintElement.js"
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
  /** The shape or group of shapes picked in the account, as one click picks it (its outermost group): what an event of the phenomenon
   * added is about. */
  currentShapes?(): string | undefined
  /** What a shape or a group of shapes is called. */
  shapesLabel?(id: string): string
  /** Another event was picked: the tracks show it picked too. */
  picked?(): void
  /** What a place can be said from (see PositionFrame): with it, a place is said as every position of the editor is, relative or absolute. */
  positionFrame?(): PositionFrame
  positionMessages?(): PositionInputMessages
  /** The compass point an azimuth falls in, in the editor's language ("NNE"). */
  compassPoint?(azimuthDeg: number): string
  /** Where the observer looks at the playhead: a direction in the sky an event can be said to start from or go towards. */
  lookedAt?(): { azimuthDeg: number, altitudeDeg: number } | undefined
}

/** A direction in the sky: its azimuth from north, and its altitude above the horizon, degrees. */
type SkyDirection = { azimuthDeg: number, altitudeDeg: number }

/** A row of a table of instants: when, its numbers, and whether it comes at once rather than from the row before. */
type InstantRow = { t: number, step?: boolean } & Record<string, number | boolean | undefined>

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
  static readonly CSS = `${BasisInputElement.CSS}${HintElement.CSS}
.events-section[hidden] { display: none; }
.events-note { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--ink-dim); }
.events-row, .events-fields { grid-column: 1 / -1; min-width: 0; }
.events-fields { display: grid; gap: 6px; }
.event-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
/* A label wraps rather than push its field aside: no wider than a third of the panel. */
.event-params { display: grid; grid-template-columns: fit-content(33%) minmax(0, 1fr); gap: 4px 12px; align-items: baseline; font-size: 14px; }
.event-param { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 6px; min-width: 0; }
.event-param-label .basis-mark { margin-left: 6px; }
.event-param-label:has(+ .event-param:is(:hover, :focus-within)) .basis-mark { opacity: 1; }
.event-params input[type="number"] { width: 6em; }
.event-params input[type="text"] { width: 10em; }
.event-table { display: grid; justify-items: start; gap: 4px; }
.event-rows { display: grid; grid-template-columns: repeat(var(--columns, 2), max-content); gap: 2px 8px; align-items: center; }
.event-row-step { font-size: 13px; white-space: nowrap; }
.event-direction-point { font-size: 13px; color: var(--ink-dim); }
.event-direction-look { font-size: 13px; }
`

  /** What an author can add by hand, by actor: the kinds whose parameters this panel edits (a drive's route comes from a survey). */
  private static readonly ADDABLE: Record<EventsActor, string[]> = {
    observer: ["look", "walk", "follow"],
    phenomenon: ["stand", "blink", "turn", "roll", "vibrate", "spiral", "vanish"],
    bodies: ["motion", "spin", "rise", "turn", "ride", "light", "blink", "vanish"]
  }

  /**
   * The parameters whose values the player knows, by name: picked among them, in the editor's words (EventsMessages.choices,
   * `key.value`). One the file may leave out says what it then is (`absent`, its first value), and is shown when the event has the
   * parameters it goes `with`.
   */
  private static readonly CHOICES: Record<string, { values: string[], absent?: string, with: string[] }> = {
    sizeBy: { values: ["", "altitude"], absent: "", with: ["sizeDeg"] },
    side: { values: ["left", "right"], with: [] },
    seenFrom: { values: ["", "craft"], absent: "", with: ["side", "byDeg"] }
  }

  /** The parameters that name another thing of the recording, by name: what kinds of things they can name. */
  private static readonly AMONG: Record<string, ActorKind[]> = {
    target: ["shape", "group", "body", "decor"],
    in: ["body", "decor"],
    vehicle: ["decor"]
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

  /**
   * Whom an event added is about: the observer, by their id; the shape or group of shapes picked in the account (the phenomenon where none
   * is, as its `stand` says, else its outermost group or shape); the body picked in the list of bodies.
   */
  private who(): string | undefined {
    const sighting = this.host.sighting()
    if (this.actor === "observer") return RecordingActors.observerId(sighting)
    if (this.actor === "bodies") return this.host.currentBody?.()
    const picked = this.host.currentShapes?.()
    if (picked !== undefined) return picked
    const stand = (sighting.events ?? []).find(event => event.eventType === "stand" && RecordingActors.isPhenomenon(sighting, event))
    if (stand?.who !== undefined) return stand.who
    const shapes = RecordingActors.shapeIds(sighting)
    return shapes.length > 0 ? sighting.timeline.topOf(shapes[0]) : undefined
  }

  /** The actor's events, each with its place among the recording's events, which is where what it says of its parameters is kept: the
   * observer's; those of the account's shapes, whichever shape or group each is about; the picked body's. */
  private events(): { event: RecordingEventJson, index: number }[] {
    const sighting = this.host.sighting()
    const body = this.actor === "bodies" ? this.host.currentBody?.() : undefined
    const theirs = (event: RecordingEventJson) => this.actor === "observer" ? RecordingActors.isObserver(sighting, event)
      : this.actor === "phenomenon" ? RecordingActors.isPhenomenon(sighting, event)
      : body !== undefined && (event.who === body || RecordingActors.partOf(event.who)?.element === body)
    return (sighting.events ?? []).map((event, index) => ({ event, index })).filter(({ event }) => theirs(event))
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
    this.root.hidden = this.actor === "bodies" && this.who() === undefined
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
      blink: { until: t + 5000, params: { onS: 0.5, offS: 0.5, off: { transparency: 1 } } },
      vanish: {},
      motion: { until: t + 2000, params: { motion: "", to: 1 } },
      spin: { until: t + 5000, params: { motion: "", turnsPerS: 0.5 } },
      rise: { until: t + 3000, params: { distanceM: 1, angleDeg: 0, headingDeg: 0, stops: true } },
      ride: { params: { in: firstBody, aboveM: 0 } },
      turn: { until: t + 1000, params: { headingDeg: 0 } }
    }
    // About a phenomenon going across the sky (see TravelParams): its turn is by some degrees to one side, and it banks, vibrates, spirals.
    if (this.actor === "phenomenon") Object.assign(drafts, {
      turn: { until: t + 1000, params: { byDeg: 15, side: "left" } },
      roll: { until: t + 500, params: { toDeg: 20 } },
      vibrate: { until: t + 1000, params: { hz: 10, amplitudeShare: 0.1, riseS: 0.3 } },
      spiral: { until: t + 1000, params: { turns: 1, radiusDeg: 2, shrink: 0.5, clockwise: true, rollDeg: 360 } }
    })
    // A body's blink is one of its lights': lit at a luminance while on, dark while off.
    if (this.actor === "bodies") Object.assign(drafts, { blink: { until: t + 5000, params: { onS: 0.5, offS: 0.5, cdM2: 500 } }, light: { params: { cdM2: 500 } } })
    const draft = drafts[kind] ?? {}
    const event: RecordingEventJson = {
      type: "event", eventType: kind, who, t,
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
    // An event of the phenomenon is about one of its shapes or groups: the whole of it, or the part that does this.
    if (this.actor === "phenomenon") {
      const label = document.createElement("span")
      label.textContent = this.messages.who
      params.append(label, this.subject(event))
    }
    // An event of a body is about the whole of it, or one part of its model: a node, a bone (the legs, the head).
    if (this.actor === "bodies") {
      const label = document.createElement("span")
      label.textContent = this.messages.part
      params.append(label, this.part(event))
    }
    const entries = Object.entries(event.params ?? {})
    // A choice the file may leave out (its first, then), shown all the same: what it then is can be picked.
    for (const [key, choice] of Object.entries(EventsPanel.CHOICES)) {
      if (choice.absent !== undefined && choice.with.every(sibling => event.params?.[sibling] !== undefined) && event.params?.[key] === undefined) {
        entries.push([key, choice.absent])
      }
    }
    for (const [key, value] of entries) {
      const label = document.createElement("span")
      label.className = "event-param-label"
      label.textContent = this.messages.params[key] ?? key
      const hint = this.messages.paramHints[key]
      if (hint) label.append(HintElement.of(hint))
      // What it stands on after its name, as every value of the editor says it (see WitnessErrorView): not in the way of the value.
      label.append(this.basis(`events.${index}.params.${key}`))
      const cell = document.createElement("span")
      cell.className = "event-param"
      cell.append(this.value(event, key, value, `events.${index}.params.${key}`))
      params.append(label, cell)
    }
    return [head, params]
  }

  /** Which of the account's shapes or groups of shapes an event is about, picked among them: groups first, as they hold the shapes. */
  private subject(event: RecordingEventJson): HTMLSelectElement {
    const sighting = this.host.sighting()
    const select = document.createElement("select")
    select.className = "event-who"
    const ids = [...sighting.timeline.allGroups.map(group => group.id), ...RecordingActors.shapeIds(sighting)]
    if (event.who !== undefined && !ids.includes(event.who)) ids.unshift(event.who)
    for (const id of ids) {
      const option = document.createElement("option")
      option.value = id
      option.textContent = this.host.shapesLabel?.(id) ?? id
      select.append(option)
    }
    select.value = event.who ?? ""
    select.addEventListener("change", () => {
      this.host.editing()
      event.who = select.value
      RecordingEvents.refresh(sighting)
      this.host.changed()
    })
    return select
  }

  /** Which part of the body's model an event is about, typed by its name in the model: none, the whole body. */
  private part(event: RecordingEventJson): HTMLInputElement {
    const sighting = this.host.sighting()
    const stated = RecordingActors.partOf(event.who)
    const body = stated?.element ?? event.who ?? ""
    const input = document.createElement("input")
    input.type = "text"
    input.className = "event-part"
    input.value = stated?.part ?? ""
    input.placeholder = this.messages.wholeBody
    input.title = this.messages.partHint
    input.addEventListener("change", () => {
      const part = input.value.trim().replaceAll("/", "")
      this.host.editing()
      event.who = part ? `${body}/${part}` : body
      RecordingEvents.refresh(sighting)
      this.host.changed()
    })
    return input
  }

  /** A parameter: edited where it is a number or a list of instants and numbers, shown otherwise. */
  private value(event: RecordingEventJson, key: string, value: unknown, path: string): Node {
    const params = event.params!
    // One of the values the player knows: picked among them.
    const choice = EventsPanel.CHOICES[key]
    if (choice && (typeof value === "string")) return this.choice(key, value, choice, picked => {
      if (picked === choice.absent) delete params[key]
      else params[key] = picked
    }, path)
    // Another thing of the recording, by its id: picked among them.
    const among = EventsPanel.AMONG[key]
    if (among && typeof value === "string") return this.actorChoice(value, among, picked => { params[key] = picked }, path)
    // A name (a movement of a model): typed as it is.
    if (typeof value === "string") return this.text(value, typed => { params[key] = typed }, path)
    if (typeof value === "boolean") return this.check(value, ticked => { params[key] = ticked }, path)
    if (typeof value === "number") {
      // An instant of the recording is shown and typed in seconds, like the event's own.
      if (key === "glancesUntil") return this.seconds(value, typed => { params[key] = typed }, path)
      // By the parameter's name: degrees, seconds (glanceS, but not turnsPerS, a rate), metres.
      const seconds = key.endsWith("S") && !key.endsWith("PerS")
      const unit = key.endsWith("Deg") ? "°" : seconds ? "s" : key.endsWith("M") ? "m" : key === "cdM2" ? "cd/m²" : key === "hz" ? "Hz" : ""
      return this.number(value, typed => { params[key] = typed }, path, unit, key === "pitchShare" || seconds || key.endsWith("PerS") ? 0.05 : key.endsWith("M") ? 0.01 : 1)
    }
    if (Array.isArray(value) && value.length > 0 && value.every(row => typeof row === "object" && row !== null && typeof row.t === "number")) {
      return this.rows(value as InstantRow[], path)
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
      if (typeof place.azimuthDeg === "number" && typeof place.altitudeDeg === "number") return this.direction(place as SkyDirection, path)
      // What a blinking part is when off: its fields, as the file says them (a colour shows as itself).
      return document.createTextNode(Object.entries(place).map(([field, said]) => `${field} ${said ?? "∅"}`).join(", "))
    }
    return document.createTextNode(String(value))
  }

  /** A value the player knows, picked among the others it knows. */
  private choice(key: string, value: string, choice: { values: string[] }, set: (value: string) => void, path: string): Node {
    const select = document.createElement("select")
    for (const known of choice.values) {
      const option = document.createElement("option")
      option.value = known
      option.textContent = this.messages.choices[`${key}.${known}`] ?? known
      select.append(option)
    }
    // A value the file says that the editor does not know: kept, and shown as it is.
    if (!choice.values.includes(value)) select.prepend(new Option(value, value))
    select.value = value
    select.addEventListener("change", () => this.edited(() => set(select.value), path))
    return select
  }

  /** Another thing of the recording, picked among those of the kinds it can be, by what each is called. */
  private actorChoice(value: string, kinds: ActorKind[], set: (value: string) => void, path: string): Node {
    const select = document.createElement("select")
    const ids = [...RecordingActors.ids(this.host.sighting())].filter(([, said]) => said.some(kind => kinds.includes(kind))).map(([id]) => id)
    if (!ids.includes(value)) ids.unshift(value)
    for (const id of ids) {
      const kind = RecordingActors.kindOf(this.host.sighting(), id)
      const label = kind === "body" ? this.host.bodyLabel?.(id) : kind === "shape" || kind === "group" ? this.host.shapesLabel?.(id) : undefined
      select.append(new Option(label ?? id, id))
    }
    select.value = value
    select.addEventListener("change", () => this.edited(() => set(select.value), path))
    return select
  }

  /**
   * A direction in the sky (where a travel starts, where it goes): its azimuth, with the compass point it falls in, and its altitude, edited
   * where they stand; or, in one click, where the observer looks at the playhead.
   */
  private direction(direction: SkyDirection, path: string): Node {
    const span = document.createElement("span")
    span.className = "event-direction"
    span.append(`${this.messages.params.azimuthDeg ?? "azimuthDeg"} `, this.number(direction.azimuthDeg, typed => { direction.azimuthDeg = ((typed % 360) + 360) % 360 }, path, "°", 0.1))
    const point = this.host.compassPoint?.(direction.azimuthDeg)
    if (point) {
      const said = document.createElement("span")
      said.className = "event-direction-point"
      said.textContent = point
      span.append(" ", said)
    }
    span.append(` ${this.messages.params.altitudeDeg ?? "altitudeDeg"} `, this.number(direction.altitudeDeg, typed => { direction.altitudeDeg = Math.max(-90, Math.min(90, typed)) }, path, "°", 0.1))
    if (direction.altitudeDeg === 90) span.append(` (${this.messages.zenith})`)
    if (this.host.lookedAt) {
      const look = document.createElement("button")
      look.type = "button"
      look.className = "event-direction-look"
      look.textContent = this.messages.lookedAt
      look.title = this.messages.lookedAtHint
      look.addEventListener("click", () => {
        const looked = this.host.lookedAt?.()
        if (!looked) return
        this.edited(() => {
          direction.azimuthDeg = Math.round((((looked.azimuthDeg % 360) + 360) % 360) * 10) / 10
          direction.altitudeDeg = Math.round(looked.altitudeDeg * 10) / 10
        }, path)
      })
      span.append(" ", look)
    }
    return span
  }

  /**
   * A table of instants (a speed, a divisor, a width and a height at instants of the recording), as long as the account needs: each row's
   * instant and its numbers edited where they stand, whether its value comes at once rather than from the row before, 🗑 to remove it, and
   * "+" to add one after the last. The rows keep in the order of their instants.
   */
  private rows(rows: InstantRow[], path: string): Node {
    const fields = Object.keys(rows[0]).filter(field => field !== "t" && typeof rows[0][field] === "number")
    const units: Record<string, string> = { kmh: "km/h", degPerS: "°/s", widthM: "m", heightM: "m", altitudeM: "m" }
    const table = document.createElement("span")
    table.className = "event-rows"
    table.style.setProperty("--columns", String(3 + fields.length))
    rows.forEach((row, index) => {
      table.append(this.seconds(row.t, typed => {
        row.t = typed
        rows.sort((a, b) => a.t - b.t)
      }, path, `${this.messages.at} `))
      for (const field of fields) table.append(this.number(row[field] as number, typed => { row[field] = typed }, path, units[field] ?? "", field === "divisor" ? 0.05 : 1))
      // The first row has no row before it to come from.
      if (index === 0) table.append(document.createElement("span"))
      else {
        const step = document.createElement("label")
        step.className = "event-row-step"
        step.title = this.messages.atOnceHint
        const box = this.check(row.step === true, ticked => {
          if (ticked) row.step = true
          else delete row.step
        }, path) as HTMLInputElement
        box.title = this.messages.atOnceHint
        step.append(box, ` ${this.messages.atOnce}`)
        table.append(step)
      }
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "icon-btn event-row-remove"
      remove.innerHTML = Icons.TRASH
      remove.title = remove.ariaLabel = this.messages.removeRow
      remove.disabled = rows.length < 2
      remove.addEventListener("click", () => this.edited(() => { rows.splice(index, 1) }, path))
      table.append(remove)
    })
    const add = document.createElement("button")
    add.type = "button"
    add.className = "icon-btn event-row-add"
    add.innerHTML = Icons.PLUS
    add.title = add.ariaLabel = this.messages.addRow
    add.addEventListener("click", () => this.edited(() => {
      const last = rows[rows.length - 1]
      const next: InstantRow = { ...last, t: last.t + 1000 }
      delete next.step
      rows.push(next)
    }, path))
    const span = document.createElement("span")
    span.className = "event-table"
    span.append(table, add)
    return span
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

  /** What a parameter stands on (see BasisInputElement): said, and edited, beside it. */
  private basis(path: string): HTMLElement {
    registerBasisInput()
    const element = document.createElement(BasisInputElement.TAG) as BasisInputElement
    element.anchorKey = path
    element.messages = { title: this.messages.basisTitle, basis: this.messages.basis, basisField: this.messages.basisField, howField: this.messages.howField,
      rationaleField: this.messages.rationaleField }
    element.entry = this.host.sighting().provenance.at(path)
    // What it stands on is said of the value as it is: no typing, nothing worked out again.
    element.addEventListener("basischange", event => {
      const entry = (event as CustomEvent<{ entry?: BasisEntry }>).detail.entry
      this.host.editing()
      if (entry) this.host.sighting().provenance.set(path, entry)
      else this.host.sighting().provenance.clear(path)
      this.host.changed()
    })
    return element
  }

}
