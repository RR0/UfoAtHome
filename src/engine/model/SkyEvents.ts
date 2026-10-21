import type { InterpretationJson } from "../interpretation/Interpretation.js"
import type { BeamJson } from "../interpretation/LaserBeam.js"
import type { LaunchJson } from "../interpretation/LaunchPlume.js"
import type { ReentryJson } from "../interpretation/Reentry.js"

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
}

/** Where a recording states its events of the sky, and what was stated of them before they had a place of their own. */
export class SkyEvents {
  private static readonly KINDS = ["beams", "launches", "reentries"] as const

  /** Whether `events` states none. */
  static isEmpty(events: SkyEventsJson | undefined): boolean {
    return !events || SkyEvents.KINDS.every(kind => !events[kind]?.length)
  }

  /** `events` with the kinds that state nothing left out, or undefined where none states anything: what a file is written with. */
  static written(events: SkyEventsJson | undefined): SkyEventsJson | undefined {
    if (SkyEvents.isEmpty(events)) return undefined
    const written: SkyEventsJson = {}
    for (const kind of SkyEvents.KINDS) if (events![kind]?.length) (written as Record<string, unknown>)[kind] = events![kind]
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
