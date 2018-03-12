import {ActionListener} from "./ActionListener";
import {ShapeButton} from "./ShapeButton";
import {ActionEvent} from "./ActionEvent";

export class ShapeButtonGroup implements ActionListener {
  private buttons = [];

  public add(button: ShapeButton) {
    this.buttons.push(button);
    button.addActionListener(this);
  }

  /**
   * Invoked when an action occurs.
   */
  public actionPerformed(e: ActionEvent) {
    const enumeration = this.buttons.elements();
    while (enumeration.hasMoreElements()) {
      const button = (ShapeButton)
      enumeration.nextElement();
      if (button != e.getSource()) {
        button.released();
//            } else {
//                button.pushed();
      }
    }
  }

  public reset() {
    const enumeration = this.buttons.elements();
    while (enumeration.hasMoreElements()) {
      const button = (ShapeButton)
      enumeration.nextElement();
      button.released();
    }
  }

  public isPushed(): boolean {
    const enumeration = this.buttons.elements();
    while (enumeration.hasMoreElements()) {
      const button = <ShapeButton> enumeration.nextElement();
      if (button.isPushed()) {
        return true;
      }
    }
    return false;
  }

  public setEnabled(b: boolean) {
    const enumeration = this.buttons.elements();
    while (enumeration.hasMoreElements()) {
      const button = (ShapeButton)
      enumeration.nextElement();
      button.setEnabled(b);
    }
  }
}
