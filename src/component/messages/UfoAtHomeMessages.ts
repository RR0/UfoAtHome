import type { InputFileMessages } from "../InputFileElement.js"
import type { ConsentMessages } from "./ConsentMessages.js"

/** What the application element says around the reader and the editor it holds — see UfoAtHomeElement. */
export interface UfoAtHomeMessages extends InputFileMessages, ConsentMessages {
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
  /** When the case template the page names (see UfoAtHomeElement's `case-template`) could not be read: New starts nothing. */
  caseTemplateFailed: string
  /**
   * The case template in use, in the Open menu (see LocalCaseTemplate): its heading; none; the page's (`{title}`); the reader's, from the file
   * `{file}` kept in this browser; the picker's hint; what forgets it; that it was kept; that the modules a file names come without their scripts.
   */
  templateHeading: string
  templateNone: string
  templateFromPage: string
  templateFromFile: string
  templateLoadHint: string
  templateForget: string
  templateKept: string
  templateModulesWithoutScripts: string
  /** The reader's template read at an address (`{url}`); that the modules it names run their code, the reader having agreed. */
  templateFromAddress: string
  templateModulesRun: string
}
