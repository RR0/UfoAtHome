import type { DecorObject } from "../engine/model/Decor.js"
import type { RecordingSource } from "../engine/model/RecordingSource.js"
import type { Surroundings, SurroundingsProvider, SurveyCredit } from "../render3d/terrain/SurroundingsProvider.js"
import { SurroundingsCorridor } from "../render3d/terrain/SurroundingsCorridor.js"
import { SurveyedDecor } from "../render3d/terrain/SurveyedDecor.js"
import type { SurveyedKind } from "../render3d/terrain/SurveyedDecor.js"
import { SurroundingsUnavailableError } from "../render3d/terrain/SurroundingsProvider.js"
import type { SightingEditorMessages } from "./messages/SightingEditorMessages.js"

/** What the planter needs of the editor it stands in, read at every use. */
export interface SurroundingsPlanterHost {
  /** The decor of the recording now. */
  decor(): readonly DecorObject[]
  /** Puts this decor in place of the recording's: a new array, never the old one changed (see SceneRenderer.setDecor). */
  setDecor(decor: DecorObject[]): void
  /** What a kind of decor is called, in the language of the editor: "Tree", "Bridge", "Overhead line". */
  kindName(kind: SurveyedKind): string
  /** The places the observer goes through, in order, if they move: the survey is asked round each of them, and not only round where they set off. */
  track?(): readonly { lat: number, lng: number }[]
  /**
   * Where the decor is measured from now: where the recording sets off. A survey asked round another place (the author walked on while it was being
   * answered, see walked) is planted from there.
   */
  centre?(): { lat: number, lng: number } | undefined
  /** Tells the reader the scenery is being looked up (true, with what to say) or is not any more (false): a spinner over the picture. */
  busy(on: boolean, label: string): void
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
  /** The trees kept of each place along a path: a long path is many places, and a scene of thousands of trees is not drawn at the pace of a recording. */
  private static readonly TREES_PER_STOP = 80
  /**
   * How far ahead of a walking observer the survey is asked, in seconds of their walking and at least in a share of the radius asked: what is ahead
   * is there before they come to it. Nothing is asked again round a place within half a radius of one already asked about.
   */
  private static readonly WALK_LEAD_S = 4
  private static readonly WALK_LEAD_SHARE = 0.6
  /** How near another of its kind something a survey brings again is the same: a building is that far, and of about the same size, and the rest closer. */
  private static readonly SAME_BUILDING_M = 3
  private static readonly SAME_OBJECT_M = 1.5

  private messages: SightingEditorMessages
  private readonly debounceMs: number
  private radiusM: number
  /** Whether a place the author gives is asked about at all: the author's choice, kept by the editor (see setEnabled). */
  private enabled = true
  private surveyedFor?: { lat: number, lng: number }
  private timer?: ReturnType<typeof setTimeout>
  private token = 0
  /** What the last survey said it brought, which the line about what comes late follows. */
  private surveyed = ""
  /** What it said of the furniture of the streets that came in time, and whose it was: said again, with the rest, when the rest comes. */
  private furnitureSaid = ""
  private furnitureCredits: SurveyCredit[] = []
  /** Where the survey was asked round since the place was given, and how the observer walks (see walked). */
  private asked: { lat: number, lng: number }[] = []
  private lastStep?: { lat: number, lng: number, atMs: number }
  private walkSpeedMps = 0

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

  /**
   * The author widened or narrowed what is asked about: the survey is asked again for the same place, once the number has stayed where it is for a moment
   * (typing "1500" is a radius of 1, of 15 and of 150 on the way). Nothing is asked while no survey is chosen.
   */
  radiusChanged(radiusM: number, lat: number | undefined, lng: number | undefined): void {
    if (radiusM === this.radiusM) return
    this.radiusM = radiusM
    if (!this.enabled || lat === undefined || lng === undefined) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.survey(lat, lng), this.debounceMs)
  }

  /** The author set the place, or moved it: asked about once it has stayed where it is for a moment, and not at all if it is still the same place. */
  placeChanged(lat: number | undefined, lng: number | undefined): void {
    if (!this.enabled || lat === undefined || lng === undefined) return
    if (this.surveyedFor && this.isSamePlace(this.surveyedFor, lat, lng)) return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.survey(lat, lng), this.debounceMs)
  }

  /**
   * The observer took a step, or many (see SightingEditorElement.walkOrTurn), to (lat, lng), heading `headingDeg`: that is no other place, whose
   * scenery would replace this one's behind a spinner the moment they stop, but more of the same ground. So nothing is replaced; what stands ahead
   * of them, where they will be in a few seconds at the pace they go, is asked about in the background, without a word, and what it brings that is
   * not already there is added.
   */
  walked(lat: number, lng: number, headingDeg: number, nowMs = Date.now()): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.surveyedFor = { lat, lng }
    if (this.lastStep) {
      const seconds = (nowMs - this.lastStep.atMs) / 1000
      const metres = this.metresBetween(this.lastStep, lat, lng)
      // A pause between two steps is a walk set off again, not a slow one.
      this.walkSpeedMps = seconds > 0 && seconds < 2 ? 0.5 * this.walkSpeedMps + 0.5 * metres / seconds : 0
    }
    this.lastStep = { lat, lng, atMs: nowMs }
    if (!this.enabled) return
    // Never further than a radius: what is asked then still meets the ground already there, whatever pace two steps a millisecond apart
    // seem to say.
    const lead = Math.min(this.radiusM,
      Math.max(this.radiusM * SurroundingsPlanter.WALK_LEAD_SHARE, this.walkSpeedMps * SurroundingsPlanter.WALK_LEAD_S))
    const heading = headingDeg * Math.PI / 180
    const ahead = {
      lat: lat + Math.cos(heading) * lead / SurroundingsPlanter.METRES_PER_DEGREE,
      lng: lng + Math.sin(heading) * lead / (SurroundingsPlanter.METRES_PER_DEGREE * Math.cos(lat * Math.PI / 180))
    }
    if (this.asked.some(place => this.metresBetween(place, ahead.lat, ahead.lng) < this.radiusM / 2)) return
    this.asked.push(ahead)
    void this.plantAhead(ahead)
  }

  private async plantAhead(stop: { lat: number, lng: number }): Promise<void> {
    const token = this.token
    try {
      const provider = await this.loadProvider(stop.lat, stop.lng)
      if (!provider || token !== this.token) return
      const found = await provider.getSurroundings(stop, this.radiusM)
      if (token !== this.token) return
      this.addAhead(provider, this.fromCentre(found, stop))
      const late = found.incomplete ? provider.later?.(stop, this.radiusM) : undefined
      late?.then(more => {
        if (token === this.token) this.addAhead(provider, this.fromCentre({ trees: [], buildings: [], bridges: [], lines: [], ...more }, stop))
      }, () => undefined)
    } catch {
      // Ahead of the observer, and asked again when they come nearer to somewhere not asked about: nothing to tell.
      this.asked = this.asked.filter(place => place !== stop)
    }
  }

  /** What a survey of more of the same ground brought that is not there already, added to the decor: nothing taken away. */
  private addAhead(provider: SurroundingsProvider, found: Surroundings): void {
    const decor = this.host.decor()
    const kept = decor.filter(object => object.origin === undefined)
    const others = decor.filter(object => object.origin !== undefined)
    const { planted } = SurveyedDecor.of(provider.id, found, { kept, others, kindName: kind => this.host.kindName(kind) })
    const fresh = planted.filter(object => !others.some(other => SurroundingsPlanter.same(other, object)))
    if (fresh.length > 0) this.host.setDecor([...decor, ...fresh])
  }

  /** Whether two objects a survey brought are the same one, brought again from another place: see SAME_BUILDING_M. */
  private static same(a: DecorObject, b: DecorObject): boolean {
    if (a.kind !== b.kind) return false
    const apart = Math.hypot(a.eastM - b.eastM, a.northM - b.northM)
    if (a.kind !== "building") return apart < SurroundingsPlanter.SAME_OBJECT_M
    const size = (object: DecorObject) => [object.sizeM?.widthM ?? 0, object.sizeM?.lengthM ?? 0]
    return apart < SurroundingsPlanter.SAME_BUILDING_M && size(a).every((value, i) => Math.abs(value - size(b)[i]) < 1.5)
  }

  /** A survey asked round `asked`, measured from where the decor is measured from now (see SurroundingsPlanterHost.centre). */
  private fromCentre<T extends Partial<Surroundings>>(found: T, asked: { lat: number, lng: number }): T {
    const centre = this.host.centre?.()
    if (!centre) return found
    const east = (asked.lng - centre.lng) * SurroundingsPlanter.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180)
    const north = (asked.lat - centre.lat) * SurroundingsPlanter.METRES_PER_DEGREE
    if (Math.hypot(east, north) < 0.01) return found
    const moved = <O extends { eastM: number, northM: number }>(objects: O[] | undefined): O[] | undefined =>
      objects?.map(object => ({ ...object, eastM: Math.round((object.eastM + east) * 100) / 100, northM: Math.round((object.northM + north) * 100) / 100 }))
    return {
      ...found,
      ...(found.trees ? { trees: moved(found.trees) } : {}), ...(found.buildings ? { buildings: moved(found.buildings) } : {}),
      ...(found.bridges ? { bridges: moved(found.bridges) } : {}), ...(found.lines ? { lines: moved(found.lines) } : {}),
      ...(found.lamps ? { lamps: moved(found.lamps) } : {}), ...(found.signals ? { signals: moved(found.signals) } : {}),
      ...(found.crossings ? { crossings: moved(found.crossings) } : {}), ...(found.signs ? { signs: moved(found.signs) } : {})
    }
  }

  private metresBetween(place: { lat: number, lng: number }, lat: number, lng: number): number {
    const north = (place.lat - lat) * SurroundingsPlanter.METRES_PER_DEGREE
    const east = (place.lng - lng) * SurroundingsPlanter.METRES_PER_DEGREE * Math.cos(lat * Math.PI / 180)
    return Math.hypot(north, east)
  }

  /** Asks now. The answer of an earlier question that comes after a later one is dropped. */
  async survey(lat: number, lng: number): Promise<void> {
    const token = ++this.token
    this.surveyedFor = { lat, lng }
    this.asked = [{ lat, lng }]
    this.lastStep = undefined
    this.host.busy(true, this.messages.surveyBusy)
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
      const stops = SurroundingsCorridor.stops([{ lat, lng }, ...(this.host.track?.() ?? [])], this.radiusM)
      const found = stops.length > 1
        ? await SurroundingsCorridor.fetch(provider, stops, this.radiusM, { treesPerStop: SurroundingsPlanter.TREES_PER_STOP })
        : await provider.getSurroundings({ lat, lng }, this.radiusM)
      if (token !== this.token) return
      this.plant(provider, this.fromCentre(found, { lat, lng }))
      if (found.incomplete) this.awaitLate(provider, stops, token)
    } catch (error) {
      if (token !== this.token) return
      if (error instanceof SurroundingsUnavailableError && error.reason === "no-coverage") {
        this.withdrawPlanted()
        this.say("")
      } else {
        this.say(this.messages.surveyUnreachable)
      }
    } finally {
      // Only the latest question ends the wait: an older one dropped for a newer one leaves the newer one's spinner on.
      if (token === this.token) this.host.busy(false, "")
    }
  }

  private cancel(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.token++
    this.host.busy(false, "")
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
    const { planted, handPlaced } = SurveyedDecor.of(provider.id, found, { kept, kindName: kind => this.host.kindName(kind) })
    const count = (kind: DecorObject["kind"]): number => planted.filter(object => object.kind === kind).length
    if (planted.length > 0 || this.host.decor().length !== kept.length) this.host.setDecor([...kept, ...planted])
    if (planted.length === 0) {
      this.furnitureSaid = ""
      this.surveyed = handPlaced ? this.messages.surveyKept : this.messages.surveyNone.replace("{radius}", String(this.radiusM))
      this.say(this.surveyed, found.incomplete ? this.messages.surveyFurniturePending : "")
      return
    }
    this.host.cite({ title: `${provider.name}, survey of the surroundings`, url: provider.creditUrl, publication: { publisher: provider.name } })
    const done = this.messages.surveyDone
      .replace("{trees}", String(count("tree"))).replace("{buildings}", String(count("building")))
      .replace("{bridges}", String(count("bridge"))).replace("{lines}", String(count("wire"))).replace("{source}", provider.name)
    const dated = this.datesText(found.dates)
    this.surveyed = [done, dated, handPlaced ? this.messages.surveyKept : ""].filter(part => part !== "").join(" ")
    this.citeCredits(found)
    // What came in time is said, and what is still to come after it.
    this.furnitureCredits = found.credits ?? []
    this.furnitureSaid = this.furnitureText(planted, found)
    this.say(this.surveyed, [this.furnitureSaid, found.incomplete ? this.messages.surveyFurniturePending : ""].filter(part => part !== "").join(" "))
  }

  /** Cites, among the recording's sources, what the survey took from others than itself: the volunteers' map, a town's inventory of its lamps. */
  private citeCredits(found: Partial<Surroundings>): void {
    for (const credit of found.credits ?? []) {
      this.host.cite({ title: credit.licence ? `${credit.name} (${credit.licence})` : credit.name, url: credit.url, publication: { publisher: credit.name } })
    }
  }

  /**
   * Waits for what the survey said would come late (the furniture of the streets, from an OpenStreetMap that is often slow or down), and plants it
   * into the decor already planted when it comes, without the author doing anything: one step of the history, the author's own objects untouched,
   * nothing of a kind they placed some of. Dropped if the place changed meanwhile. When the survey gives up for now, the reader is told, and may ask again.
   */
  private awaitLate(provider: SurroundingsProvider, stops: readonly { lat: number, lng: number }[], token: number): void {
    const late = stops.length > 1 ? SurroundingsCorridor.later(provider, stops, this.radiusM) : provider.later?.(stops[0], this.radiusM)
    if (!late) {
      this.say(this.surveyed, "")
      return
    }
    this.say(this.surveyed, [this.furnitureSaid, this.messages.surveyFurniturePending].filter(part => part !== "").join(" "))
    late.then(found => {
      if (token !== this.token) return
      this.plantLate(provider, this.fromCentre(found, stops[0]))
    }, () => {
      if (token !== this.token) return
      this.say(this.surveyed, [this.furnitureSaid, this.messages.surveyFurnitureUnavailable].filter(part => part !== "").join(" "), { label: this.messages.surveyFurnitureRetry, run: () => this.awaitLate(provider, stops, token) })
    })
  }

  private plantLate(provider: SurroundingsProvider, found: Partial<Surroundings>): void {
    const decor = this.host.decor()
    const { planted } = SurveyedDecor.of(provider.id, { trees: [], buildings: [], bridges: [], lines: [], ...found }, { kept: decor, kindName: kind => this.host.kindName(kind) })
    if (planted.length > 0) this.host.setDecor([...decor, ...planted])
    this.citeCredits(found)
    // What came in time keeps being said, beside what came now.
    // One sentence for all the furniture of the place now, what came in time and what came late, each source named once.
    const furniture = decor.filter(object => object.origin === provider.id).concat(planted)
    this.furnitureSaid = this.furnitureText(furniture, { credits: [...this.furnitureCredits, ...(found.credits ?? [])] })
    this.say(this.surveyed, this.furnitureSaid)
  }

  /** The furniture of the streets among what was planted, as a sentence naming where it came from: nothing when there is none. */
  private furnitureText(planted: readonly DecorObject[], found: Partial<Surroundings>): string {
    const count = (kind: DecorObject["kind"]): number => planted.filter(object => object.kind === kind).length
    if (!planted.some(object => object.kind === "streetlight" || object.kind === "trafficlight" || object.kind === "crossing" || object.kind === "roadsign")) return ""
    // Named by the survey, each source once and only for what it gave (a town's inventory, its lamps); the volunteers' map where it says nothing,
    // which is where the furniture of a street came from before towns did.
    const gave = (credit: SurveyCredit) => credit.of === "lamps" ? count("streetlight") > 0 : credit.of === "signals" ? count("trafficlight") > 0 : true
    const names = [...new Set((found.credits ?? []).filter(gave).map(credit => credit.name))]
    const sources = names.join(" + ") || "OpenStreetMap"
    return this.messages.surveyFurnitureDone.replace("{source}", sources)
      .replace("{lamps}", String(count("streetlight"))).replace("{signals}", String(count("trafficlight")))
      .replace("{crossings}", String(count("crossing"))).replace("{signs}", String(count("roadsign")))
  }

  /** What was surveyed and when, as one sentence ("Surveyed: laser 2022-10-07, aerial photo 2026-05-23."): nothing when no service said a day. */
  private datesText(dates: Surroundings["dates"]): string {
    if (!dates) return ""
    const parts = ([["laser", this.messages.surveyLaserLabel], ["photo", this.messages.surveyPhotoLabel], ["map", this.messages.surveyMapLabel], ["lamps", this.messages.surveyLampsLabel]] as const)
      .filter(([key]) => dates[key] !== undefined).map(([key, label]) => `${label} ${dates[key]}`)
    return parts.length > 0 ? this.messages.surveyDated.replace("{dates}", parts.join(", ")) : ""
  }

  private isSamePlace(place: { lat: number, lng: number }, lat: number, lng: number): boolean {
    return this.metresBetween(place, lat, lng) < SurroundingsPlanter.SAME_PLACE_M
  }

  /** The status: what the survey brought, then a line of its own for what comes late, with a button when there is something to do about it. */
  private say(text: string, late = "", action?: { label: string, run: () => void }): void {
    this.status.textContent = [text, late].filter(part => part !== "").join(" ")
    if (!action) return
    const button = this.status.ownerDocument.createElement("button")
    button.type = "button"
    button.className = "scenery-retry"
    button.textContent = action.label
    button.addEventListener("click", action.run)
    this.status.append(" ", button)
  }
}
