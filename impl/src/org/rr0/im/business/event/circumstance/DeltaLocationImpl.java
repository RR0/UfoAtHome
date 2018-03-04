package org.rr0.im.business.event.circumstance;

import org.rr0.im.business.event.circumstance.Location;
import org.rr0.im.business.event.circumstance.Orientation;
import org.rr0.im.business.event.circumstance.Length;


/**
 * A location relative to another one.
 *
 * @author Jérôme Beau
 * @version 4 mai 2003 11:51:59
 */
public class DeltaLocationImpl implements Location {
    private Location fromLocation;
    private Orientation fromOrientation;
    private Length fromDistance;

    public DeltaLocationImpl(Location someFromLocation, Orientation someFromOrientation, Length someFromDistance) {
        fromLocation = someFromLocation;
        fromOrientation = someFromOrientation;
        fromDistance = someFromDistance;
    }
}
