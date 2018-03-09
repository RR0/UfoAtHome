//package org.rr0.im.business.event;

import {Timeable} from "./Timeable";
import {Moment} from "./circumstance/Moment";

/**
 * Something that have a unique start time (and optionnaly end time).
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 18:05:12
 */
export interface Endable extends Timeable {
  /**
   * @associates <{org.rr0.im.business.event.circumstance.Moment}>
   * @supplierRole end moment
   */
  getEnd (): Moment;
}
