package org.rr0.im.business.event.circumstance;

import java.util.Locale;

/**
 * A weigth.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 11:53:46
 */
public interface Weight {

    /**
     * The weight value in pounds for UK and US locales, and in kilograms for others.
     * @param locale The desired locale
     * @return The weight value, according to the locale
     */
    double getValue(Locale locale);

    /**
     * @return The weight value, in kilograms.
     */
    double toKilograms ();

    /**
     * @return The weight value, in pounds.
     */
    double toPounds ();
}
