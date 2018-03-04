package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.Place;
import org.rr0.im.business.actor.Actor;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

/**
 * Event Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:40:10
 */
public class EventImpl extends TimeableImpl implements Event {
    /**
     * The event source
     */
    protected Actor who;

    /**
     * The event place
     */
    protected Place where;

    protected EventImpl(Actor who, String desc, Moment when, Place where) {
        super(desc, when);
        this.who = who;
        this.where = where;
    }

    public EventImpl(String title, Moment startDate) {
        super(title, startDate);
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
    public Category getForcedCategory(Classification classification) {
        return null;    // No forced category by default
    }

    public String toString() {
        String time;
        Moment begining = getBegining();
        if (begining.equals(getEnd())) {
            time = ""+getBegining();
        } else {
            time = begining + "-" + getEnd();
        }
        return time + " : At " + where + ", " + who + " " + getTitle();
    }
}
