import type { BeamParameterTexts } from "./BeamParameterTexts.js"

export const beamParameterTexts_en = {
  light: "Light",
  beam: "Beam",
  when: "When",
  name: "Name",
  divergence: "Divergence",
  howFastItWidensFullAngle: "How fast it widens, full angle: 0.1 mrad is a metre wide at 10 km.",
  widthAtTheEmitter: "Width at the emitter",
  unevenHaze: "Uneven haze",
  howUnevenlyTheHazeItCrosses: "How unevenly the haze it crosses is spread: the beam seen from the side is brighter where it crosses a denser patch, the patches drifting with the wind. 0 is an even haze; the default is judged on photographs, not measured.",
  itsColour532ForTheGreen: "Its colour: 532 for the green of a frequency-doubled laser, 520 for a green diode, 638 for a red one, 450 for a blue one.",
  theOpticalPowerItCarriesIts: "The optical power it carries, its mean for a pulsed laser, whose pulses no eye tells apart. What is seen of it is what the air scatters.",
  wavelength: "Wavelength",
  power: "Power",
  time: "Time",
  secondsOfTheRecording: "Seconds of the recording.",
  onFrom: "On from",
  secondsOfTheRecordingEmptyFrom: "Seconds of the recording; empty, from its start.",
  offAt: "Off at",
  secondsOfTheRecordingEmptyUntil: "Seconds of the recording; empty, until its end.",
  pathAtAnInstant: "Path at an instant",
  pointOfThePath: "Point of the path",
  position: "Position",
  altitude: "Altitude",
  aboveTheSeaNotTheGround: "Above the sea, not the ground: an emitter at a window twelve metres up a building on ground at 160 m is at 172 m."
} satisfies BeamParameterTexts
