package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.Endable;

/**
 * A moment in the time.
 * This class is different from java.util.Date or java.util.Calendar as it is the root
 * of a moment-in-the-time taxonomy that allows to define precise date, fuzzy dates, etc.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:35:50
 */
public interface Moment extends Endable {

    /**
     * If this moment is chronologically before an other moment
     * @param otherMoment The other moment
     * @return If this moment is before the other one.
     */
    boolean isBefore (Moment otherMoment);

    /**
     * If this moment is chronologically after an other moment
     * @param otherMoment The other moment
     * @return If this moment is after the other one.
     */
    boolean isAfter (Moment otherMoment);
}
