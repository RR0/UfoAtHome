package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Duration;

/**
 * Something that last for some time.
 *
 * @author Jérôme Beau
 * @version 5 juil. 2003 11:09:05
 */
public interface Durable
{
    /**
     * @associates <{org.rr0.im.business.event.circumstance.Duration}> 
     */
    Duration getDuration();
}
