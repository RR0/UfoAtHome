/**
 * Converts between this engine's plain SightingEvent/SightingTime/
 * SightingLocation (see engine/model/Sighting.ts) and the real @rr0/data /
 * @rr0/time / @rr0/place classes, for Node-side tooling (e.g. a future
 * script generating a case's sighting.json from its RR0Event, or importing
 * one into the widget).
 *
 * Deliberately NOT imported by the Web Component or the demo entry point —
 * @rr0/data's single "./dist/index.js" export barrel drags in Node-only
 * file-scanning factories (glob/path-scurry/minipass, real fs.realpathSync
 * calls) that have no browser equivalent. Keeping this module out of that
 * import graph is what lets `vite build` produce a self-contained browser
 * bundle at all. See engine/model/Sighting.ts for the full rationale.
 */
import { RR0Event } from "@rr0/data"
import { Level2Date } from "@rr0/time"
import { Place, PlaceLocation } from "@rr0/place"
import type { SightingEvent, SightingLocation, SightingTime } from "../model/Sighting.js"

export function toLevel2Date(time: SightingTime): Level2Date {
  // Level2DateSpec requires `year` (unlike month/day/hour/minute/second, which are optional);
  // a SightingTime with no year at all is a degenerate case not expected in practice.
  return new Level2Date({ ...time, year: time.year as number })
}

export function fromLevel2Date(date: Level2Date): SightingTime {
  return {
    year: date.year?.value,
    month: date.month?.value,
    day: date.day?.value,
    hour: date.hour?.value,
    minute: date.minute?.value,
    second: date.second?.value
  }
}

export function toPlace(locations: SightingLocation[]): Place {
  return new Place(locations.map(({ lat, lng }) => new PlaceLocation(lat, lng)))
}

export function fromPlace(place: Place): SightingLocation[] {
  return place.locations.map(location => ({ lat: location.lat, lng: location.lng }))
}

export function toRR0Event(event: SightingEvent): RR0Event<"sighting"> {
  const rr0Event = new RR0Event<"sighting">("sighting", event.time ? toLevel2Date(event.time) : undefined)
  rr0Event.place = event.place ? toPlace(event.place) : undefined
  rr0Event.description = event.description
  rr0Event.tags = event.tags
  return rr0Event
}

export function fromRR0Event(rr0Event: RR0Event<"sighting">): SightingEvent {
  return {
    eventType: "sighting",
    time: rr0Event.time ? fromLevel2Date(rr0Event.time) : undefined,
    place: rr0Event.place ? fromPlace(rr0Event.place) : undefined,
    description: rr0Event.description,
    tags: rr0Event.tags
  }
}
