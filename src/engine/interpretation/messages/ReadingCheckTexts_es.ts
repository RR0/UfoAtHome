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
  bestFixed: "Configuración más favorable, calculada: fijo en el encuadre y colocado lo más cerca del fenómeno todo el tiempo, queda a {median}° de él en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestOneWay: "Configuración más favorable, calculada: empujado en un solo sentido (hacia {direction}° desde lo alto del encuadre, en el sentido horario) y lo más cerca del fenómeno, queda a {median}° de él en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestGhost: "Configuración más favorable, calculada: un reflejo del objetivo (factor {k}) con el Sol donde el relato lo permite ({bearing}° de la visual, {altitude}° de altura), queda a {median}° del fenómeno en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestGhostNeeds: "Sin atenerse a la iluminación de la imagen, el Sol más favorable estaría a {bearing}° de la visual y {altitude}° de altura (factor {k}): el reflejo quedaría a {median}° del fenómeno en la mediana, {max}° como mucho.",
  bestStatedGhost: "Configuración más favorable, calculada: un reflejo de una óptica colocada delante del objetivo, con el factor ({k}) y el desplazamiento ({offset}°) que mejor lo sitúan, el Sol a {bearing}° de la visual y {altitude}° de altura, queda a {median}° del fenómeno en la mediana, {max}° como mucho, para un fenómeno de {size}° que recorre {travel}°.",
  bestNoGhost: "Configuración más favorable, calculada: ningún Sol que el relato permita está al alcance del objetivo todo el tiempo, que no recibe por tanto ningún reflejo de él.",
  bestGhostOf: "Configuración más favorable, calculada: un reflejo por el objetivo (factor {k}) de la luz que la lectura coloca, donde la coloca, queda a {median}° del fenómeno en la mediana, {max}° como mucho, y recorre {ghostTravel}° cuando el fenómeno de {size}° recorre {travel}°.",
  bestRealObject: "Configuración más favorable, calculada: en su línea de visión, está donde está el fenómeno en cada instante, a cualquier distancia. A {distance} m, donde la lectura lo coloca, mediría {width} m e iría al menos a {speed} m/s de través respecto a la línea de visión de la cámara; ambos en proporción a la distancia.",
  decimal: ","
} satisfies ReadingCheckTexts
