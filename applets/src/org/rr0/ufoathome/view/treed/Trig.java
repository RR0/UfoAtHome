package org.rr0.ufoathome.view.treed;

class Trig
{
    static final float radiansPerDegree = (float) (Math.PI / 180);

    static float sin(float a)
    {
        return (float) Math.sin(a * radiansPerDegree);
    }

    static float cos(float a)
    {
        return (float) Math.cos(a * radiansPerDegree);
    }

}
