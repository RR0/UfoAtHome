package org.rr0.im.business.report;

import org.rr0.im.business.event.Event;

import java.util.List;

/**
 * @author Jérôme Beau
 * @version 27 avr. 2007 23:02:02
 */
public interface EventsAccount extends Account {

    List<Event> getEvents();
}
