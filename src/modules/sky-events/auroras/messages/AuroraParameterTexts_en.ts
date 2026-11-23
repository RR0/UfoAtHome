import type { AuroraParameterTexts } from "./AuroraParameterTexts.js"

export const auroraParameterTexts_en: AuroraParameterTexts = {
  aurora: "Aurora",
  name: "Name",
  field: "Magnetic field",
  light: "Light",
  when: "When",
  kp: "Kp index",
  kpHint: "How disturbed the Earth's magnetic field was, 0 (quiet) to 9 (extreme storm), as the planetary index states it; past 9, the GFZ's open-ended Hp.",
  edge: "Equatorward edge",
  edgeHint: "The geomagnetic latitude of the oval's edge nearest the equator, at magnetic midnight: stated when known otherwise than from Kp, which stops at 9.",
  arcs: "Arcs",
  arcsHint: "How many discrete arcs stand in the oval; 0 for a diffuse glow only.",
  arcBrightness: "Arcs' brightness",
  arcBrightnessHint: "Kilorayleighs of the green line through an arc's height: 1 is as bright as the Milky Way, 10 as thin cirrus in moonlight, 100 as moonlit cumulus, 1000 lights the ground as a full Moon.",
  red: "Storm red",
  redHint: "Kilorayleighs of the high red line of a storm, which is what an aurora seen from far equatorward is mostly made of.",
  from: "From",
  fromHint: "Seconds of the recording; negative before it starts. From the start when empty.",
  until: "Until",
  untilHint: "Seconds of the recording. Until the end when empty."
} satisfies AuroraParameterTexts
