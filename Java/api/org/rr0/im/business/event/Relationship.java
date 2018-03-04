package org.rr0.im.business.event;

import org.rr0.im.business.actor.Actor;

/**
 * An event involving a interaction between two actors.
 *
 * @author Jérôme Beau
 * @version 5 juil. 2003 20:12:08
 */
public interface Relationship extends Event {
    /**
     * The relationship destination.
     *
     * @return The actor that is the initiator of this relationship
     * @associates <{org.rr0.im.business.actor.Actor}>
     * @supplierRole destination
     */
    public Actor getSubject();

    /**
     * The relationship type.
     *
     * @return The actor that is affected by this relationship.
     */
    public Actor getObject();

    void setSubject(Actor subject);

    void setObject(Actor object);
}
