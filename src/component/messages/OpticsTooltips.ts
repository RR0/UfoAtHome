import type { OpticsFeatureId } from "../../engine/atmosphere/HaloFeatures.js"

/** What pointing at an optical feature says, in English: the fallback while a language's own names load. */
export const OPTICS_TOOLTIPS_EN: Readonly<Record<OpticsFeatureId, string>> = {
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
}
