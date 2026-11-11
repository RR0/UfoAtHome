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
  longitude: "longitude"
} satisfies ReadingCheckTexts
