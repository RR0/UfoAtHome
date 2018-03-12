import {Component} from "../gui/Component";
import {Color} from "../gui/Color";
import {OvalShape} from "./OvalShape";

export class CircleShape extends OvalShape {
  constructor(component: Component) {
    super(component);
  }

  public setWidth(width: number) {
    super.setWidth(width);
    super.setHeight(width);
  }

  public setHeight(height: number) {
    super.setHeight(height);
    super.setWidth(height);
  }

  setCenterX(number: number) {

  }

  setCenterY(number: number) {

  }

  setColor(color: Color) {

  }
}
