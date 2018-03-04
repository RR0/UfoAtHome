package org.rr0.im.business.event;

import org.rr0.im.business.event.circumstance.Place;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.actor.Actor;

/**
 * @author Jérôme Beau
 * @version 27 avr. 2007 23:30:52
 */
public class LeaveEventImpl extends EventImpl implements LeaveEvent {
    private Place from;
    private Place to;

    public LeaveEventImpl(Moment when, Actor who, Place from, Place to) {
        super(who, "leaves from " + from + " to " + to, when, from);
        this.from = from;
        this.to = to;
    }

    public LeaveEventImpl(Moment when, Actor who, Place from) {
        this (when, who, from, Place.UNKNOWN);
    }
}
