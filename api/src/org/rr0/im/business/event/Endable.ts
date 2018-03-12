import {Moment} from "./circumstance/Moment";
import {Timeable} from "../../../../../../../impl/src/org/rr0/im/business/event/TimeableImpl";
import {Duration} from "./circumstance/Duration";
import {PreciseMoment} from "../../../../../../../impl/src/org/rr0/im/business/event/circumstance/PreciseMoment";

/**
 * Something that have a end time.
 */
export class Endable extends Timeable {

  constructor(beginning: Moment, public end?: Moment) {
    super(beginning);
  }

  getDuration(): Duration {
    const endMoment = this.end != null ? this.end : new PreciseMoment(Date.now());
    return Duration.getInstance(<PreciseMoment> this.when, <PreciseMoment> endMoment);
  }
}