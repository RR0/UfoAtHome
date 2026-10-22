import type { WitnessErrorMessages } from "./WitnessErrorMessages.js"

export const witnessErrorMessages_en: WitnessErrorMessages = {
  "basisTitle": "How this value was obtained",
  "basisField": "Basis",
  "howField": "How",
  "rationaleField": "Why",
  "basisReset": "Basis back to “stated”: the value was typed again (it was: {basis}).",
  "lawSources": "Sources: {sources}",
  "extrapolation": "These laws were measured on night sightings: applying them to a daylight sighting is an extrapolation.",
  "sectionAccountConditions": "Conditions of the account",
  "sectionViewing": "Viewing conditions",
  "sectionMoon": "Moon gauge",
  "sectionErrorParameters": "This witness's error parameters",
  "errorModelField": "Error model",
  "delayField": "Delay before this account",
  "delayUnit": "days",
  "versionField": "Version",
  "wordField": "Word used",
  "exposureField": "Exposure",
  "independenceField": "Independence",
  "independentYes": "without talking to the other witnesses",
  "independentNo": "after talking to the other witnesses",
  "unknownChoice": "unknown",
  "darkAdapted": "Dark-adapted",
  "correctedVision": "Corrected vision (glasses, lenses)",
  "glare": "Bright light just before",
  "viewingNote": "The window or windscreen and the binoculars are set in “Vision” above.",
  "moonIntro": "The witness shows the full Moon the way they showed the object. The ratio is their own angular-size factor: the one measure that makes the general law individual. To take once per witness.",
  "moonField": "Moon as shown",
  "moonHint": "At arm's length, 1 cm ≈ 1°",
  "moonNone": "Not measured yet: the general law applies ({law}).",
  "moonFactor": "Factor ×{k}: it replaces the general law in every angular size this witness gives.",
  "moonReal": "Real Moon · 0.52°",
  "parametersIntro": "One witness's errors are tied: the same factor on every size, the same offset on every time. Computed, never typed: no “±” margin is entered by hand.",
  "showMore": "Show",
  "basis": {
    "measured": "◆ measured",
    "stated": "stated",
    "derived": "derived",
    "assumed": "assumed"
  },
  "how": {
    "clock": "read on a clock",
    "anchored": "anchored to a dated event",
    "estimated": "estimated",
    "shown-on-the-spot": "shown on the spot",
    "arm-length-gauge": "arm's-length gauge",
    "recalled-object": "through a familiar object",
    "instrument": "instrument",
    "landmark": "landmark",
    "occlusion": "occlusion",
    "known-size": "known size",
    "triangulation": "triangulation"
  },
  "status": {
    "consolidated": "consolidated",
    "individual": "individual",
    "single": "single study",
    "argued": "argued",
    "contested": "contested"
  },
  "laws": {
    "timeClock": "± {minutes} min (read on a clock)",
    "timeAnchored": "± {minutes} min (anchored to a dated event)",
    "timeEstimated": "± {minutes} min for 9 witnesses in 10 (estimated)",
    "duration": "{low} to {high}: ×/÷{factor} (log-normal)",
    "elevationOver": "{low} to {high}: elevation overestimated",
    "measuredInstrument": "± {degrees}° (measured)",
    "measuredLandmark": "± {degrees}° (from a landmark)",
    "headingCross": "{low} to {high}: ± {degrees}°, sense sometimes reversed",
    "sizeMoon": "{low} to {high}: Moon gauge factor ×{factor}",
    "sizeShown": "{low} to {high}: shown on the spot, +2 to +17 %",
    "sizeRecalled": "{low} to {high}: through a familiar object, ~30 % too large",
    "sizeArm": "{low} to {high}: overestimated ×{from} to ×{to} at arm's length",
    "sizeGauge": "{low} to {high}: gauge, ± {percent} %",
    "distanceAnchored": "Anchored: its error follows that of what it is derived from",
    "distanceNotData": "No data: wrong by a factor {factor} or more unless anchored"
  },
  "parameterNames": {
    "clock": "Clock offset",
    "date": "Date shift",
    "heading": "Heading rotation",
    "elevation": "Elevation compression",
    "size": "Angular size factor",
    "duration": "Duration factor"
  },
  "parameterScopes": {
    "clock": "every time",
    "date": "the date",
    "heading": "every bearing",
    "elevation": "every elevation",
    "size": "every angular size",
    "duration": "the duration and the timeline's scale"
  },
  "parameters": {
    "clockClock": "± {minutes} min (clock)",
    "clockAnchored": "± {minutes} min (anchored)",
    "clockEstimated": "± {minutes} min (estimated)",
    "dateShift": "±1 day, month or year; summer time ({percent} % of dates)",
    "headingRotation": "± {degrees}°, mirror possible",
    "elevationCompression": "overestimated, never underestimated",
    "sizeMoon": "×{factor} (Moon gauge)",
    "sizeArm": "×{from} to ×{to} at arm's length",
    "sizeShown": "+2 to +17 % shown on the spot",
    "durationFactor": "×/÷{factor} (log-normal)"
  },
  "words": {
    "light": "light",
    "object": "object",
    "craft": "craft",
    "ufo": "UFO",
    "other": "other"
  },
  "exposures": {
    "none": "none",
    "press": "press",
    "broadcast": "radio, television",
    "other-witnesses": "other witnesses",
    "investigators": "investigators"
  },
  "models": {
    "consolidated": "Consolidated readings (UFO@home)",
    "keul": "Keul (sizes shown on the spot)"
  }
}
