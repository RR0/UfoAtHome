import type { BirdEditorMessages } from "./BirdEditorMessages.js"

export const birdEditorMessages_en = {
  intro: "What the flocks are: birds read into the account as what it saw. Each bird flies its own track, computed from the species, the arrangement and the path: its wings beat at its species' rate, it banks in its turns — computed, not drawn.",
  none: "No birds in this recording",
  flock: "Birds",
  deleteFlock: "Delete these birds",
  addFlock: "Add birds",
  addNowhere: "Give the recording a place first: the birds are put in front of the observer",
  explainsEachNote: "These birds each stand for a shape of the account, {n} in the order of the flock: change which in the recording's file.",
  path: "Path",
  deletePoint: "Remove this point",
  timelineNote: "On the timeline, a diamond pressed is the point of the path shown below, and the scene goes to its instant; drag it to move it in time. The \"+\" puts a point at the playhead, where the birds are then. Before the first point and after the last, the birds stay where it puts them.",
  addPointHere: "Add a point here, at the playhead",
  pointHere: "A point is at the playhead: press it to edit it",
  zoomHint: "Pinch, or Ctrl + wheel, to zoom; Shift + wheel to scroll",
  derivedNote: "An empty field shows, greyed, the value in use: the species' own for its wingbeat, its way of flying and its colours. Empty a field to go back to it."
} satisfies BirdEditorMessages
