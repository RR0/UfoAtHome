import type { BeamParameterTexts } from "./BeamParameterTexts.js"

export const beamParameterTexts_fr = {
  light: "Lumière",
  beam: "Faisceau",
  when: "Quand",
  name: "Nom",
  divergence: "Divergence",
  howFastItWidensFullAngle: "À quelle vitesse il s'élargit, angle total : 0,1 mrad fait un mètre de large à 10 km.",
  widthAtTheEmitter: "Largeur à l'émetteur",
  unevenHaze: "Brume irrégulière",
  howUnevenlyTheHazeItCrosses: "À quel point la brume qu'il traverse est inégale : vu de côté, le faisceau est plus brillant là où il traverse une poche plus dense, les poches dérivant avec le vent. 0 est une brume égale ; la valeur par défaut est jugée sur des photographies, pas mesurée.",
  itsColour532ForTheGreen: "Sa couleur : 532 pour le vert d'un laser doublé en fréquence, 520 pour une diode verte, 638 pour une rouge, 450 pour une bleue.",
  theOpticalPowerItCarriesIts: "La puissance optique qu'il porte, sa moyenne pour un laser pulsé, dont aucun œil ne distingue les impulsions. Ce qui s'en voit est ce que l'air en diffuse.",
  wavelength: "Longueur d'onde",
  power: "Puissance",
  time: "Instant",
  secondsOfTheRecording: "Secondes de l'enregistrement.",
  onFrom: "Allumé à",
  secondsOfTheRecordingEmptyFrom: "Secondes de l'enregistrement ; vide, dès son début.",
  offAt: "Éteint à",
  secondsOfTheRecordingEmptyUntil: "Secondes de l'enregistrement ; vide, jusqu'à sa fin.",
  pathAtAnInstant: "Trajet à un instant",
  pointOfThePath: "Point du trajet",
  position: "Position",
  altitude: "Altitude",
  aboveTheSeaNotTheGround: "Au-dessus de la mer, pas du sol : un émetteur à une fenêtre à douze mètres de haut, sur un sol à 160 m, est à 172 m."
} satisfies BeamParameterTexts
