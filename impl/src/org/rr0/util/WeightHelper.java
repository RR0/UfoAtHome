package org.rr0.util;

import java.util.Locale;

/**
 * Utility class to convert weight values.
 *
 * @author Jérôme Beau
 * @version 19 juil. 2003 17:15:02
 */
public class WeightHelper
{
    /**
     * The weight of a Pound, in kilograms.
     */
    public static final double POUND_WEIGHT = 0.45359237;

    public static double getValue (double value, Locale locale) {
        if (locale.getCountry().equals (Locale.UK) || locale.getCountry().equals (Locale.US)) {
            value = toPounds(value);
        }
        else {
            value = toKilograms(value);
        }
        return value;
    }

    /**
     * @param value A weight value, in Pounds
     * @return The value, in kilograms.
     */
    public static double toKilograms (double value) {
        return value * POUND_WEIGHT;
    }

    /**
     * @param value A weight value, in kilograms
     * @return The value, in Pounds.
     */
    public static double toPounds (double value) {
        return value / POUND_WEIGHT;
    }

}
