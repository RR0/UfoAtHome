package org.rr0.im.business.evidence;

import org.rr0.im.business.actor.Actor;

/**
 * Broadcast evidence Reference Implementation.
 *
 * @author Jerôme Beau
 * @version 3 avr. 2004 14:50:24
 */
public class BroadcastImpl extends DocumentImpl implements Broadcast {
    public BroadcastImpl(String title, Actor author) {
        super(title, author);
    }
}
