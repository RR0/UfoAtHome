package org.rr0.im.business.event.circumstance;

import java.util.GregorianCalendar;

/**
 * Fuzzy Moment implementation.
 *
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public class MomentFactory {
    public static Moment getSunsetMoment(Moment day, Location place) {
        PreciseMomentImpl preciseMoment = null;
        if (day instanceof PreciseMomentImpl) {
            PreciseMomentImpl intervalMoment = (PreciseMomentImpl) day;
            preciseMoment = new PreciseMomentImpl();
            preciseMoment.setTime(intervalMoment.getTime());

            // TODO(JBE): Compute from day and place
            preciseMoment.calendar.set(GregorianCalendar.HOUR, 20);
            preciseMoment.calendar.set(GregorianCalendar.MINUTE, 00);
        }
        return preciseMoment;
    }
}
