package org.rr0.im.business.event.circumstance;

/**
 * 
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 20:42:52
 */
public class OrientationImpl implements Orientation {

    public static Orientation NORTH = new OrientationImpl("North");
    public static Orientation NORTH_EAST = new OrientationImpl("NorthEast");
    public static Orientation EAST = new OrientationImpl("East");
    public static Orientation SOUTH_EAST = new OrientationImpl("SouthEast");
    public static Orientation SOUTH = new OrientationImpl("South");
    public static Orientation SOUTH_WEST = new OrientationImpl("SouthWest");
    public static Orientation WEST = new OrientationImpl("West");
    public static Orientation NORTH_WEST = new OrientationImpl("NorthWest");

    public String getLabel () {
        return label;
    }

    private String label;

    public OrientationImpl(String someLabel) {
        label = someLabel;
    }
}
