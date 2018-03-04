package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.TimeLine;

import java.util.Calendar;
import java.util.Date;

/**
 * Moment Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 00:17:49
 */
public class PreciseMomentImpl implements PreciseMoment {
    protected final Calendar calendar = Calendar.getInstance();

    protected PreciseMomentImpl() {
    }

    public PreciseMomentImpl(int someYear, int someMonth, int someDay) {
        synchronized (calendar) {
            calendar.set(Calendar.YEAR, someYear);
            calendar.set(Calendar.MONTH, someMonth);
            calendar.set(Calendar.DAY_OF_MONTH, someDay);
        }
    }

    public PreciseMomentImpl(int someYear, int someMonth, int someDay, int someHours, int someMinutes) {
        this(someYear, someMonth, someDay);
        synchronized (calendar) {
            calendar.set(Calendar.HOUR, someHours);
            calendar.set(Calendar.MINUTE, someMinutes);
        }
    }

    public PreciseMomentImpl(long time) {
        calendar.setTimeInMillis(time);
    }

    /**
     * Compute a date of a being given the current year and its current age.
     *
     * @param someCurrentYear
     * @param someAge
     */
    public static PreciseMoment yearsAgoInstance(int someCurrentYear, int someAge) {
        PreciseMomentImpl preciseMoment = new PreciseMomentImpl();
        Calendar calendar = preciseMoment.getCalendar();
        synchronized (calendar) {
            calendar.set(Calendar.YEAR, someCurrentYear);
            for (int i = 0; i < someAge; i++) {
                calendar.roll(Calendar.YEAR, false);
            }
        }
        return preciseMoment;
    }

    /**
     * Compute a date of a being given the current year and its current age.
     *
     * @param someAge
     */
    public static PreciseMoment yearsAgoFromNowInstance(int someAge) {
        PreciseMomentImpl preciseMoment = new PreciseMomentImpl();
        Calendar calendar = preciseMoment.getCalendar();
        synchronized (calendar) {
            for (int i = 0; i < someAge; i++) {
                calendar.roll(Calendar.YEAR, false);
            }
        }
        return preciseMoment;
    }

    public void setTime(long time) {
        calendar.setTime(new Date(time));
    }

    public long getTime() {
        return getCalendar().getTime().getTime();
    }

    public Calendar getCalendar() {
        return calendar;
    }

    public boolean isBefore(Moment otherMoment) {
        boolean isBefore;
        if (otherMoment instanceof PreciseMoment) {
            isBefore = getTime() < ((PreciseMoment) otherMoment).getTime();
        } else {
            throw new RuntimeException("Not implemented");
        }
        return isBefore;
    }

    /**
     * If this moment is chronologically after an other moment
     *
     * @param otherMoment The other moment
     * @return If this moment is after the other one.
     */
    public boolean isAfter(Moment otherMoment) {
        boolean isAfter;
        if (otherMoment instanceof PreciseMoment) {
            isAfter = getTime() > ((PreciseMoment) otherMoment).getTime();
        } else {
            throw new RuntimeException("Not implemented");
        }
        return isAfter;
    }

    public PreciseMoment minus(Duration duration) {
        return new PreciseMomentImpl(getTime() - getDuration().getMilliseconds());
    }

    public Moment getBegining() {
        throw new RuntimeException("Not implemented");
    }

    /**
     * A set of events about the life of that being
     *
     * @return A collection of Events
     * @associates <{org.rr0.im.business.event.Event}>
     * @supplierRole history/bio
     * @supplierCardinality 1..*
     */
    public TimeLine getHistory() {
        throw new RuntimeException("No history available for precise moments");
    }

    public Moment getEnd() {
        throw new RuntimeException("Not implemented");
    }

    public Duration getDuration() {
        //        return DurationImpl.getInstance(getBegining(), getEnd());
        throw new RuntimeException("Not implemented");
    }

}
