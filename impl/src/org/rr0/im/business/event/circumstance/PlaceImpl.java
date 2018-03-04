package org.rr0.im.business.event.circumstance;

/**
 * A named location.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public class PlaceImpl implements Place {
    /**
     * The name of the place.
     */
    protected String name;

    /**
     * The location of the place
     */
    protected Location location;

    public PlaceImpl(String name) {
        this.name = name;
    }

    public PlaceImpl(String name, Location location) {
        this.location = location;
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public Location getLocation() {
        return location;
    }
}
