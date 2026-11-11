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
  longitude: "longitud"
} satisfies ReadingCheckTexts
