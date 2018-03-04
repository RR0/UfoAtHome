package org.rr0.im.business.actor;

/**
 * An actor's relationship with another actor.
 *
 * @author Jérôme Beau
 * @version 5 juil. 2003 20:12:08
 */
public interface Relationship
{
    /**
     * The relationship destination.
     * @return
     * @associates <{org.rr0.im.business.actor.Actor}>
     * @supplierRole destination
     */
    public Actor getActor();

    /**
     * The relationship type.
     * @return
     */
    public String getType();
}
