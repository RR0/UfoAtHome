package org.rr0.im.business.event;

import org.rr0.im.business.actor.Actor;
import org.rr0.im.business.event.circumstance.Moment;

/**
 * @author Jerôme Beau
 * @version 17 avr. 2004 15:28:29
 */
public class RelationshipImpl extends EventImpl implements Relationship {
    private Actor subject;
    private Actor object;

    public RelationshipImpl(String title, Moment startDate) {
        super(title, startDate);
    }

    public Actor getSubject() {
        return subject;
    }

    public Actor getObject() {
        return object;
    }

    public void setSubject(Actor subject) {
        this.subject = subject;
    }

    public void setObject(Actor object) {
        this.object = object;
    }
}
