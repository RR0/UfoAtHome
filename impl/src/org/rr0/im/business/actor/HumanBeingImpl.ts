import {Being} from "./BeingImpl";
import {Identity} from "./IdentityImpl";

/**
 * A human being
 */
export class HumanBeingImpl extends Being {

  constructor(identity: Identity, birth?) {
    super(identity, birth);
  }
}
