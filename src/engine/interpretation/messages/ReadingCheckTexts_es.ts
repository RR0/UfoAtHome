import type { ReadingCheckTexts } from "./ReadingCheckTexts.js"

export const readingCheckTexts_es = {
  timeWithin: "Su hora, {time}, está dentro de lo que se sabe de ella ({range}).",
  timeOutside: "Su hora, {time}, está fuera de lo que se sabe de ella ({range}).",
  timeChanged: "Desplaza la hora de {from} a {time}, que la observación indica.",
  valueWithin: "Su {what}, {value}, está dentro de lo que se sabe ({min} a {max}).",
  valueOutside: "Su {what}, {value}, está fuera de lo que se sabe ({min} a {max}).",
  valueChanged: "Desplaza la {what} de {from} a {value}, que la observación indica.",
  lightingHolds: "El Sol que compone ({bearing}° de la dirección de mira, {altitude}° de altura) ilumina la escena como la muestra la imagen ({from}° a {to}° de la mira{altitudes}).",
  lightingFails: "El Sol que compone ({bearing}° de la dirección de mira, {altitude}° de altura) no ilumina la escena como la muestra la imagen ({from}° a {to}° de la mira{altitudes}).",
  altitudes: ", {min}° a {max}° de altura",
  latitude: "latitud",
  longitude: "longitud",
  bestFixed: "Mejor caso calculado, fijo en el encuadre y colocado lo más cerca del fenómeno todo el tiempo: queda a {median}° de él en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestOneWay: "Mejor caso calculado, empujado en un solo sentido (hacia {direction}° desde lo alto del encuadre, en sentido horario) y lo más cerca del fenómeno: queda a {median}° de él en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestGhost: "Mejor caso calculado, un reflejo del objetivo (factor {k}) con el Sol donde el relato lo permite ({bearing}° de la mira, {altitude}° de altura): queda a {median}° del fenómeno en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestGhostNeeds: "Sin atenerse a la iluminación de la imagen, el mejor Sol estaría a {bearing}° de la mira y {altitude}° de altura (factor {k}): el reflejo quedaría a {median}° del fenómeno en la mediana, {max}° como mucho.",
  bestStatedGhost: "Mejor caso calculado, un reflejo de una óptica colocada delante del objetivo, con el factor ({k}) y el desplazamiento ({offset}°) que mejor lo sitúan, el Sol a {bearing}° de la mira y {altitude}° de altura: queda a {median}° del fenómeno en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestNoGhost: "Mejor caso calculado: ningún Sol que el relato permita está al alcance del objetivo todo el tiempo, que no recibe por tanto ningún reflejo suyo.",
  decimal: ","
} satisfies ReadingCheckTexts
