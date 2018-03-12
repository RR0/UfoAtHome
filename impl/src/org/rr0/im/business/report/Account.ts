import {Source} from "../../../../../../../api/src/org/rr0/im/business/report/Source";
import {Moment} from "../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {Event} from "../event/Event";

/**
 * Account Reference Implementation.
 */
export abstract class Account extends Event {
  /**
   * The reporting source. May be some people, a newspaper article, etc.
   */
  source: Source;

  /**
   * The account contents
   */
  content: Object;

  constructor(date: Moment, source: Source) {
    super(date);
    this.source = source;
  }
}
