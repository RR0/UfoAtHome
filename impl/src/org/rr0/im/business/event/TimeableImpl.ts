import {Moment} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {TimeLine} from "../../../../../../../api/src/org/rr0/im/business/event/TimeLine";

/**
 * Timeable object Reference Implementation.
 */
export class Timeable {
  /**
   * A set of events
   */
  history: TimeLine;

  when: Moment;

  constructor(when?: Moment) {
    this.when = when;
  }
}
