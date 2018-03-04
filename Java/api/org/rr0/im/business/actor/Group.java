package org.rr0.im.business.actor;

import java.util.Collection;

/**
 *
 *
 * @author Jérôme Beau
 * @version 3 mai 2003 23:43:10
 */
public interface Group extends Actor {
    /**
     * @associates <{org.rr0.im.business.actor.Actor}>
     * @supplierCardinality 1..*
     * @link aggregation
     * @supplierRole members
     */
    Collection getMembers();
}
