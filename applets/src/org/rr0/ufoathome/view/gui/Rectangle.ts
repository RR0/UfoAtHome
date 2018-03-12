/**
 * @deprecated
 */
import {Dimension} from "./Dimension";

export class Rectangle {
  constructor(public x?: number, public y?: number, public width?: number, public height?: number) {

  }

  getSize() : Dimension {
    return new Dimension(this.width, this.height);
  }
}