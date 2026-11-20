import type { InputFileMessages } from "../InputFileElement.js"

/** What the application element says around the reader and the editor it holds — see UfoAtHomeElement. */
export interface UfoAtHomeMessages extends InputFileMessages {
  /** What starts a new observation, in a blank editor; and its tooltip. */
  newFile: string
  newFileHint: string
  /** What opens a file; and its tooltip, saying where it opens. */
  open: string
  openHint: string
  /** Under the picker: what can be picked together. */
  openTogether: string
  /** Over the files opened lately. */
  recentHeading: string
  /** When there are none. */
  recentNone: string
  /** How a recent file is opened again: at its address, read again from the disk, or from the copy this browser kept. */
  recentAddress: string
  recentHandles: string
  recentCopy: string
  /** What takes a recent file off the list. */
  recentRemove: string
  /** When what was picked holds no reconstruction. */
  noJson: string
  /** When what was asked could not be opened. */
  openFailed: string
}
