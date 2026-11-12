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
  longitude: "longitude",
  bestFixed: "Meilleur cas calculé, fixe dans le cadre et placé au plus près du phénomène tout au long : il en reste à {median}° en médiane, {max}° au plus, pour un phénomène de {size}° qui parcourt {travel}°.",
  bestOneWay: "Meilleur cas calculé, poussé dans un seul sens (vers {direction}° depuis le haut du cadre, dans le sens horaire) et au plus près du phénomène : il en reste à {median}° en médiane, {max}° au plus, pour un phénomène de {size}° qui parcourt {travel}°.",
  bestGhost: "Meilleur cas calculé, un reflet de l'objectif (facteur {k}) avec le Soleil où le compte rendu le permet ({bearing}° de la visée, {altitude}° de haut) : il reste à {median}° du phénomène en médiane, {max}° au plus, pour un phénomène de {size}° qui parcourt {travel}°.",
  bestGhostNeeds: "Sans s'en tenir à l'éclairage de l'image, le meilleur Soleil serait à {bearing}° de la visée et {altitude}° de haut (facteur {k}) : le reflet resterait à {median}° du phénomène en médiane, {max}° au plus.",
  bestStatedGhost: "Meilleur cas calculé, un reflet d'une optique placée devant l'objectif, au facteur ({k}) et au décalage ({offset}°) qui le posent au mieux, le Soleil à {bearing}° de la visée et {altitude}° de haut : il reste à {median}° du phénomène en médiane, {max}° au plus, pour un phénomène de {size}° qui parcourt {travel}°.",
  bestNoGhost: "Meilleur cas calculé : aucun Soleil que le compte rendu permet n'est à portée de l'objectif tout au long, qui n'en reçoit donc aucun reflet.",
  decimal: ","
} satisfies ReadingCheckTexts
