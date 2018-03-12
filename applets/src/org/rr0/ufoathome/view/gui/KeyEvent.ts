/**
 * @deprecated
 */
import {EventObject} from "./EventObject";

export class KeyEvent extends EventObject{
  private code: Number;
  static VK_UP = 0;

  preventDefault() {

  }

  getKeyCode(): number {
    return this.code;
  }
}