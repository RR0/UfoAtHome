package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Duration;
import org.rr0.im.business.event.circumstance.DurationImpl;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.PreciseMoment;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;

/**
 * Timeable object Reference Implementation.
 *
 * @author J�r�me Beau
 * @version 19 juil. 2003 17:54:23
 */
public class TimeableImpl implements Endable {
    protected TimeLine history;
    private Moment beginingMoment;
    private Moment endMoment;
    private String title;

    public TimeableImpl(String title) {
        setTitle(title);
    }

    public TimeableImpl(String name, Moment beginingMoment) {
        this(name);
        this.beginingMoment = beginingMoment;
    }

    public Moment getBegining() {
        return beginingMoment;
    }

    public Moment getEnd() {
        return endMoment;
    }

    public void setEndMoment(Moment endMoment) {
        this.endMoment = endMoment;
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
        return history;
    }

    public Duration getDuration() {
        Moment endMoment = getEnd() != null ? getEnd() : new PreciseMomentImpl(System.currentTimeMillis());
        return DurationImpl.getInstance((PreciseMoment) beginingMoment, (PreciseMoment) endMoment);
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TimeableImpl)) return false;

        final TimeableImpl timeable = (TimeableImpl) o;

        if (!title.equals(timeable.title)) return false;

        return true;
    }

    public int hashCode() {
        return title.hashCode();
    }

    /**
     * Compares this object with the specified object for order.  Returns a
     * negative integer, zero, or a positive integer as this object is less
     * than, equal to, or greater than the specified object.<p>
     * <p/>
     * In the foregoing description, the notation
     * <tt>sgn(</tt><i>expression</i><tt>)</tt> designates the mathematical
     * <i>signum</i> function, which is defined to return one of <tt>-1</tt>,
     * <tt>0</tt>, or <tt>1</tt> according to whether the value of <i>expression</i>
     * is negative, zero or positive.
     * <p/>
     * The implementor must ensure <tt>sgn(x.compareTo(y)) ==
     * -sgn(y.compareTo(x))</tt> for all <tt>x</tt> and <tt>y</tt>.  (This
     * implies that <tt>x.compareTo(y)</tt> must throw an exception iff
     * <tt>y.compareTo(x)</tt> throws an exception.)<p>
     * <p/>
     * The implementor must also ensure that the relation is transitive:
     * <tt>(x.compareTo(y)&gt;0 &amp;&amp; y.compareTo(z)&gt;0)</tt> implies
     * <tt>x.compareTo(z)&gt;0</tt>.<p>
     * <p/>
     * Finally, the implementer must ensure that <tt>x.compareTo(y)==0</tt>
     * implies that <tt>sgn(x.compareTo(z)) == sgn(y.compareTo(z))</tt>, for
     * all <tt>z</tt>.<p>
     * <p/>
     * It is strongly recommended, but <i>not</i> strictly required that
     * <tt>(x.compareTo(y)==0) == (x.equals(y))</tt>.  Generally speaking, any
     * class that implements the <tt>Comparable</tt> interface and violates
     * this condition should clearly indicate this fact.  The recommended
     * language is "Note: this class has a natural ordering that is
     * inconsistent with equals."
     *
     * @param o the Object to be compared.
     * @return a negative integer, zero, or a positive integer as this object
     *         is less than, equal to, or greater than the specified object.
     * @throws ClassCastException if the specified object's type prevents it
     *                            from being compared to this Object.
     */
    public int compareTo(Object o) {
        Event otherEvent = (Event) o;
        int comparison = 0;
        if (!this.equals(otherEvent)) {
            if (getBegining() != otherEvent.getBegining()) {
                comparison = getBegining().isBefore(otherEvent.getBegining()) ? -1 : +1;
            } else {
                comparison = +1;
            }
        }
        return comparison;
    }
}
