import {EventObject} from "../gui/EventObject";
import {Calendar} from "../../Calendar";

export class AnimationEvent extends EventObject {
  private time: Calendar;

  public getTime(): Calendar {
    return this.time;
  }

  constructor(source: Object, currentTime: Calendar) {
    super(source);
    this.time = currentTime;
  }
}
