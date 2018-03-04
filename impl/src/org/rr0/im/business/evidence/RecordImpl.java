package org.rr0.im.business.evidence;

import org.rr0.im.business.event.TimeableImpl;

import java.util.Hashtable;
import java.util.Locale;

/**
 * @author Jérôme Beau
 * @version 19 juil. 2003 18:08:28
 */
public class RecordImpl extends TimeableImpl {
    public RecordImpl(String title) {
        super(title);
    }

    /**
     * The document's content, indexed by a MIME Content type.
     * Content type may be "text/plain", "image/jpeg", "video/mpeg", "url", etc.
     */
    private Hashtable contents = new Hashtable();

    /**
     * @param mimeType The desired content type such as "text/plain", "image/jpeg", "video/mpeg", "url", etc.
     * @param locale   The desired locale, such as en_US, en_UK, fr_FR, fr_CA, etc.
     * @return The document's content
     */
    public Object getContent(String mimeType, Locale locale) {
        Hashtable typedContent = (Hashtable) contents.get(mimeType);
        Object localizedTypedContent = typedContent == null ? null : typedContent.get(locale);
        return localizedTypedContent;
    }

    /**
     * @param mimeType The content type such as "text/plain", "image/jpeg", "video/mpeg", "url", etc.
     * @param locale   The content's locale, such as en_US, en_UK, fr_FR, fr_CA, etc.
     */
    public void setContent(String mimeType, Object content, Locale locale) {
        Hashtable typedContent = (Hashtable) contents.get(mimeType);
        if (typedContent == null) {
            typedContent = new Hashtable();
            contents.put(mimeType, typedContent);
        }
        typedContent.put(locale, content);
    }
}
