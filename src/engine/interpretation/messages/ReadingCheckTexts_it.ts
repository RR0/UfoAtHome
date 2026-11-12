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
  longitude: "longitudine",
  bestFixed: "Caso migliore calcolato, fermo nell'inquadratura e posto il più vicino al fenomeno per tutto il tempo: ne resta a {median}° in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestOneWay: "Caso migliore calcolato, spinto in un solo senso (verso {direction}° dall'alto dell'inquadratura, in senso orario) e il più vicino al fenomeno: ne resta a {median}° in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestGhost: "Caso migliore calcolato, un riflesso dell'obiettivo (fattore {k}) con il Sole dove il resoconto lo consente ({bearing}° dalla mira, {altitude}° di altezza): resta a {median}° dal fenomeno in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestGhostNeeds: "Lasciando da parte l'illuminazione dell'immagine, il Sole migliore sarebbe a {bearing}° dalla mira e {altitude}° di altezza (fattore {k}): il riflesso resterebbe a {median}° dal fenomeno in mediana, {max}° al massimo.",
  bestStatedGhost: "Caso migliore calcolato, un riflesso di un'ottica posta davanti all'obiettivo, con il fattore ({k}) e lo spostamento ({offset}°) che meglio lo collocano, il Sole a {bearing}° dalla mira e {altitude}° di altezza: resta a {median}° dal fenomeno in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestNoGhost: "Caso migliore calcolato: nessun Sole che il resoconto consenta è alla portata dell'obiettivo per tutto il tempo, che non ne riceve quindi alcun riflesso.",
  decimal: ","
} satisfies ReadingCheckTexts
