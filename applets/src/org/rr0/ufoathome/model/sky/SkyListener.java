package org.rr0.ufoathome.model.sky;

/**
 * @author Jerôme Beau
 * @version 28 janv. 2004 20:15:04
 */
public interface SkyListener {
    void azimutChanged(SkyEvent skyEvent);

    void altitudeChanged(SkyEvent skyEvent);

    void longitudeChanged(SkyEvent skyEvent);

    void latitudeChanged(SkyEvent skyEvent);
}
