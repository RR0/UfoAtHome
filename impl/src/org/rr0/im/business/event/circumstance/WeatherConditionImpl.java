package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.*;

/**
 *
 *
 * @author Jérôme Beau
 * @version 18 mai 2003 20:04:05
 */
public class WeatherConditionImpl implements WeatherCondition {
    private Clouds clouds;
    private Temperature temperature;
    private Wind wind;
    private Precipitations precipitations;

    public WeatherConditionImpl(Clouds someClouds, Temperature someTemperature, Wind someWind, Precipitations somePrecipitations) {
        clouds = someClouds;
        temperature = someTemperature;
        wind = someWind;
        precipitations = somePrecipitations;
    }

    public Clouds getClouds() {
        return clouds;
    }

    public Temperature getTemperature() {
        return temperature;
    }

    public Wind getWind() {
        return wind;
    }

    public Precipitations getPrecipitations() {
        return precipitations;
    }
}
