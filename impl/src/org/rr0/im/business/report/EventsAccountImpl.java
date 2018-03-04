package org.rr0.im.business.report;

import org.rr0.im.business.event.Event;
import org.rr0.im.business.event.circumstance.Moment;

import java.util.Vector;
import java.util.List;
import java.util.ArrayList;

/**
 * Account Reference Implementation.
 *
 * @author <a href="mailto:rr0@rr0.org>Jerome Beau</a>
 * @version $revision$
 */
public class EventsAccountImpl extends AccountImpl implements EventsAccount {
    private List<Event> events;

    public EventsAccountImpl(String title, Source source, Moment date, List<Event> events) {
        super(title, source, date);
        this.events = events;
    }

    public EventsAccountImpl(String title, Source source, Moment date) {
        this(title, source, date, new ArrayList<Event>());
    }

    /**
     * The events reported.
     *
     * @return
     */
    public Object getContent() {
        return getEvents();
    }

    public List<Event> getEvents() {
        return events;
    }
}
