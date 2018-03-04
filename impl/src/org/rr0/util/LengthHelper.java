package org.rr0.util;

import java.util.Locale;

/**
 * Utility class to convert lengths.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 21:04:44
 */
public class LengthHelper  {

    /**
     * The length of a UK/US foot
     */
    private static final double FOOT_LENGTH = 0.3048;

    /**
     * @param locale The desired locale
     * @return The distance value, according to the locale
     */
    public static double getValue (double value, Locale locale) {
        if (locale.getCountry().equals (Locale.UK) || locale.getCountry().equals (Locale.US)) {
            value = toFeet(value);
        }
        else {
            value = toMeters(value);
        }
        return value;
    }

    /**
     * @param value A length value, in feet
     * @return The distance value, in meters
     */
    public static double toMeters (double value) {
        return value * FOOT_LENGTH;
    }

    /**
     * @param value A length value, in meters.
     * @return The distance value, in feet
     */
    public static double toFeet (double value) {
        return value / FOOT_LENGTH;
    }
}
