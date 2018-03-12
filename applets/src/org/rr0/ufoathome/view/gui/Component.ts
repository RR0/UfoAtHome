import {ActionEvent} from "./ActionEvent";
import {Rectangle} from "./Rectangle";
import {Color} from "./Color";
import {Dimension} from "./Dimension";
import {Graphics} from "./Graphics";
import {Cursor} from "./Cursor";
import {MouseListener} from "./MouseListener";

/**
 * @deprecated
 */
export class Component {
  private enabled: boolean;
  private dimension: Dimension;
  private graphics: Graphics;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(e) {
    this.enabled = e;
  }
  addActionListener(actionListener: { actionPerformed: { (actionEvent: ActionEvent): void; (actionEvent: ActionEvent) } }) {

  }

  setBounds(newBounds: Rectangle) {

  }

  setBackground(color: Color) {

  }

  fireMessage(s: string, param2) {

  }

  getSize(): Dimension {
    return this.dimension;
  }

  getGraphics() : Graphics {
    return this.graphics;
  }

  setCursor(cursor: Cursor) {
  }

  addMouseListener(l: MouseListener) {

  }
}