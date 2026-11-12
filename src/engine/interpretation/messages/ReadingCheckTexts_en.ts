import type { ReadingCheckTexts } from "./ReadingCheckTexts.js"

export const readingCheckTexts_en = {
  timeWithin: "Its time, {time}, is within what is known of it ({range}).",
  timeOutside: "Its time, {time}, is outside what is known of it ({range}).",
  timeChanged: "It moves the time from {from} to {time}, which the observation states.",
  valueWithin: "Its {what}, {value}, is within what is known of it ({min} to {max}).",
  valueOutside: "Its {what}, {value}, is outside what is known of it ({min} to {max}).",
  valueChanged: "It moves the {what} from {from} to {value}, which the observation states.",
  lightingHolds: "The Sun it puts together ({bearing}° from where the camera looks, {altitude}° high) lights the scene as the picture shows it ({from}° to {to}° from where it looks{altitudes}).",
  lightingFails: "The Sun it puts together ({bearing}° from where the camera looks, {altitude}° high) does not light the scene as the picture shows it ({from}° to {to}° from where it looks{altitudes}).",
  altitudes: ", {min}° to {max}° high",
  latitude: "latitude",
  longitude: "longitude",
  bestFixed: "Computed best case, standing still in the frame and placed nearest the phenomenon all along: it stays {median}° from it at the median, {max}° at most, for a phenomenon of {size}° that travels {travel}°.",
  bestOneWay: "Computed best case, driven one way (towards {direction}° from the top of the frame, clockwise) and nearest the phenomenon: it stays {median}° from it at the median, {max}° at most, for a phenomenon of {size}° that travels {travel}°.",
  bestGhost: "Computed best case, a ghost of the lens (factor {k}) with the Sun where the account allows it ({bearing}° from where the camera looks, {altitude}° high): it stays {median}° from the phenomenon at the median, {max}° at most, for a phenomenon of {size}° that travels {travel}°.",
  bestGhostNeeds: "Leaving the picture's light aside, the best Sun would be {bearing}° from where the camera looks and {altitude}° high (factor {k}): the ghost would stay {median}° from the phenomenon at the median, {max}° at most.",
  bestStatedGhost: "Computed best case, a ghost of an optic set before the lens, at the factor ({k}) and offset ({offset}°) that lay it best, the Sun {bearing}° from where the camera looks and {altitude}° high: it stays {median}° from the phenomenon at the median, {max}° at most, for a phenomenon of {size}° that travels {travel}°.",
  bestNoGhost: "Computed best case: no Sun the account allows is within the lens's reach all along, so it throws no ghost of it.",
  decimal: "."
} satisfies ReadingCheckTexts
