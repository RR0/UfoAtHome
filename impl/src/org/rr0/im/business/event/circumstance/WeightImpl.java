package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Weight;
import org.rr0.util.WeightHelper;

import java.util.Locale;

/**
 * Weight Reference Implementation.
 *
 * @author Jérôme Beau
 * @version 19 juil. 2003 16:53:46
 */
public class WeightImpl implements Weight
{
    public WeightImpl (double weight) {
        this.weight = weight;
    }

    /**
     * The weight value, in kilograms.
     */
    private double weight;

    /**
     * The weight value in pounds for UK and US locales, and in kilograms for others.
     * @param locale The desired locale
     * @return The weight value, according to the locale
     */
    public double getValue (Locale locale) {
        return WeightHelper.getValue (weight, locale);
    }

    /**
     * @return The weight value, in kilograms.
     */
    public double toKilograms () {
        return weight;
    }

    /**
     * @return The weight value, in pounds.
     */
    public double toPounds () {
        return WeightHelper.toPounds(weight);
    }
}
