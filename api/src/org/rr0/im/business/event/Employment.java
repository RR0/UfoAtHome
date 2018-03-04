package org.rr0.im.business.event;

import org.rr0.im.business.actor.Actor;
import org.rr0.im.business.actor.Occupation;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 4 juil. 2003 09:03:31
 */
public interface Employment extends Event
{
    /**
     * @associates <{org.rr0.im.business.actor.Actor}>
     * @supplierRole employer 
     */
    Actor getEmployer();

    /**
     * @associates <{org.rr0.im.business.actor.Occupation}>
     * @supplierRole occupation 
     */
    Occupation getOccupation();
}
