import {EventObject} from "../../view/gui/EventObject";

export class SkyEvent extends EventObject {
  protected value: Object;

  constructor(source: Object, value: Object) {
    super(source);
    this.value = value;
  }

  public getValue(): Object {
    return this.value;
  }
}
