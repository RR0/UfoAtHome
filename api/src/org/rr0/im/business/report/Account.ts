//package org.rr0.im.business.report;

import {Timeable} from "../event/Timeable";
import {Source} from "./Source";

/**
 * A set of reported Events by a Source.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:56:42
 */
export interface Account extends Timeable {
  /**
   * The reporting source. May be some people, a newspaper article, etc.
   *
   * @associates <{org.rr0.im.business.report.Source}>
   * @supplierRole reportsource
   */
  getSource(): Source;

  setSource (source: Source): void;

  /**
   * Get the accounts contents
   *
   * @return The text of the free report.
   */
  getContent(): Object;

  setContent(content: Object): void;
}
