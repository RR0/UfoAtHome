import { VisualAids } from "../../engine/instrument/VisualAids.js"
import { DigitalSlrs } from "../../engine/instrument/DigitalSlrs.js"
import type { SceneNames } from "./SceneNames.js"

/**
 * The English names of the things a scene and its catalogues hold, and its sentences — see SceneNames. The catalogues keep their
 * English names (stars, comets, novae, satellites, showers), which are those the build scripts write: nothing to say again here.
 */
export const sceneNames_en = {
  bodies: { sun: "Sun", moon: "Moon", Venus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturn: "Saturn" },
  stars: {},
  comets: {},
  novae: {},
  satelliteClasses: {},
  showers: {},
  lightRigs: {
    airliner: "Airliner",
    helicopter: "Helicopter",
    "car-headlights": "Car, headlights on",
    "car-hazards": "Car, hazard flashers",
    "emergency-beacons": "Emergency vehicle beacons",
    "traffic-signal": "Traffic light",
    "pedestrian-signal": "Pedestrian light",
    streetlamp: "Streetlamp"
  },
  instruments: {
    eye: "Naked eye",
    "rectilinear-lens": "Camera, unknown device",
    "roamer-1-120": "Roamer 1, 120 film",
    "instamatic-126": "Instamatic, 126 film",
    "slr-35mm-50": "35 mm SLR, 50 mm lens",
    "slr-35mm-zoom": "35 mm SLR, 70-210 mm zoom",
    "phone-landscape": "Phone, held sideways",
    "phone-portrait": "Phone, held upright",
    dashcam: "Dashcam",
    cctv: "Security camera",
    ...DigitalSlrs.names(),
    ...VisualAids.names()
  },
  decorKinds: {
  building: "Building",
  tree: "Tree",
  shrub: "Shrub",
  bridge: "Bridge",
  wire: "Overhead line",
  crop: "Crop row",
  terrace: "Terrace (restanque)",
  mound: "Stone heap",
  wall: "Dry-stone wall",
  streetlight: "Streetlight",
  trafficlight: "Traffic light",
  crossing: "Pedestrian crossing",
  roadsign: "Road sign",
  vehicle: "Vehicle",
  observer: "Observer",
  aircraft: "Aircraft",
  // Not "creature" and not "alien": the account says a being was there and says nothing about what
  // it was, which is the whole of what this project is willing to assert.
  entity: "Being"
},
  compassPoints: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  towards: (point: string) => `to the ${point}`,
  starTooltip: "{name} — mag {mag}, {alt}° above the horizon",
  starTooltipBelow: "{name} — mag {mag}, {alt}° below the horizontal",
  decorTooltip: "{name} — {size}, {distance} away",
  satelliteTooltip: "{name} — satellite, mag {mag}, {height} km up",
  afterimageTooltip: {
  name: "Afterimage, in the eye",
  detail: "{name}: where the image of a light brighter than the Sun fell, the retina's pigment is bleached: for a few seconds it goes on glowing, white then coloured, and then what is seen there looks darker. It stays where it is in the field of view whichever way the eye turns, and takes minutes to fade."
},
  ghostTooltip: {
  ghost: "Ghost: {name}", halo: "Halo: {name}", double: "Double: {name}", unnamed: "a light",
  detail: "{name}. {cause}, {where}.",
  causes: {
    lens: "A reflection between two surfaces of the lens", sensor: "The sensor's reflection, sent back by its cover glass",
    filter: "The sensor's reflection, sent back by the filter", glass: "A reflection between the two faces of the glass in front of the lens",
    drops: "Light scattered by drops on the glass", condensation: "Light scattered by condensation on the glass", dirt: "Light scattered by dirt on the glass"
  },
  opposite: "across the centre of the picture from the light", sameSide: "on the same side of the centre as the light", around: "round the light",
  drop: { lens: "Drop on the lens", filter: "Drop on the filter", window: "Drop on the window", windscreen: "Drop on the windscreen" },
  dropDetail: "{name}. Like a small lens, it shows upside down and blurred what is on the other side of it, rather than what is behind it."
},
  opticsTooltips: {
  halo22: "22° halo — a ring round the Sun, from light bent through hexagonal ice crystals in high cirrus; its inner edge is red, at 21.7°",
  halo46: "46° halo — a rarer, fainter ring: light entering a crystal by a side face and leaving by an end face",
  oddRadius: "{angle}° halo — an odd-radius ring, rare and faint, made by ice crystals with pyramid ends",
  parhelion: "Parhelion (sundog) — a bright coloured spot beside the Sun at its own height, from flat plates falling level; red toward the Sun",
  parhelion120: "120° parhelion — a faint white spot 120° from the Sun, from light reflected inside flat plates",
  upperTangentArc: "Upper tangent arc — a bright arc resting on top of the 22° halo, from columns lying level",
  lowerTangentArc: "Lower tangent arc — an arc touching the bottom of the 22° halo, from columns lying level",
  circumzenithal: "Circumzenithal arc — a vivid band of colour near the zenith, from light entering the top face of flat plates (only with the Sun under 32°)",
  circumhorizontal: "Circumhorizontal arc — a band of colour low in the sky, from light entering the side face of flat plates (only with the Sun over 58°)",
  parhelicCircle: "Parhelic circle — a white circle round the whole sky at the Sun's own height, from reflections on the vertical faces of flat plates",
  pillar: "Light pillar — a shaft of light standing above the Sun, from reflections off slightly tilted flat plates",
  subsun: "Subsun — a mirror image of the Sun below the horizon, from reflections off the flat faces of plates"
},
  trafficTooltip: {
    unnamed: "Aircraft {hex}",
    altitude: "{value} ft",
    speed: "{value} kt",
    heading: "heading {value}°",
    position: "{distance} km away, {elevation}° above the horizon, {bearing}",
    heard: "Heard at {level} dB(A), left the aircraft {delay} s ago, {lag}° behind it: {character}{pitch}",
    rumble: "a low rumble, nothing above {cutoff} Hz",
    muffled: "a dull noise, nothing above {cutoff} Hz",
    broad: "a broad roar",
    pitchHigher: ", pitch {percent} % higher",
    pitchLower: ", pitch {percent} % lower",
    inaudible: "Not audible here: {level} dB(A) against {ambient} dB(A) of ambient noise",
    soundUnknown: "Its sound cannot be worked out: the aircraft was not recorded yet when it left",
    contrailPersistent: "Leaves a trail that lasts: the air is supersaturated over ice ({rhi} % over ice)",
    contrailShort: "Leaves a short-lived trail: the air is dry over ice ({rhi} % over ice)",
    military: "military",
    restricted: "identity withheld by its owner",
    candidate: "A compatible candidate, not an identification"
  },
  railwayTooltip: {
    kinds: { rail: "Railway", light_rail: "Light rail", tram: "Tramway", subway: "Metro", funicular: "Funicular" },
    highSpeed: "High-speed line",
    service: "Siding",
    singleTrack: "single track",
    tracks: "{count} tracks",
    overhead: "overhead wire {height} m above the rail",
    overheadVoltage: "overhead wire at {voltage}, {height} m above the rail",
    thirdRail: "third rail",
    thirdRailVoltage: "third rail at {voltage}",
    notElectrified: "not electrified",
    gauge: "{mm} mm gauge",
    metreGauge: "metre gauge",
    distance: "{distance} away"
  },
  credits: "Credits",
  notAVideo: "This is not a video",
  isASimulation: "It is a real-time simulation."
} satisfies SceneNames
