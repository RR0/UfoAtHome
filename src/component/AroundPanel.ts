import type { Sighting } from "../engine/model/Sighting.js"
import { Arounds, type Around, type AroundRoad } from "../engine/model/Around.js"
import { AroundNoise } from "../engine/traffic/AroundNoise.js"
import { BasisInputElement, register as registerBasisInput, type BasisEntry, type BasisInputMessages, type BasisSourceMessages, type SourceChoices } from "./BasisInputElement.js"
import { HintElement } from "./HintElement.js"
import { NumberFields } from "./NumberFields.js"
import type { AroundMessages } from "./messages/AroundMessages.js"

/** What the panel needs of the editor holding it. */
export interface AroundPanelHost {
  sighting(): Sighting
  /** A figure is about to be edited: the recording as it stands is what an undo goes back to. */
  editing(): void
  /** A figure was edited, or a road added or removed: an edit of the recording, which the scene is to play. */
  changed(): void
  /** The words and lists the basis window needs to say what a figure rests on (see BasisInputElement). */
  valueSources?(): { messages: BasisSourceMessages, choices: SourceChoices } | undefined
}

/** A count's field: its key in Around, the most it takes, and its unit. */
const COUNTS: { key: "cars" | "trucks" | "people" | "talking" | "withinM", max: number, unit?: string }[] = [
  { key: "cars", max: 999 },
  { key: "trucks", max: 999 },
  { key: "people", max: 9999 },
  { key: "talking", max: 9999 },
  { key: "withinM", max: 9999, unit: "m" }
]
const ROAD_FIELDS: { key: keyof AroundRoad, max: number, unit: "m" | "perMinute" | "km/h", step?: string }[] = [
  { key: "distanceM", max: 99999, unit: "m" },
  { key: "vehiclesPerMinute", max: 999, unit: "perMinute", step: "0.1" },
  { key: "trucksPerMinute", max: 999, unit: "perMinute", step: "0.1" },
  { key: "speedKmh", max: 200, unit: "km/h" }
]

/**
 * The section of the editor that says what was around the observer (see Around): the cars, trucks and people there at once within a
 * radius, and the roads at their distance, each figure with what it rests on beside it; and what that sounds like where the observer stands
 * (see AroundNoise), which is what an aircraft is heard against. Blank fields say nothing; the section empty, the recording says nothing.
 */
export class AroundPanel {
  private messages?: AroundMessages
  private basisMessages?: BasisInputMessages

  constructor(private readonly root: HTMLElement, private readonly host: AroundPanelHost) {}

  /** Its words, and those of the basis window it shares with the other values of the editor. */
  localize(messages: AroundMessages, basis: BasisInputMessages): void {
    this.messages = messages
    this.basisMessages = basis
    this.render()
  }

  /** Draws it again from the recording: a recording read, an undo. */
  render(): void {
    const messages = this.messages
    if (!messages) return
    const title = this.root.querySelector(".section-title")
    if (title) title.replaceChildren(document.createTextNode(messages.title), " ", HintElement.of(messages.hint))
    const body = this.root.querySelector(".around-body") ?? this.root
    const around = this.host.sighting().around ?? {}
    const counted = document.createElement("div")
    counted.className = "around-counted"
    counted.append(this.heading(messages.counted))
    for (const field of COUNTS) {
      const label = messages[field.key === "withinM" ? "within" : field.key]
      counted.append(this.field(label, `around.${field.key}`, around[field.key], field.max, "1", field.unit ?? "", value => this.edit(next => {
        if (value === undefined) delete next[field.key]
        else next[field.key] = value
      }), field.key === "withinM" ? String(Arounds.DEFAULT_WITHIN_M) : undefined))
    }
    const roads = document.createElement("div")
    roads.className = "around-roads"
    roads.append(this.heading(messages.roads))
    ;(around.roads ?? []).forEach((road, index) => roads.append(this.road(road, index, messages)))
    const add = document.createElement("button")
    add.type = "button"
    add.className = "around-add-road"
    add.textContent = messages.addRoad
    add.addEventListener("click", () => this.edit(next => {
      next.roads = [...(next.roads ?? []), { distanceM: 50, vehiclesPerMinute: 5 }]
    }, true))
    roads.append(add)
    const heard = document.createElement("output")
    heard.className = "place-status around-heard"
    const level = AroundNoise.dbA(this.host.sighting().around)
    heard.textContent = Number.isFinite(level) ? messages.heard.replace("{level}", level.toFixed(0)) : messages.quiet
    body.replaceChildren(counted, roads, heard)
    NumberFields.fit(body)
  }

  /** One road's row: its figures, and a button to remove it. */
  private road(road: AroundRoad, index: number, messages: AroundMessages): HTMLElement {
    const row = document.createElement("div")
    row.className = "around-road"
    for (const field of ROAD_FIELDS) {
      const label = field.key === "distanceM" ? messages.roadDistance : field.key === "speedKmh" ? messages.speed : messages[field.key]
      const unit = field.unit === "perMinute" ? messages.perMinute : field.unit
      const required = field.key === "distanceM" || field.key === "vehiclesPerMinute"
      row.append(this.field(label, `around.roads.${index}.${field.key}`, road[field.key], field.max, field.step ?? "1", unit, value => this.edit(next => {
        const roads = [...(next.roads ?? [])]
        const edited = { ...roads[index] }
        // A road's distance and flow are what it is: blanked, the field keeps what it had.
        if (value === undefined) {
          if (required) return
          delete edited[field.key]
        } else edited[field.key] = value
        roads[index] = edited
        next.roads = roads
      }), field.key === "speedKmh" ? String(Arounds.DEFAULT_SPEED_KMH) : undefined))
    }
    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "around-remove-road"
    remove.title = messages.removeRoad
    remove.setAttribute("aria-label", messages.removeRoad)
    remove.textContent = "×"
    remove.addEventListener("click", () => this.edit(next => {
      next.roads = (next.roads ?? []).filter((_, other) => other !== index)
      // What each later road's figures rest on goes with them, one place up; the removed road's goes with it.
      const provenance = this.host.sighting().provenance
      const moved: [string, BasisEntry][] = []
      for (const path of provenance.paths()) {
        const match = /^around\.roads\.(\d+)\.(.+)$/.exec(path)
        if (!match) continue
        const at = Number(match[1])
        const entry = provenance.at(path)
        provenance.clear(path)
        if (at > index && entry) moved.push([`around.roads.${at - 1}.${match[2]}`, entry])
      }
      for (const [path, entry] of moved) provenance.set(path, entry)
    }, true))
    row.append(remove)
    return row
  }

  private heading(text: string): HTMLElement {
    const heading = document.createElement("h4")
    heading.className = "around-heading"
    heading.textContent = text
    return heading
  }

  /** A figure's field: its label, its basis, the field, its unit after it. Blank says nothing. */
  private field(text: string, path: string, value: number | undefined, max: number, step: string, unit: string, set: (value: number | undefined) => void, placeholder?: string): HTMLElement {
    const label = document.createElement("label")
    const name = document.createElement("span")
    name.textContent = text
    const input = document.createElement("input")
    input.type = "number"
    input.min = "0"
    input.max = String(max)
    input.step = step
    input.dataset.path = path
    if (placeholder) input.placeholder = placeholder
    input.value = value === undefined ? "" : String(value)
    // What a figure rests on is said of a figure: a blank field has none to say it of.
    const basis = this.basis(path)
    basis.hidden = value === undefined
    input.addEventListener("input", () => {
      const typed = Number(input.value)
      const next = input.value === "" || !Number.isFinite(typed) ? undefined : typed
      basis.hidden = next === undefined
      set(next)
    })
    label.append(name, " ", basis, input)
    if (unit) label.append(` ${unit}`)
    return label
  }

  /** What a figure rests on (see BasisInputElement): said, and edited, beside it. */
  private basis(path: string): HTMLElement {
    registerBasisInput()
    const element = document.createElement(BasisInputElement.TAG) as BasisInputElement
    element.anchorKey = path
    if (this.basisMessages) element.messages = this.basisMessages
    const sources = this.host.valueSources?.()
    element.sourceMessages = sources?.messages
    element.choices = sources?.choices ?? {}
    element.entry = this.host.sighting().provenance.at(path)
    element.addEventListener("basischange", event => {
      const entry = (event as CustomEvent<{ entry?: BasisEntry }>).detail.entry
      this.host.editing()
      if (entry) this.host.sighting().provenance.set(path, entry)
      else this.host.sighting().provenance.clear(path)
      this.host.changed()
    })
    return element
  }

  /**
   * Changes what is around and says so. Typed into, the panel is not drawn again (the caret stays where it is), only what it sounds like;
   * a road added or removed draws it again.
   */
  private edit(change: (next: Around) => void, redraw = false): void {
    const sighting = this.host.sighting()
    this.host.editing()
    const next: Around = { ...(sighting.around ?? {}) }
    change(next)
    sighting.around = Arounds.read(next)
    this.host.changed()
    if (redraw) this.render()
    else this.refreshHeard()
  }

  private refreshHeard(): void {
    const heard = this.root.querySelector(".around-heard")
    const messages = this.messages
    if (!heard || !messages) return
    const level = AroundNoise.dbA(this.host.sighting().around)
    heard.textContent = Number.isFinite(level) ? messages.heard.replace("{level}", level.toFixed(0)) : messages.quiet
  }
}
