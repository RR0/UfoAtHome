package org.rr0.im.business.report;

import org.rr0.im.business.event.circumstance.Moment;

/**
 * Account Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:56:42
 */
public class TextAccountImpl extends AccountImpl {
    private String text;

    public TextAccountImpl(String title, Source source, Moment date, String text) {
        super(title, source, date);
        this.text = text;
    }

    public Object getContent() {
        return text;
    }
}
