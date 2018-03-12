import {Duration} from "./Duration";

/**
 * A moment in the time.
 * This class is different from java.util.Date or java.util.Calendar as it is the root
 * of a moment-in-the-time taxonomy that allows to define precise date, fuzzy dates, etc.
 */
export interface Moment {
  /**
   * If this moment is chronologically before an other moment
   * @param otherMoment The other moment
   * @return If this moment is before the other one.
   */
  isBefore (otherMoment: Moment): boolean;

  /**
   * If this moment is chronologically after an other moment
   * @param otherMoment The other moment
   * @return If this moment is after the other one.
   */
  isAfter (otherMoment: Moment): boolean;

  minus(duration: Duration): Moment;
}
