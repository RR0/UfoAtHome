package org.rr0.im.business.event.circumstance;

import java.util.Locale;

/**
 * A length between two locations.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 11:53:46
 */
public interface Length {

    /**
     * The distance length in feet for UK and US locales, and in meters for others.
     * @param locale The desired locale
     * @return The distance value, according to the locale
     */
    double getValue(Locale locale);

    /**
     * @return The distance value, in meters
     */
    double toMeters ();

    /**
     * @return The distance value, in feet
     */
    double toFeet ();
}
