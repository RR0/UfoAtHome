package org.rr0.im.business.event.circumstance;

import java.util.TimeZone;

/**
 * Equatorial coordinates for a location on the terrestrial sphere.
 *
 * @author Jérôme Beau
 * @version 29 mai 2003 20:34:40
 */
public interface EarthLocation extends Location
{
    /**
     * The inclination of a point on a sphere or spheroid from the equator,
     * usually specified in the range -90° (90° S) to (90° N).
     */
    float getLatitude();

    float getLongitude();

    /**
     * Get the GMT offset.
     * @return a negative, 0 (GMT) or positive value.
     */
    TimeZone getTimeZone();
}
