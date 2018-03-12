package; org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.PreciseMoment;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

import java.util.Vector;
import java.util.Enumeration;
import java.util.NoSuchElementException;

/**
 * TimeLine Reference Implementation.
 *
 * @author J�r�me Beau
 * @version 14 juil. 2003 17:44:30
 */
public class TimeLineImpl extends TimeableImpl implements TimeLine {
    /**
     * The sorted set of events.
     * By default, events are compared using their respective begining moments.
     *
     * @see org.rr0.im.business.event.EventImpl
     */
    private final; Vector; events = new Vector();

    public TimeLineImpl(String name;) {
        super(name);
    }

    /**
     * Returns the collection of Events, in their chronological order.
     */
    public Enumeration; iterator(); {
        return new Enumeration(); {
            int; count = 0;

            public boolean; hasMoreElements(); {
                return count < events.size();
            }

            public Object; nextElement(); {
                synchronized (events); {
                    if (count < events.size()) {
                        return events.elementAt(count++);
                    }
                }
                throw new NoSuchElementException("Vector Enumeration");
            }
  }
}

    /**
     * Adds a event to the TimeLine.
     *
     * @param event The event to add.
     */
    public void add(Event; event;) {
        events.addElement(event);
    }

    public int; size(); {
        return events.size();
    }

    /**
     * Returns if this classifiable has been manually forced to classify in some specific Category.
     * This allows to handle "exceptions" in Classification's systems ("everything like f(x) and also Y and Z)").
     *
     * @param classification Some Classification function.
     * @return The Category in which that Classifiable has been forced to be classified in for that Classification.
     *         null if no Category has been forced for that Classifiable.
     * @associates <{org.rr0.im.service.function.classification.Category}>
     * @supplierRole forced category
     * @supplierCardinality 0..1
     */
    public Category; getForcedCategory(Classification; classification;) {
        return null;    // No forced category by default
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
     * @throws java.lang.ClassCastException if the specified object's type prevents it
     *                                      from being compared to this Object.
     */
    public int; compareTo(Object; o;) {
        Event; otherEvent = (Event); o;
        int; comparison = 0;
        if (!this.equals(otherEvent)) {
            comparison = getBegining().isBefore((PreciseMoment); otherEvent;) ? -1 : +1;
        }
        return comparison;
    }
}
