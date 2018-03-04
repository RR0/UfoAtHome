package org.rr0.im.business.event;

import java.util.Enumeration;

/**
 * <p/>
 * A chronologicaly ordered collection of events,
 * with an acceptable interval of time between events.
 * </p>
 * <p/>
 * A TimeLine can be viewed as a coarse-grained event.
 * </p>
 *
 * @author Jérôme Beau
 * @version 14 juil. 2003 17:35:36
 */
public interface TimeLine extends Event {
    /**
     * Returns the collection of Events, in their chronological order.
     *
     * @return
     * @associates <{org.rr0.im.business.event.Event}>
     * @supplierCardinality 0..*
     * @supplierRole timeline events
     */
    Enumeration iterator();

    /**
     * Adds a event to the TimeLine.
     *
     * @param event The event to add.
     */
    void add(Event event);

    /**
     * @return The events' count in this timeline
     */
    int size();
}
