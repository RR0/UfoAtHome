import type { ReadingCheckTexts } from "./ReadingCheckTexts.js"

export const readingCheckTexts_fr = {
  timeWithin: "Son heure, {time}, est dans ce qu'on en sait ({range}).",
  timeOutside: "Son heure, {time}, est hors de ce qu'on en sait ({range}).",
  timeChanged: "Elle déplace l'heure de {from} à {time}, que l'observation indique.",
  valueWithin: "Sa {what}, {value}, est dans ce qu'on en sait ({min} à {max}).",
  valueOutside: "Sa {what}, {value}, est hors de ce qu'on en sait ({min} à {max}).",
  valueChanged: "Elle déplace la {what} de {from} à {value}, que l'observation indique.",
  lightingHolds: "Le Soleil qu'elle compose ({bearing}° de la direction de visée, {altitude}° de haut) éclaire la scène comme l'image la montre ({from}° à {to}° de la visée{altitudes}).",
  lightingFails: "Le Soleil qu'elle compose ({bearing}° de la direction de visée, {altitude}° de haut) n'éclaire pas la scène comme l'image la montre ({from}° à {to}° de la visée{altitudes}).",
  altitudes: ", {min}° à {max}° de haut",
  latitude: "latitude",
  longitude: "longitude"
} satisfies ReadingCheckTexts
