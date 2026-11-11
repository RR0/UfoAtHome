import type { ReadingCheckTexts } from "./ReadingCheckTexts.js"

export const readingCheckTexts_it = {
  timeWithin: "La sua ora, {time}, è entro ciò che se ne sa ({range}).",
  timeOutside: "La sua ora, {time}, è fuori da ciò che se ne sa ({range}).",
  timeChanged: "Sposta l'ora da {from} a {time}, che l'osservazione indica.",
  valueWithin: "La sua {what}, {value}, è entro ciò che se ne sa (da {min} a {max}).",
  valueOutside: "La sua {what}, {value}, è fuori da ciò che se ne sa (da {min} a {max}).",
  valueChanged: "Sposta la {what} da {from} a {value}, che l'osservazione indica.",
  lightingHolds: "Il Sole che compone ({bearing}° dalla direzione di mira, {altitude}° di altezza) illumina la scena come la mostra l'immagine (da {from}° a {to}° dalla mira{altitudes}).",
  lightingFails: "Il Sole che compone ({bearing}° dalla direzione di mira, {altitude}° di altezza) non illumina la scena come la mostra l'immagine (da {from}° a {to}° dalla mira{altitudes}).",
  altitudes: ", da {min}° a {max}° di altezza",
  latitude: "latitudine",
  longitude: "longitudine"
} satisfies ReadingCheckTexts
