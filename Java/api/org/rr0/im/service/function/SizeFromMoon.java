package org.rr0.im.service.function;

/**
 * Compute the size of a sighted object given :
 * <ul>
 * <li>a estimated relative size of the Moon</li>
 * <li>a estimated distance of the object (or ground distance + angle of elevation)</li>
 * </ul>
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 15:06:39
 */
public interface SizeFromMoon extends Function
{
    double getObjectDistance ();

    void setObjectDistance (double objectDistance);

    double getRelativeLunarSize ();

    /**
     * Usually from 0.2 to 4.0
     * @param relativeLunarSize
     */
    void setRelativeLunarSize (double relativeLunarSize);

    double getGroundDistance ();

    void setGroundDistance (double groundDistance);

    /**
     * The angle of elevation of the object, in degrees.
     * @return
     */
    double getAngleOfElevation ();

    /**
     * Set the angle of elevation of the object, in degrees.
     */
    void setAngleOfElevation (double angleOfElevation);

    double getObjectLength();
}
