import type { Sighting } from "../model/Sighting.js"
import type { AppearanceParams, RecordingEventJson } from "./RecordingEvent.js"

/** What an id of the recording says. */
export type ActorKind = "observer" | "shape" | "group" | "body" | "decor"

/** Something that keeps a recording from saying whom its events are about. */
export interface ActorIssue {
  /** Two things of the recording have the same id; or an event's `who` is the id of nothing. */
  kind: "duplicate-id" | "unknown-who"
  id: string
  /** Where, as dot-joined keys and array indices ("events.3.who"), for an event; what has the id ("shape", "body"…), for a duplicate. */
  path: string
}

/**
 * Whom the events of a recording are about (see RecordingEventJson.who): every one by an id, of one namespace that the observer, the
 * account's shapes and their groups, the interpretation's bodies and the decor share, so that an id says one thing only, and several
 * phenomena, or a part of one, can each be the subject of an event.
 *
 * Read with defaults (an event that says none is the observer's, see fromSightingJson); checked before it is written (see issues), since a
 * `who` that says nothing, or two things of one id, would be read back as something else than what was meant.
 */
export class RecordingActors {
  /** The id of an observer that has none of their own. */
  static readonly ANONYMOUS_OBSERVER = "observer"

  /** The observer's id: theirs, or ANONYMOUS_OBSERVER. */
  static observerId(sighting: Sighting): string {
    return sighting.observer?.id ?? RecordingActors.ANONYMOUS_OBSERVER
  }

  /** The account's shapes: drawn, or that the events draw. */
  static shapeIds(sighting: Sighting): string[] {
    const ids = new Set(sighting.timeline.sourceIds)
    for (const event of sighting.events ?? []) {
      if (event.eventType !== "appearance") continue
      for (const part of (event.params as unknown as AppearanceParams | undefined)?.parts ?? []) ids.add(part.sourceId)
    }
    return [...ids]
  }

  /** Every id of the recording, with what it says (several things for an id used twice). */
  static ids(sighting: Sighting): Map<string, ActorKind[]> {
    const ids = new Map<string, ActorKind[]>()
    const add = (id: string | undefined, kind: ActorKind) => {
      if (id === undefined) return
      ids.set(id, [...ids.get(id) ?? [], kind])
    }
    add(RecordingActors.observerId(sighting), "observer")
    for (const id of RecordingActors.shapeIds(sighting)) add(id, "shape")
    for (const group of sighting.timeline.allGroups) add(group.id, "group")
    for (const body of sighting.interpretation?.bodies ?? []) add(body.id, "body")
    for (const object of sighting.decor) add(object.id, "decor")
    return ids
  }

  /** What `id` says, when it says one thing. */
  static kindOf(sighting: Sighting, id: string | undefined): ActorKind | undefined {
    if (id === undefined) return undefined
    const kinds = RecordingActors.ids(sighting).get(id)
    return kinds?.length === 1 ? kinds[0] : undefined
  }

  /**
   * The body and the part of its model an event is about, when its `who` names one: "craft/legs" the node `legs` of the body `craft`'s
   * model, "etre-2/head" a bone of its skeleton. Which parts a model has, its file says (see BodyKeyframe.turns).
   */
  static partOf(who: string | undefined): { element: string, part: string } | undefined {
    const at = who?.indexOf("/") ?? -1
    if (who === undefined || at <= 0 || at === who.length - 1) return undefined
    return { element: who.slice(0, at), part: who.slice(at + 1) }
  }

  /** Whether `event` is the observer's. */
  static isObserver(sighting: Sighting, event: RecordingEventJson): boolean {
    return event.who === RecordingActors.observerId(sighting)
  }

  /** Whether `event` is about the account's shapes: one, or a group of them. */
  static isPhenomenon(sighting: Sighting, event: RecordingEventJson): boolean {
    if (event.who === undefined) return false
    return sighting.timeline.groupOf(event.who) !== undefined || RecordingActors.shapeIds(sighting).includes(event.who)
  }

  /** The ids `who` holds, itself included: a group's members, theirs, and so on; a shape's, a body's… itself. */
  static within(sighting: Sighting, who: string): Set<string> {
    const ids = new Set<string>([who])
    const add = (id: string) => {
      for (const member of sighting.timeline.groupOf(id)?.members ?? []) {
        if (ids.has(member)) continue
        ids.add(member)
        add(member)
      }
    }
    add(who)
    return ids
  }

  /** Says `to` wherever the recording's events said `from`: what an id renamed takes with it. */
  static renamed(sighting: Sighting, from: string, to: string): void {
    if (from === to) return
    for (const event of sighting.events ?? []) if (event.who === from) event.who = to
  }

  /** What keeps the recording from being written as it is: an id of two things, an event about nothing. */
  static issues(sighting: Sighting): ActorIssue[] {
    const issues: ActorIssue[] = []
    const ids = RecordingActors.ids(sighting)
    for (const [id, kinds] of ids) if (kinds.length > 1) issues.push({ kind: "duplicate-id", id, path: kinds.join(", ") })
    ;(sighting.events ?? []).forEach((event, index) => {
      // A part of a body: of a body there is; which parts its model has, only its file says.
      const part = RecordingActors.partOf(event.who)
      if (part && ids.get(part.element)?.length === 1 && ids.get(part.element)![0] === "body") return
      if (event.who === undefined || !ids.has(event.who)) issues.push({ kind: "unknown-who", id: event.who ?? "", path: `events.${index}.who` })
    })
    return issues
  }
}
