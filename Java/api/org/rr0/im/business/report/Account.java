package org.rr0.im.business.report;

import org.rr0.im.business.event.Timeable;

/**
 * A set of reported Events by a Source.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 15:56:42
 */
public interface Account extends Timeable {
    /**
     * The reporting source. May be some people, a newspaper article, etc.
     *
     * @associates <{org.rr0.im.business.report.Source}>
     * @supplierRole reportsource
     */
    Source getSource();

    void setSource (Source source);

    /**
     * Get the accounts contents
     *
     * @return The text of the free report.
     */
    Object getContent();

    void setContent(Object content);
}
