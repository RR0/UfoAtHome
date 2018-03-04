package org.rr0.im.business.actor;

import org.rr0.im.business.event.Endable;

import java.util.Vector;

/**
 * An subject producing ufological events through its actions.
 * Events related such an Actor are recorded in its history TimeLine.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:35:11
 */
public interface Actor extends Endable {

    /**
     * The actor's name
     *
     * @associates <{org.rr0.im.business.actor.Identity}>
     * @supplierCardinality 1..*
     */
    Vector getIdentities();

    void addIdentity(Identity newIdentity);
}
