package org.rr0.im.business.evidence;

import org.rr0.im.business.actor.Actor;

import java.util.Locale;

/**
 * A textual record.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:14:38
 */
public interface Document extends Record {

    Actor getAuthor ();

    String getTitle ();

    /**
     * Words are counted between punctuation like " ,'.:?;!()[]/{}+=
     * @param locale The locale of the document text to count words of.
     * @return The word count of the document's text, if any.
     * -1 if no plain text is available.
     */
    int getWordCount (Locale locale);

    /**
     * Get the document plain text, if available.
     * @param locale The locale of the document text to get.
     * @return A String, or null if not available.
     */
    String getText (Locale locale);

    void setText (String text, Locale locale);
}
