import {MessageEditable} from "../../view/gui/MessageEditable";

export interface MessageProducer {
  /**
   * Send a text message to our message listeners.
   *
   * @param message
   * @param editable
   */
  fireMessage(message: String, editable: MessageEditable): void;
}
