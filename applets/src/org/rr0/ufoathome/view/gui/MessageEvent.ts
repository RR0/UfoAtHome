import {EventObject} from "./EventObject";
import {MessageEditable} from "./MessageEditable";

export class MessageEvent extends EventObject {
  private message: string;
  private editable: MessageEditable;

  constructor(source: Object, message: String, editable: MessageEditable) {
    super(source);
    this.message = message;
    this.editable = editable;
  }

  public getEditable(): MessageEditable {
    return this.editable;
  }

  public getText(): string {
    return this.message;
  }
}