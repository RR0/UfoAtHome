import { Sighting } from "../model/Sighting.js"
import type { SightingLocation, SightingTime } from "../model/Sighting.js"
import { Timeline } from "../model/Timeline.js"
import type { TimelineJson } from "../model/Timeline.js"

/**
 * Standalone "one JSON file per case" format (e.g. a future sighting.json
 * sitting next to the existing case.json/people.json), not merged into
 * case.json's own schema.
 */
export interface SightingRecordingJson {
  version: 1
  time?: SightingTime
  place?: SightingLocation[]
  witnessId?: string
  timeline: TimelineJson
}

export function toSightingJson(sighting: Sighting): SightingRecordingJson {
  return {
    version: 1,
    time: sighting.event.time,
    place: sighting.event.place,
    witnessId: sighting.witnessId,
    timeline: sighting.timeline.toJSON()
  }
}

export function fromSightingJson(json: SightingRecordingJson): Sighting {
  return new Sighting(
    { eventType: "sighting", time: json.time, place: json.place },
    Timeline.fromJSON(json.timeline),
    json.witnessId
  )
}
