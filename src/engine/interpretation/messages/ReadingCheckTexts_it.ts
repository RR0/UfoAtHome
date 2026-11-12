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
  bestFixed: "Configurazione più favorevole, calcolata: fermo nell'inquadratura e posto il più vicino al fenomeno per tutto il tempo, ne resta a {median}° in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestOneWay: "Configurazione più favorevole, calcolata: spinto in un solo senso (verso {direction}° dall'alto dell'inquadratura, in senso orario) e il più vicino al fenomeno, ne resta a {median}° in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestGhost: "Configurazione più favorevole, calcolata: un riflesso dell'obiettivo (fattore {k}) con il Sole dove il resoconto lo consente ({bearing}° dalla visuale, {altitude}° di altezza), resta a {median}° dal fenomeno in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestGhostNeeds: "Lasciando da parte l'illuminazione dell'immagine, il Sole più favorevole sarebbe a {bearing}° dalla visuale e {altitude}° di altezza (fattore {k}): il riflesso resterebbe a {median}° dal fenomeno in mediana, {max}° al massimo.",
  bestStatedGhost: "Configurazione più favorevole, calcolata: un riflesso di un'ottica posta davanti all'obiettivo, al fattore ({k}) e allo scostamento ({offset}°) che meglio lo collocano, il Sole a {bearing}° dalla visuale e {altitude}° di altezza, resta a {median}° dal fenomeno in mediana, {max}° al massimo, per un fenomeno di {size}° che percorre {travel}°.",
  bestNoGhost: "Configurazione più favorevole, calcolata: nessun Sole che il resoconto consenta è alla portata dell'obiettivo per tutto il tempo, che quindi non ne riceve alcun riflesso.",
  bestGhostOf: "Configurazione più favorevole, calcolata: un riflesso attraverso l'obiettivo (fattore {k}) della luce che la lettura colloca, dove la colloca, resta a {median}° dal fenomeno in mediana, {max}° al massimo, e percorre {ghostTravel}° quando il fenomeno di {size}° ne percorre {travel}°.",
  bestRealObject: "Configurazione più favorevole, calcolata: sulla sua linea di vista, è dove si trova il fenomeno in ogni istante, a qualsiasi distanza. A {distance} m, dove la lettura lo colloca, misurerebbe {width} m e andrebbe almeno a {speed} m/s di traverso rispetto alla linea di vista della telecamera; entrambi in proporzione alla distanza.",
  decimal: ","
} satisfies ReadingCheckTexts
