import {Endable} from "../event/Endable";
import {Identity} from "./Identity";

/**
 * An subject producing ufological events through its actions.
 * Events related such an Actor are recorded in its history TimeLine.
 */
export interface Actor extends Endable {
  /**
   * The actor's name
   *
   * @supplierCardinality 1..*
   */
  getIdentities(): Identity[];

  addIdentity(newIdentity: Identity): void;

  addIdentity(newIdentity: string): void;
}
