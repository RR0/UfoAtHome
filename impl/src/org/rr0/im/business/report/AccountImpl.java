package org.rr0.im.business.report;

import org.rr0.im.business.event.EventImpl;
import org.rr0.im.business.event.circumstance.Moment;

/**
 * Account Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:56:42
 */
public abstract class AccountImpl extends EventImpl implements Account {
    private Source source;
    private Object content;

    public AccountImpl(String title, Source source, Moment date) {
        super(title, date);
        this.source = source;
    }

    public Source getSource() {
        return source;
    }

    public void setSource(Source source) {
        this.source = source;
    }

    public Object getContent() {
        return content;
    }

    public void setContent(Object content) {
        this.content = content;
    }
}
