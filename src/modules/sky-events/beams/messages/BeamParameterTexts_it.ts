import type { BeamParameterTexts } from "./BeamParameterTexts.js"

export const beamParameterTexts_it = {
  light: "Luce",
  beam: "Fascio",
  when: "Quando",
  name: "Nome",
  divergence: "Divergenza",
  howFastItWidensFullAngle: "Quanto in fretta si allarga, angolo totale: 0,1 mrad è un metro di larghezza a 10 km.",
  widthAtTheEmitter: "Larghezza all'emettitore",
  unevenHaze: "Foschia irregolare",
  howUnevenlyTheHazeItCrosses: "Quanto è irregolare la foschia che attraversa: visto di lato, il fascio è più brillante dove attraversa una sacca più densa, e le sacche derivano col vento. 0 è una foschia uniforme; il valore predefinito è giudicato su fotografie, non misurato.",
  itsColour532ForTheGreen: "Il suo colore: 532 per il verde di un laser a frequenza raddoppiata, 520 per un diodo verde, 638 per uno rosso, 450 per uno blu.",
  theOpticalPowerItCarriesIts: "La potenza ottica che porta, la sua media per un laser pulsato, i cui impulsi nessun occhio distingue. Ciò che se ne vede è ciò che l'aria diffonde.",
  wavelength: "Lunghezza d'onda",
  power: "Potenza",
  time: "Istante",
  secondsOfTheRecording: "Secondi della registrazione.",
  onFrom: "Acceso a",
  secondsOfTheRecordingEmptyFrom: "Secondi della registrazione; vuoto, dal suo inizio.",
  offAt: "Spento a",
  secondsOfTheRecordingEmptyUntil: "Secondi della registrazione; vuoto, fino alla sua fine.",
  pathAtAnInstant: "Percorso a un istante",
  pointOfThePath: "Punto del percorso",
  position: "Posizione",
  altitude: "Altitudine",
  aboveTheSeaNotTheGround: "Sul mare, non sul suolo: un emettitore a una finestra a dodici metri d'altezza, su un suolo a 160 m, è a 172 m."
} satisfies BeamParameterTexts
