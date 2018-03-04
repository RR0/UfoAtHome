package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Duration;
import org.rr0.im.business.event.circumstance.PreciseMoment;

/**
 * Duration Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 18 juin 2003 21:41:52
 */
public class DurationImpl implements Duration
{
    private long time;

    public DurationImpl (long time) {
        this.time = time;
    }

    public double getYears() {
        return getMonths() / 12;
    }

    public double getMonths() {
        return getDays() / 30;
    }

    public double getWeeks() {
        return getDays() / 7;
    }

    public double getDays() {
        return getHours() / 24;
    }

    public double getHours () {
        return getMinutes() / 60;
    }

    public long getMinutes() {
        return getSeconds() / 60;
    }

    public long getSeconds() {
        return time / 1000;
    }

    public long getMilliseconds() {
        return time;
    }

    public static Duration getInstance (PreciseMoment beginMoment, PreciseMoment endMoment) {
        Duration duration;
        duration = new DurationImpl (endMoment.getTime() - beginMoment.getTime());
        return duration;
    }
}
