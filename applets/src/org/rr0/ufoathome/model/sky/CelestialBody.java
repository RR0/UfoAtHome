package org.rr0.ufoathome.model.sky;

/**
 * The model for a star to be displayed in the sky.
 */
class CelestialBody {
    CelestialBody(String aName, double ra1, double ra2, double ra3, int sign, double dec1, double dec2, double dec3, double someMagnitudeMin, double someMagnitudeMax) {
        name = aName;
        currentAlpha = alpha = ((ra1 + ra2 / 60D + ra3 / 3600D) * Math.PI) / 12D;
        currentDelta = delta = ((double) sign * (dec1 + dec2 / 60D + dec3 / 3600D) * Math.PI) / 180D;
        vect = new double[3];
        vect[0] = Math.cos(currentDelta) * Math.cos(currentAlpha);
        vect[1] = Math.cos(currentDelta) * Math.sin(currentAlpha);
        vect[2] = Math.sin(currentDelta);
        magnitudeMax = someMagnitudeMax;
        magnitudeMin = someMagnitudeMin;
    }

    public double[] getCoordinates() {
        return vect;
    }

    public String getName() {
        return name;
    }

    public void setCurrentDelta(double currentDelta) {
        this.currentDelta = currentDelta;
    }

    public double getRightAscension() {
        return alpha;
    }

    public void setCurrentAlpha(double currentAlpha) {
        this.currentAlpha = currentAlpha;
    }

    public double getMagnitudeMax() {
        return magnitudeMax;
    }

    public double getDeclination() {
        return delta;
    }

    private String name;
    private double alpha;
    private double delta;
    protected double currentAlpha;
    protected double currentDelta;
    protected double vect[];
    private double magnitudeMin;
    private double magnitudeMax;
}
