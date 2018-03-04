package org.rr0.im.business.event.circumstance;

/**
 * A well-known and named location.
 * Example of Place are cities, addresses.
 *
 * @author Jérôme Beau
 * @version 21 avr. 2003 16:28:16
 */
public interface Place {

    String getName ();

    /**
     * @associates <{org.rr0.im.business.event.circumstance.Location}>
     * @supplierRole location
     */
    Location getLocation();

    Place UNKNOWN = new Place() {
        public String getName() {
            return "Unknown place";
        }

        public Location getLocation() {
            return Location.UNKNOWN;
        }
    };
}
