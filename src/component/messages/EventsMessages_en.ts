import type { EventsMessages } from "./EventsMessages.js"

export const eventsMessages_en: EventsMessages = {
  title: "Events",
  derivedNote: "The observer's poses are worked out from these events. Moving the observer or turning their gaze by hand writes poses of your own, which win over them.",
  overriddenNote: "This recording's own poses win over its events.",
  resetToEvents: "Back to the events",
  kinds: { drive: "Drives", lookAhead: "Looks down the road", lean: "Leans", watch: "Watches in the mirror" },
  params: {
    vehicle: "Vehicle", path: "Route", speeds: "Speeds", speedDivisors: "Speeds divided by", through: "Goes through", eye: "Eye in the vehicle",
    fovDeg: "Field of view", target: "Watching", pitchShare: "Looks up to (share of its height)", keepDeg: "Keeps it within", glanceBeyondDeg: "Glances beyond",
    glanceS: "Glance", roadS: "Back on the road", offsetM: "Moves the eye by", holdS: "For", turnS: "In", mirror: "Mirror", firstS: "First",
    mirrorS: "In the mirror", glancesUntil: "Glances at it until"
  },
  from: "from",
  to: "to",
  points: "{n} points",
  at: "at",
  basis: { stated: "stated", derived: "derived", assumed: "assumed", measured: "measured" }
}
