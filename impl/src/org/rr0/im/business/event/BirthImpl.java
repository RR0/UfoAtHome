package org.rr0.im.business.event;

import org.rr0.im.business.actor.Being;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.event.circumstance.Moment;
import org.rr0.im.business.event.circumstance.Duration;
import org.rr0.im.business.event.Birth;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

/**
 * Being's birth Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:40:27
 */
public class BirthImpl extends EventImpl implements Birth
{
    private Being being;
    public BirthImpl(Being somePeople, Moment someDate) {
        super("Birth of " + somePeople, someDate);
    }

    public Category getForcedCategory (Classification classification) {
        return null;
    }

    public Duration getDuration () {
        return null;  // TODO
    }

    public Moment getDate() {
        return getEnd();
    }
}
