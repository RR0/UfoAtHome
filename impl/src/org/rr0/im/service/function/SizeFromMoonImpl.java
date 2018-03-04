package org.rr0.im.service.function;

/**
 * Compute the size of a sighted object given :
 * <ul>
 * <li>a estimated relative size of the Moon</li>
 * <li>a estimated distance of the object (or ground distance + angle of elevation)</li>
 * </ul>
 *
 * @author <a href="mailto:rr0@rr0.org">Jerome Beau</a>
 * @version $revision$
 */
public class SizeFromMoonImpl implements SizeFromMoon
{
    /**
     * In miles
     */
    private static final double LUNAR_DIAMETER_ON_DISTANCE = 2160.0 / 238856.0;    // 0.009043105
    private double relativeLunarSize;
    private double groundDistance;
    private double objectDistance;
    private double angleOfElevation;

    public double getObjectDistance() {
        if (objectDistance <= 0) {
            objectDistance = getGroundDistance() / Math.cos(angleOfElevation);
        }
        return objectDistance;
    }

    public void setObjectDistance(double objectDistance) {
        this.objectDistance = objectDistance;
    }

    public double getRelativeLunarSize() {
        return relativeLunarSize;
    }

    /**
         * Usually from 0.2 to 4.0
         *
         * @param relativeLunarSize
         */
    public void setRelativeLunarSize(double relativeLunarSize) {
        this.relativeLunarSize = relativeLunarSize;
    }

    public double getGroundDistance() {
        return groundDistance;
    }

    public void setGroundDistance(double groundDistance) {
        this.groundDistance = groundDistance;
    }

    /**
         * The angle of elevation of the object, in degrees.
         *
         * @return
         */
    public double getAngleOfElevation() {
        return Math.toDegrees(angleOfElevation);
    }

    /**
     * Set the angle of elevation of the object, in degrees.
     */
    public void setAngleOfElevation(double angleOfElevation) {
        this.angleOfElevation = Math.toRadians(angleOfElevation);
    }

    public double getObjectLength() {
        return LUNAR_DIAMETER_ON_DISTANCE * getObjectDistance() * getRelativeLunarSize();
    }

    public String getName() {
        return "SizeFromMoon";
    }
}
