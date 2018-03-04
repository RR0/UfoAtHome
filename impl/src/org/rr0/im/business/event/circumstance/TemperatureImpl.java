package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Temperature;
import org.rr0.im.service.function.classification.Category;
import org.rr0.im.service.function.classification.Classification;

import java.util.Locale;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 11 mai 2003 16:14:56
 */
public class TemperatureImpl implements Temperature {
    public static final int CELCIUS = 1;
    public static final int FARENHEIT = 2;
    private float celcius;

    public float getCelcius () {
        return celcius;
    }

    public float getFarenheit () {
        return celciusToFarenheit(celcius);
    }

    public TemperatureImpl(float someValue) {
        this (someValue, CELCIUS);
    }

    public TemperatureImpl(float someValue, int someUnit) {
        if (someUnit == CELCIUS) {
            celcius = someValue;
        }
        else
            if (someUnit == FARENHEIT) {
                celcius = farenheitToCelcius (someValue);
            }
            else
                throw new RuntimeException("Unsupported temperature unit");
    }

    public static float farenheitToCelcius (float someValue) {
        return 5 * (someValue - 32) / 9;
    }

    public static float celciusToFarenheit (float celcius) {
        return (9 * celcius / 5 + 32);
    }

    public String toString (Locale someLocale) {
        String displayString;
        if (someLocale == Locale.ENGLISH) {
            displayString = Float.toString (celciusToFarenheit (celcius)) + " F°";
        }
        else {
            displayString = Float.toString(celcius) + "C°";
        }
        return displayString;
    }

    public Category getForcedCategory (Classification classification) {
        return null;
    }
}
