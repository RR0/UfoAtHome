package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Moment;

/**
 * @author Jérôme Beau
 * @version 19 juil. 2003 18:03:29
 */
public interface Timeable extends Durable {
    /**
     * @associates <{org.rr0.im.business.event.circumstance.Moment}>
     * @supplierRole begining moment
     */
    Moment getBegining();

    /**
     * A set of events about the life of that being
     *
     * @return A collection of Events
     * @associates <{org.rr0.im.business.event.TimeLine}>
     * @supplierRole history/bio
     * @supplierCardinality 1..*
     */
    TimeLine getHistory();
}
