package org.rr0.im.business.event.circumstance;

import java.util.TimeZone;

/**
 * Equatorial coordinates for a location on the terrestrial sphere.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 11:42:52
 */
public class EarthLocationImpl implements EarthLocation
{
    /**
     * The inclination of a point on a sphere or spheroid from the equator,
     * usually specified in the range -90° (90° S) to (90° N).
     */
    private float latitude;

    private float longitude;
    private Orientation longitudeOrientation;
    private TimeZone timeZone;

    /**
         * Return the latitude's orientation,
         *
         * @return OrientationImpl.SOUTH if latitude < 0, OrientationImpl.NORTH otherwise.
         */
    public Orientation getLatitudeOrientation() {
        return latitude < 0 ? OrientationImpl.SOUTH : OrientationImpl.NORTH;
    }

    public Orientation getLongitudeOrientation() {
        return longitudeOrientation;
    }

    public EarthLocationImpl(float latitude, float longitude, Orientation longitudeOrientation) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.longitudeOrientation = longitudeOrientation;
    }

    public EarthLocationImpl(float longitude, Orientation longitudeOrientation, float latitude, Orientation latitudeOrientation) {
        this.latitude = latitude;
        if (latitudeOrientation == OrientationImpl.SOUTH && latitude > 0) {
            this.latitude = -latitude;
        }
        this.longitude = longitude;
        this.longitudeOrientation = longitudeOrientation;
    }

    public float getLatitude() {
        return latitude;
    }

    public float getLongitude() {
        return longitude;
    }

    /**
     * Get the GMT offset.
     * @return a negative, 0 (GMT) or positive value.
     */
    public TimeZone getTimeZone() {
        return timeZone;
    }
}
