import type { AuroraParameterTexts } from "./AuroraParameterTexts.js"

export const auroraParameterTexts_it: AuroraParameterTexts = {
  aurora: "Aurora",
  name: "Nome",
  field: "Campo magnetico",
  light: "Luce",
  when: "Quando",
  kp: "Indice Kp",
  kpHint: "Quanto era agitato il campo magnetico terrestre, da 0 (calmo) a 9 (tempesta estrema), come lo dà l'indice planetario; oltre 9, l'indice Hp del GFZ, senza tetto.",
  edge: "Bordo verso l'equatore",
  edgeHint: "La latitudine geomagnetica del bordo dell'ovale più vicino all'equatore, a mezzanotte magnetica: da indicare quando la si conosce altrimenti che da Kp, che si ferma a 9.",
  arcs: "Archi",
  arcsHint: "Quanti archi distinti stanno nell'ovale; 0 per un semplice bagliore diffuso.",
  arcBrightness: "Luminosità degli archi",
  arcBrightnessHint: "Kilorayleigh della riga verde lungo l'altezza di un arco: 1, la luminosità della Via Lattea; 10, un cirro sottile al chiaro di luna; 100, un cumulo al chiaro di luna; 1000 illumina il suolo come la luna piena.",
  red: "Rosso di tempesta",
  redHint: "Kilorayleigh della riga rossa alta di una tempesta magnetica, di cui è fatta soprattutto un'aurora vista da lontano verso l'equatore.",
  from: "Da",
  fromHint: "Secondi della registrazione, negativi prima dell'inizio. Dall'inizio se vuoto.",
  until: "A",
  untilHint: "Secondi della registrazione. Fino alla fine se vuoto."
} satisfies AuroraParameterTexts
