package org.rr0.im.business.evidence;

import org.rr0.im.business.actor.Actor;

import java.util.Locale;
import java.util.StringTokenizer;

/**
 * Document Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 18 juin 2003 20:56:45
 */
public abstract class DocumentImpl extends RecordImpl implements Document
{
    public static final String TEXT_CONTENT = "text";

    public static final String SUBTYPE_SEPARATOR = "/";
    public static final String PLAIN_TEXT_CONTENT = TEXT_CONTENT + SUBTYPE_SEPARATOR + "plain";

    /**
     * The document's author.
     * May be an organization, a human being, etc.
     */
    private Actor author;
    private String title;

    public Actor getAuthor () {
        return author;
    }

    public String getTitle () {
        return title;
    }

    public DocumentImpl (String title, Actor author) {
        super (title);
        this.author = author;
    }

    /**
     * Words are counted between punctuation like " ,'.:?;!()[]/{}+=
     * @return The word count of the document's text, if any.
     * -1 if no plain text is available.
     */
    public int getWordCount (Locale locale) {
        int wordCount = -1;
        String textContent = getText (locale);
        if (textContent != null) {
            wordCount = 0;
            StringTokenizer textTokenizer = new StringTokenizer(textContent, " ,'.:?;!()[]/{}+=");
            while (textTokenizer.hasMoreTokens()) {
                textTokenizer.nextToken();
                wordCount++;
            }
        }
        return wordCount;
    }

    /**
     * Get the document plain text, if available.
     * @return A String, or null if not available.
     */
    public String getText (Locale locale) {
        String textContent = (String) getContent(PLAIN_TEXT_CONTENT, locale);
        return textContent;
    }

    public void setText (String text, Locale locale) {
        setContent(PLAIN_TEXT_CONTENT, text, locale);
    }
}
