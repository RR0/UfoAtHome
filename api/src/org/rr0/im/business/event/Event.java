package org.rr0.im.business.event;

import org.rr0.im.service.function.classification.Classifiable;

/**
 * <p>An Event of interest, such as an ufological event (Sighting, InvestigationAct, etc.)
 * or a more common one (Employment, Birth, etc.).</p>
 * <p>An event can be considered as sentence stating what happened.
 * The event type can be considered as the verb, and other Event's attributes
 * as subject, object, etc.
 * Every Event is :<ul>
 * <li>Endable : it has a start and end time</li>
 * <li>Classifiable : it is submittable to a Classification function that put it in one of its Categories</li>
 * </p>
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:26:01
 */
public interface Event extends Classifiable, Endable {
    String getTitle();
}
