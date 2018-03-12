import {Length} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Length";
import {Weight} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Weight";
import {Actor} from "./ActorImpl";
import {Identity} from "./IdentityImpl";

/**
 * A single physical and intelligent being.
 */
export class Being extends Actor {
  /**
   * The being's height, in meters
   */
  height: Length;

  /**
   * The being's weight, in kilograms
   */
  weight: Weight;

  constructor(identity: Identity, birth?) {
    super(identity, birth);
  }
}