import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_en: EventsMessages = {
  title: "Observer's events",
  phenomenonTitle: "Phenomenon's events",
  bodyTitle: "Events of {body}",
  derivedNote: "The observer's poses are worked out from these events. Moving the observer or turning their gaze by hand writes poses of your own, which win over them.",
  overriddenNote: "This recording's own poses win over its events.",
  derivedShapesNote: "The account's shapes are worked out from what the phenomenon did. Drawing them by hand writes shapes of your own, which win over these events.",
  overriddenShapesNote: "This recording's own shapes win over the phenomenon's events.",
  parts: "{n} parts",
  who: "Subject",
  part: "Part",
  partHint: "A node, a bone or a light of its model (legs, head, front-red), or a group of its parts (rear): it alone, the rest of the body as it is",
  wholeBody: "the whole body",
  derivedBodiesNote: "These bodies' keyframes are worked out from what they did. Keyframes set by hand win over these events.",
  overriddenBodiesNote: "Keyframes of its own win over these events.",
  add: "Add an event", remove: "Remove the event", none: "No event",
  resetToEvents: "Back to the events",
  kinds: { drive: "Drives", lookAhead: "Looks down the road", lean: "Leans", watch: "Watches in the mirror", stand: "Stands", look: "Looks at", appearance: "Looks like", walk: "Walks", follow: "Follows with the eyes", blink: "Blinks", vanish: "Is lost", motion: "Moves", spin: "Turns", rise: "Rises", ride: "Rides in", turn: "Turns", light: "Light", travel: "Crosses the sky" },
  params: {
    vehicle: "Vehicle", path: "Route", speeds: "Speeds", speedDivisors: "Speeds divided by", through: "Goes through", eye: "Eye in the vehicle",
    fovDeg: "Field of view", target: "Watching", pitchShare: "Looks up to (share of its height)", keepDeg: "Keeps it within", glanceBeyondDeg: "Glances beyond",
    glanceS: "Glance", roadS: "Back on the road", offsetM: "Moves the eye by", holdS: "For", turnS: "In", mirror: "Mirror", firstS: "First",
    mirrorS: "In the mirror", glancesUntil: "Glances at it until",
    place: "Where", metres: "Size (width, height above the eye)", parts: "Parts", onS: "On", offS: "Off", off: "Off, it is", motion: "Movement", turnsPerS: "Turns a second", distanceM: "Distance", angleDeg: "Off the vertical", stops: "Stops", in: "In", aboveM: "Above it", from: "From", to: "To", headingDeg: "Heading", pitchDeg: "Tilt", cdM2: "Luminance", towards: "Towards", sizeDeg: "Size at the zenith", sizeBy: "Size by", byDeg: "By", side: "Side", seenFrom: "Seen from", reactionS: "Reacts after", lagS: "Behind it by"
  },
  from: "from",
  to: "to",
  points: "{n} points",
  at: "at",
  basis: { stated: "stated", derived: "derived", assumed: "assumed", measured: "measured" }
}
