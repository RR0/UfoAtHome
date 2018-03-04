package org.rr0.im.business.evidence;

import org.rr0.im.business.event.Timeable;
import org.rr0.im.business.report.Source;

import java.util.Locale;

/**
 * A persistent data.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:23:03
 */
public interface Record extends Source, Timeable {

    /**
     * @param mimeType The desired content type such as "text/plain", "image/jpeg", "video/mpeg", "url", etc.
     * @param locale The desired locale, such as en_US, en_UK, fr_FR, fr_CA, etc.
     * @return The document's content
     */
    Object getContent (String mimeType, Locale locale);

    /**
     * @param mimeType The content type such as "text/plain", "image/jpeg", "video/mpeg", "url", etc.
     * @param locale The content's locale, such as en_US, en_UK, fr_FR, fr_CA, etc.
     */
    void setContent (String mimeType, Object content, Locale locale);
}
