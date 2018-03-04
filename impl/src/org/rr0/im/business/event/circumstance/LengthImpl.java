package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Length;
import org.rr0.util.LengthHelper;

import java.util.Locale;

/**
 * Length Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 21:04:44
 */
public class LengthImpl implements Length {

    public static Length UNKNOWN = new LengthImpl(-1);

    /**
     * The length, in meters.
     */
    private double length;

    public LengthImpl(double someLength) {
        length = someLength;
    }

    /**
     * @param locale The desired locale
     * @return The distance value, according to the locale
     */
    public double getValue (Locale locale) {
        double value = LengthHelper.getValue(length, locale);
        return value;
    }

    /**
     * @return The distance value, in meters
     */
    public double toMeters () {
        return length;
    }

    /**
     * @return The distance value, in feet
     */
    public double toFeet () {
        return LengthHelper.toFeet(length);
    }
}
