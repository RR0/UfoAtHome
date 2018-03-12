import {Moment} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {Duration} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Duration";
import {Category} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Category";
import {Classification} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Classification";
import {Being} from "../actor/BeingImpl";
import {Event} from "./Event";

/**
 * Being's birth Reference Implementation.
 */
export class BirthImpl extends Event {
  private being: Being;

  constructor(somePeople: Being, someDate: Moment) {
    super("Birth of " + somePeople, someDate);
  }

  public getForcedCategory(classification: Classification): Category {
    return null;
  }

  public getDuration(): Duration {
    return null;  // TODO
  }

  public getDate(): Moment {
    return getEnd();
  }
}
