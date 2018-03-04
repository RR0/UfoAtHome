package org.rr0.util;

/**
 * @author Jérôme Beau
 * @version 7 mai 2006 17:07:35
 */
public class LocalizerImpl implements Localizer {

    public LocalizerImpl(String[] args) {
    }

    public String getText(String key) {
        return key;
    }
}
