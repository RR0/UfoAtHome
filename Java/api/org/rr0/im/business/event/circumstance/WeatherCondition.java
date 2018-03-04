package org.rr0.im.business.event.circumstance;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 10 mai 2003 16:59:55
 */
public interface WeatherCondition {
    /**
     * @associates <{org.rr0.im.business.event.circumstance.Clouds}>
     */
    Clouds getClouds();

    /**
     * @associates <{org.rr0.im.business.event.circumstance.Temperature}>
     */
    Temperature getTemperature();

    /**
     * @associates <{org.rr0.im.business.event.circumstance.Wind}>
     */
    Wind getWind();

    /**
     * @associates <{org.rr0.im.business.event.circumstance.Precipitations}>
     */
    Precipitations getPrecipitations();
}
