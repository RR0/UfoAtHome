import type { Sighting } from "../model/Sighting.js"
import type { Basis } from "../persistence/Provenance.js"
import { BodyPlacement, type Ground } from "../interpretation/BodyPlacement.js"
import { ShapeDistance } from "./ShapeDistance.js"

/** How close the phenomenon came, and what that rests on. */
export interface Approach {
  /** The nearest it came to the observer's eye, metres. */
  m: number
  /** Derived from the observer's own walk; assumed when it is the interpretation's placing of it. */
  basis: Basis
  paths: string[]
}

/**
 * How close the phenomenon came to the observer, from what the recording holds, for a scheme whose class or factor turns on it (a close
 * encounter: Hynek's, Ballester-Guasp's).
 *
 * First from the account itself: the observer walking towards it while its apparent size grew (see ShapeDistance), which is derived.
 * Failing that, from the interpretation the recording holds: where its bodies that explain the phenomena stand against the observer's
 * eye. That is somebody's reading of the account, not the account, so it is an assumption, and said to be one.
 */
export class NearestApproach {
  /** The ground the interpretation's bodies are measured on without the relief: flat, at the observer's own height. A distance of tens
   * of metres moves by centimetres with the relief under it. */
  private static readonly FLAT: Ground = { heightAt: () => 0 }

  static of(sighting: Sighting): Approach | undefined {
    const walked = sighting.timeline.sourceIds
      .map(sourceId => ShapeDistance.of(sighting, sourceId)?.nearestM)
      .filter((m): m is number => m !== undefined)
    if (walked.length > 0) return { m: Math.min(...walked), basis: "derived", paths: ["timeline", "observerTrack"] }
    return NearestApproach.interpreted(sighting)
  }

  /**
   * The nearest a body of the interpretation that explains a phenomenon came, at each instant its track states. Where none says what it
   * explains (an account of a landing the observer drew nothing of: Trans-en-Provence), its bodies are what was seen, all of them.
   */
  private static interpreted(sighting: Sighting): Approach | undefined {
    const all = (sighting.interpretation?.bodies ?? []).map((body, index) => ({ body, index })).filter(({ body }) => Array.isArray(body.track))
    const explaining = all.filter(({ body }) => (body.explains?.length ?? 0) > 0)
    const bodies = explaining.length > 0 ? explaining : all
    const ground = NearestApproach.FLAT
    const eyeAt = (t: number) => BodyPlacement.eyeOf(sighting, t, ground)
    let nearest: number | undefined
    const paths: string[] = []
    for (const { body, index } of bodies) {
      const placement = new BodyPlacement(body, ground, eyeAt)
      for (const { t } of body.track) {
        const state = placement.at(t)
        const eye = eyeAt(t)
        if (!state || !eye) continue
        const m = Math.hypot(state.eastM - eye.eastM, state.northM - eye.northM, state.upM - eye.upM)
        if (nearest === undefined || m < nearest) nearest = m
      }
      paths.push(`interpretation.bodies.${index}`)
    }
    return nearest === undefined ? undefined : { m: nearest, basis: "assumed", paths }
  }
}
