package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Moment;

/**
 * Being's birth Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 5 juil. 2003 11:56:21
 */
public interface Birth extends Event
{
    /**
     * @return The birth date.
     */
    Moment getDate ();
}
