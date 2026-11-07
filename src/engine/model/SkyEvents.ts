import type { InterpretationJson } from "../interpretation/Interpretation.js"
import type { BeamJson } from "../../modules/sky-events/beams/LaserBeam.js"
import type { LaunchJson } from "../../modules/sky-events/launches/LaunchPlume.js"
import type { ReentryJson } from "../../modules/sky-events/reentries/Reentry.js"

/**
 * What happened in the sky while the recording runs, as facts: a laser shot across a city, a rocket's launch, a re-entry. Each was there
 * whether anybody saw it or not, and whether or not anyone relates it to what an observer saw.
 *
 * Neither decor nor interpretation. The decor is what stands round the observer and outlasts the observation (a house, a tree); these are
 * transient. The interpretation is the physical reading of the account (what the observer saw was a craft of this size there), and a fact
 * the account may or may not be about is not a reading of it. The satellites, the air traffic and the recorded fireballs are facts of the
 * same kind, which the scene finds in archives rather than in the recording.
 */
export interface SkyEventsJson {
  /** Beams of light sent through the air from the ground: a laser, a searchlight — see BeamJson. */
  beams?: BeamJson[]
  /** Rocket launches, whose exhaust shows lit by a Sun the ground no longer sees — see LaunchJson. */
  launches?: LaunchJson[]
  /** Re-entries: placed on the Earth, not round the observer — see ReentryJson. */
  reentries?: ReentryJson[]
  /** The events of a kind a module brings (see SkyEventKind), under that kind's key: each with an `id` of its own. */
  [kind: string]: unknown[] | undefined
}

/** Where a recording states its events of the sky, and what was stated of them before they had a place of their own. */
export class SkyEvents {
  /** The kinds an interpretation held before the events of the sky had a place of their own: the only ones read from there. */
  private static readonly KINDS = ["beams", "launches", "reentries"] as const

  /** The kinds `events` states something of, built-in or brought by a module, in the order it states them. */
  private static statedKinds(events: SkyEventsJson | undefined): string[] {
    return Object.keys(events ?? {}).filter(kind => Array.isArray(events![kind]) && events![kind]!.length > 0)
  }

  /** Whether `events` states none. */
  static isEmpty(events: SkyEventsJson | undefined): boolean {
    return SkyEvents.statedKinds(events).length === 0
  }

  /** `events` with the kinds that state nothing left out, or undefined where none states anything: what a file is written with. A kind no
   * module of this page knows is written back as it was read: dropping it would be an edit nobody made. */
  static written(events: SkyEventsJson | undefined): SkyEventsJson | undefined {
    const kinds = SkyEvents.statedKinds(events)
    if (kinds.length === 0) return undefined
    const written: SkyEventsJson = {}
    for (const kind of kinds) written[kind] = events![kind]
    return written
  }

  /**
   * The events of a recording and its interpretation, as a file states them: its own `skyEvents`, and those its interpretation held, which
   * is where a recording wrote them until they had a place of their own; and the interpretation without them, undefined where nothing of it
   * is left.
   */
  static read(stated: SkyEventsJson | undefined, interpretation: InterpretationJson | undefined): { skyEvents?: SkyEventsJson, interpretation?: InterpretationJson } {
    const legacy = interpretation as (InterpretationJson & SkyEventsJson) | undefined
    const events: SkyEventsJson = {}
    for (const kind of SkyEvents.statedKinds(stated)) events[kind] = stated![kind]
    for (const kind of SkyEvents.KINDS) {
      const merged = [...(stated?.[kind] ?? []), ...(legacy?.[kind] ?? [])]
      if (merged.length > 0) (events as Record<string, unknown>)[kind] = merged
    }
    let reading: InterpretationJson | undefined = interpretation
    if (legacy && SkyEvents.KINDS.some(kind => kind in legacy)) {
      const { beams: _beams, launches: _launches, reentries: _reentries, ...rest } = legacy
      reading = SkyEvents.isReading(rest) ? rest : undefined
    }
    return { skyEvents: SkyEvents.written(events), interpretation: reading }
  }

  /** Whether an interpretation states anything once its events are taken out: a body, a title, a smoke. */
  private static isReading(interpretation: InterpretationJson): boolean {
    return (interpretation.bodies?.length ?? 0) > 0 || interpretation.title !== undefined || (interpretation.smoke?.length ?? 0) > 0
  }
}
