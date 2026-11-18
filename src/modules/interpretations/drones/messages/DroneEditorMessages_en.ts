import type { DroneEditorMessages } from "./DroneEditorMessages.js"

export const droneEditorMessages_en = {
  intro: "Drones, as a reading of the account: what it saw was a drone, or several. Each flies its own track, computed from its airframe and its path: it stops where its path stops, leans into where it goes and into the wind, and its lights flash as they do — computed, not drawn.",
  none: "No drone in this recording",
  drone: "Drones",
  deleteDrone: "Delete these drones",
  addDrone: "Add a drone",
  addNowhere: "Give the recording a place first: a drone is put in front of the observer",
  explainsEachNote: "These drones each stand for a shape of the account, {n} in their order: change which in the recording's file.",
  path: "Path",
  deletePoint: "Remove this point",
  timelineNote: "On the timeline, a diamond pressed is the point of the path shown below, and the scene goes to its instant; drag it to move it in time. The “+” puts a point at the playhead, where the drone is then. Two points at the same place are a hover: a multirotor stops there, and at the first point and the last.",
  addPointHere: "Add a point here, at the playhead",
  pointHere: "A point is at the playhead: press it to edit it",
  zoomHint: "Pinch, or Ctrl + wheel, to zoom; Shift + wheel to scroll",
  derivedNote: "An empty field shows, greyed, the value in use: its airframe's for its colour and its lights. Empty a field to go back to it."
} satisfies DroneEditorMessages
