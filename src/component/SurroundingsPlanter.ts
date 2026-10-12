import type { DecorObject } from "../engine/model/Decor.js"
import type { RecordingSource } from "../engine/model/RecordingSource.js"
import type { Surroundings, SurroundingsProvider } from "../render3d/terrain/SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../render3d/terrain/SurroundingsProvider.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"

/** What the planter needs of the editor it stands in, read at every use. */
export interface SurroundingsPlanterHost {
  /** The decor of the recording now. */
  decor(): readonly DecorObject[]
  /** Puts this decor in place of the recording's: a new array, never the old one changed (see SceneRenderer.setDecor). */
  setDecor(decor: DecorObject[]): void
  /** The name a decor object of this kind is given, by its number among the recording's: "Tree 12". */
  label(kind: "tree" | "building" | "bridge" | "wire", number: number): string
  /** Says where the scenery came from, among the recording's sources, if it does not already. */
  cite(source: RecordingSource): void
}

/** How the planter finds the survey that covers a place: loaded when it is first needed, since most readers never ask. */
export type SurroundingsProviderLoader = (lat: number, lng: number) => Promise<SurroundingsProvider | undefined>

export interface SurroundingsPlanterOptions {
  /** How long a place stays unchanged before the survey is asked about it: typing coordinates is a place after every digit. */
  debounceMs?: number
  /** How far round the observer the survey is asked. */
  radiusM?: number
}

/**
 * Puts the trees, the buildings, the bridges and the electric lines of a place into the decor, by itself, when an author gives the recording a place.
 *
 * Not on a button: the scenery round a place is a fact about the place, the author's own words about it are the recording,
 * and asking for the one every time the other is said is a chore nobody should have. So when the place is set or moved, the
 * survey that covers it (see SurroundingsProvider) is asked for what stands within a hundred metres, and each tree, building, bridge
 * and span of electric line goes into the decor at its measured place, height and width.
 *
 * What it takes care not to do is as much of the design as what it does:
 *
 * - It never acts on a recording that was loaded. Its place is somebody's, and so is the scenery they placed there: only a
 *   place the author gives, in the editor, is a question (see `placeLoaded`, which says where a loaded recording stands so
 *   that moving it by a few metres afterwards is not taken for another place).
 * - It never touches what the author placed. What it plants carries the id of its survey (see DecorObject.origin), which is
 *   how a new place replaces the scenery of the old one and not the author's, and how an author who has placed trees of
 *   their own is left with exactly those: of each kind (trees, buildings, bridges, lines) nothing is planted where the author
 *   already put some.
 * - It says the scenery is of the day of the survey. A recording is of some other day, and what it plants is a suggestion.
 * - It says nothing where there is no survey: most places in the world have none, and a recording without one is exactly
 *   what a recording was before this existed.
 */
export class SurroundingsPlanter {
  /** About ten metres is a typo or a nudge on a map; this is a different place. */
  private static readonly SAME_PLACE_M = 25
  private static readonly METRES_PER_DEGREE = 111320
  private static readonly DEFAULT_RADIUS_M = 100
  private static readonly DEFAULT_DEBOUNCE_MS = 800
  /** A building about three metres a floor, the common height of one. */
  private static readonly FLOOR_HEIGHT_M = 3

  private messages: SightingEditorMessages
  private readonly debounceMs: number
  private readonly radiusM: number
  /** Whether a place the author gives is asked about at all: the author's choice, kept by the editor (see setEnabled). */
  private enabled = true
  private surveyedFor?: { lat: number, lng: number }
  private timer?: ReturnType<typeof setTimeout>
  private token = 0

  constructor(
    private readonly status: HTMLElement,
    private readonly host: SurroundingsPlanterHost,
    messages: SightingEditorMessages,
    private readonly loadProvider: SurroundingsProviderLoader,
    options: SurroundingsPlanterOptions = {}
  ) {
    this.messages = messages
    this.debounceMs = options.debounceMs ?? SurroundingsPlanter.DEFAULT_DEBOUNCE_MS
    this.radiusM = options.radiusM ?? SurroundingsPlanter.DEFAULT_RADIUS_M
  }

  setMessages(messages: SightingEditorMessages): void {
    this.messages = messages
  }

  /**
   * The author turns the asking on or off (choosing a survey, or none). Turned off, a place that is given is not asked about, and what was
   * planted stays where it is. Turned on again, nothing is asked until a place is given or `survey` is called.
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return
    this.enabled = enabled
    if (!enabled) this.cancel()
  }

  /**
   * Takes away what a survey brought, and says nothing more: choosing no survey at all means the scenery is the author's alone, so what came
   * from one goes, and what the author placed stays. One step of the history, which puts it back.
   */
  withdraw(): void {
    this.cancel()
    this.withdrawPlanted()
    this.say("")
  }

  /** A recording was loaded, or replaced, and stands here: nothing is asked, and what it says about its scenery is its own. */
  placeLoaded(lat: number | undefined, lng: number | undefined): void {
    this.cancel()
    this.surveyedFor = lat !== undefined && lng !== undefined ? { lat, lng } : undefined
    this.say("")
  }

  /** The author set the place, or moved it: asked about once it has stayed where it is for a moment, and not at all if it is still the same place. */
  placeChanged(lat: number | undefined, lng: number | undefined): void {
    if (!this.enabled || lat === undefined || lng === undefined) return
    if (this.surveyedFor && this.isSamePlace(this.surveyedFor, lat, lng)) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.survey(lat, lng), this.debounceMs)
  }

  /** Asks now. The answer of an earlier question that comes after a later one is dropped. */
  async survey(lat: number, lng: number): Promise<void> {
    const token = ++this.token
    this.surveyedFor = { lat, lng }
    try {
      const provider = await this.loadProvider(lat, lng)
      if (token !== this.token) return
      if (provider === undefined) {
        // Nothing covers this place, and what an earlier place put here describes somewhere else.
        this.withdrawPlanted()
        this.say("")
        return
      }
      this.say(this.messages.surveyBusy)
      const found = await provider.getSurroundings({ lat, lng }, this.radiusM)
      if (token !== this.token) return
      this.plant(provider, found)
    } catch (error) {
      if (token !== this.token) return
      if (error instanceof SurroundingsUnavailableError && error.reason === "no-coverage") {
        this.withdrawPlanted()
        this.say("")
      } else {
        this.say(this.messages.surveyUnreachable)
      }
    }
  }

  private cancel(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.token++
  }

  /** The recording's decor without anything a survey put there: what the author placed. */
  private withoutPlanted(): DecorObject[] {
    return this.host.decor().filter(object => object.origin === undefined)
  }

  private withdrawPlanted(): void {
    if (this.host.decor().some(object => object.origin !== undefined)) this.host.setDecor(this.withoutPlanted())
  }

  private plant(provider: SurroundingsProvider, found: Surroundings): void {
    const kept = this.withoutPlanted()
    const handTrees = kept.some(object => object.kind === "tree")
    const handBuildings = kept.some(object => object.kind === "building")
    const handBridges = kept.some(object => object.kind === "bridge")
    const handWires = kept.some(object => object.kind === "wire")
    const taken = new Set(kept.map(object => object.id))
    const nextId = (): string => {
      let id: string
      do id = `${provider.id}-${++this.serial}`; while (taken.has(id))
      taken.add(id)
      return id
    }
    this.serial = 0
    let trees = kept.filter(object => object.kind === "tree").length
    let buildings = kept.filter(object => object.kind === "building").length
    let bridges = kept.filter(object => object.kind === "bridge").length
    let wires = kept.filter(object => object.kind === "wire").length
    const planted: DecorObject[] = []
    // What a survey names is called by its name (the town hall), the parts of it after the first numbered ("Mairie de Saint-Lô (2)"); what it does not is "Building 12".
    const names = new Set(kept.map(object => typeof object.title === "string" ? object.title : ""))
    const titled = (name: string | undefined, fallback: () => string): string => {
      const wanted = name ?? fallback()
      let title = wanted
      for (let n = 2; names.has(title); n++) title = `${wanted} (${n})`
      names.add(title)
      return title
    }
    if (!handTrees) {
      for (const tree of found.trees) {
        planted.push({
          id: nextId(), kind: "tree", title: titled(undefined, () => this.host.label("tree", ++trees)), eastM: tree.eastM, northM: tree.northM, headingDeg: 0, lit: false,
          sizeM: { widthM: tree.widthM, lengthM: tree.widthM, heightM: tree.heightM }, origin: provider.id
        })
      }
    }
    if (!handBuildings) {
      for (const building of found.buildings) {
        planted.push({
          id: nextId(), kind: "building", title: titled(building.name, () => this.host.label("building", ++buildings)), eastM: building.eastM, northM: building.northM,
          headingDeg: building.headingDeg, lit: false,
          sizeM: { widthM: building.widthM, lengthM: building.lengthM, heightM: building.heightM },
          floors: building.floors ?? Math.max(1, Math.round(building.heightM / SurroundingsPlanter.FLOOR_HEIGHT_M)), origin: provider.id
        })
      }
    }
    if (!handBridges) {
      for (const bridge of found.bridges) {
        planted.push({
          id: nextId(), kind: "bridge", title: titled(bridge.name ? `${this.host.label("bridge", 0).replace(/ 0$/, "")} (${bridge.name})` : undefined, () => this.host.label("bridge", ++bridges)), eastM: bridge.eastM, northM: bridge.northM,
          headingDeg: bridge.headingDeg, lit: false,
          sizeM: { lengthM: bridge.lengthM, widthM: bridge.widthM, heightM: bridge.heightM }, origin: provider.id
        })
      }
    }
    if (!handWires) {
      for (const line of found.lines) {
        planted.push({
          id: nextId(), kind: "wire", title: titled(`${this.host.label("wire", 0).replace(/ 0$/, "")} (${line.voltage})`, () => this.host.label("wire", ++wires)), eastM: line.eastM, northM: line.northM,
          headingDeg: line.headingDeg, lit: false,
          sizeM: { lengthM: line.lengthM, heightM: line.heightM },
          wire: { strands: line.acrossM.map(acrossM => ({ heightM: line.heightM, acrossM })), poles: "both", poleHeightM: line.poleHeightM },
          origin: provider.id
        })
      }
    }
    const count = (kind: DecorObject["kind"]): number => planted.filter(object => object.kind === kind).length
    const handPlaced = handTrees || handBuildings || handBridges || handWires
    if (planted.length > 0 || this.host.decor().length !== kept.length) this.host.setDecor([...kept, ...planted])
    if (planted.length === 0) {
      this.say(handPlaced ? this.messages.surveyKept : this.messages.surveyNone.replace("{radius}", String(this.radiusM)))
      return
    }
    this.host.cite({ title: `${provider.name}, survey of the surroundings`, url: provider.creditUrl, publication: { publisher: provider.name } })
    const done = this.messages.surveyDone
      .replace("{trees}", String(count("tree"))).replace("{buildings}", String(count("building")))
      .replace("{bridges}", String(count("bridge"))).replace("{lines}", String(count("wire"))).replace("{source}", provider.name)
    this.say(handPlaced ? `${done} ${this.messages.surveyKept}` : done)
  }

  /** The counter of the ids of one planting, so that each planting numbers its objects from 1 and a replanted tree gets its old id back. */
  private serial = 0

  private isSamePlace(place: { lat: number, lng: number }, lat: number, lng: number): boolean {
    const north = (place.lat - lat) * SurroundingsPlanter.METRES_PER_DEGREE
    const east = (place.lng - lng) * SurroundingsPlanter.METRES_PER_DEGREE * Math.cos(lat * Math.PI / 180)
    return Math.hypot(north, east) < SurroundingsPlanter.SAME_PLACE_M
  }

  private say(text: string): void {
    this.status.textContent = text
  }
}
