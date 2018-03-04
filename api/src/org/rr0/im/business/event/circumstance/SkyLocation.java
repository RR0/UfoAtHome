package org.rr0.im.business.event.circumstance;

/**
 * Equatorial coordinates for an "fixed" object on the celestial sphere.
 *
 * @author Jérôme Beau
 * @version 29 mai 2003 20:34:40
 */
public interface SkyLocation extends Location
{
    /**
     * The celestial coordinate of an object corresponding to latitude projected on the sky.
     * Declination (Dec) is measured from -90° (projected south pole) to (projected north pole),
     * with corresponding to the celestial equator.
     */
    float getDeclination();

    /**
     * The azimuthal angle at which the hour circle of a celestial object is located.
     * The rotation axis taken as the direction of the celestial pole.
     * Right ascension (RA) is usually measured in units of time (hours, minutes, and seconds),
     * with one hour of time approximately equal to 15° of arc (360°/24 hours=15°/hour).
     * Because the time for the Earth to complete a rotation relative to the "fixed" stars
     * is slightly shorter than the time to complete a rotation relative to the Sun
     * (a sideral day is 23 h 56 m 4.1 s, whereas a solar day is 24 hours),
     * one hour of right ascension is actually equal to 360°/23.9344...hours= /h.
     * The zero point of right ascension is the first point in Aries,
     * just as the zero point for longitude on the Earth is the prime meridian.
     */
    float getRightAscension();
}
