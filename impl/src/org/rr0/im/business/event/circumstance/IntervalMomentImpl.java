package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.TimeLine;

/**
 * Fuzzy Moment implementation.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 00:17:49
 */
public class IntervalMomentImpl implements Moment {
    private Moment endMoment;
    private Moment beginingMoment;

    public IntervalMomentImpl(Moment beginingMoment, Moment endMoment) {
        this.beginingMoment = beginingMoment;
        this.endMoment = endMoment;
    }

    public Moment minus(Duration duration) {
        Moment newBeginingMoment = beginingMoment.minus(duration);
        Moment newEndMoment = beginingMoment.minus(duration);
        return new IntervalMomentImpl(newBeginingMoment, newEndMoment);
    }

    public boolean isBefore(Moment otherMoment) {
        boolean isBefore = otherMoment.isBefore(beginingMoment);
        return isBefore;
    }

    /**
     * If this moment is chronologically after an other moment
     *
     * @param otherMoment The other moment
     * @return If this moment is after the other one.
     */
    public boolean isAfter(Moment otherMoment) {
        boolean isAfter = otherMoment.isAfter(endMoment);
        return isAfter;
    }

    public Moment getBegining() {
        return beginingMoment;
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
        throw new RuntimeException("No history available for such a moment");
    }

    public Moment getEnd() {
        return endMoment;
    }

    public Duration getDuration() {
        return DurationImpl.getInstance((PreciseMoment)beginingMoment, (PreciseMoment) endMoment);
    }

}
