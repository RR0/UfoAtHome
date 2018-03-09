import {DrawEvent} from "./DrawEvent";

export interface DrawListener {
  eventSelected(event: DrawEvent);

  eventRecorded(event: DrawEvent);

  eventDeleted(event: DrawEvent);

  backgroundClicked();
}
