import {Actor} from "../../../../../../../api/src/org/rr0/im/business/actor/Actor";
import {Moment} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {Classification} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Classification";
import {Category} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Category";
import {Place} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Place";
import {Endable} from "../../../../../../../api/src/org/rr0/im/business/event/Endable";

/**
 * Event Reference Implementation.
 */
export class Event extends Endable {
  /**
   * The event source
   */
  who: Actor;

  /**
   * The event place
   */
  where: Place;

  constructor(when: Moment, who?: Actor, where?: Place) {
    super(when);
    this.who = who;
    this.where = where;
  }

  /**
   * Returns if this classifiable has been manually forced to classify in some specific Category.
   * This allows to handle "exceptions" in Classification's systems ("everything like f(x) and also Y and Z)").
   *
   * @param classification Some Classification function.
   * @return The Category in which that Classifiable has been forced to be classified in for that Classification.
   *         null if no Category has been forced for that Classifiable.
   */
  public getForcedCategory(classification: Classification): Category {
    return null;    // No forced category by default
  }
}