import {Category} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Category";
import {Classification} from "../../../../../../../api/src/org/rr0/im/service/function/classification/Classification";
import {Identity} from "./IdentityImpl";
import {Endable} from "../../../../../../../api/src/org/rr0/im/business/event/Endable";

/**
 * An subject producing ufological events through its actions.
 * Events related such an Actor are recorded in its history TimeLine.
 */
export abstract class Actor extends Endable {
  /**
   * The actor's name
   */
  identities = [];

  constructor(identity: Identity, birth?, death?) {
    super(birth, death);
    this.identities.push(identity);
  }

  /**
   * @param classification Some function.
   * @return The Category in which that Classifiable has been forced to be classified in for that Classification.
   *         null if no Category has been forced for that Classifiable.
   */
  public getForcedCategory(classification: Classification): Category {
    return null;
  }
}
