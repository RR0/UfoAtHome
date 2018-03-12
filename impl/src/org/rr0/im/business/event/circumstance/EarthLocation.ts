import {TimeZone} from "../../../../../../../../applets/src/org/rr0/ufoathome/TimeZone";
import {Orientation} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/Orientation";
import {Location} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/Location";

/**
 * Equatorial coordinates for a location on the terrestrial sphere.
 */
export class EarthLocationImpl implements Location {
  /**
   * The inclination of a point on a sphere or spheroid from the equator,
   * usually specified in the range -90° (90° S) to (90° N).
   */
  latitude: number;

  longitude: number;
  longitudeOrientation: Orientation;

  /**
   * Get the GMT offset.
   * @return a negative, 0 (GMT) or positive value.
   */
  timeZone: TimeZone;

  /**
   * Return the latitude's orientation,
   *
   * @return Orientation.SOUTH if latitude < 0, Orientation.NORTH otherwise.
   */
  public getLatitudeOrientation(): Orientation {
    return this.latitude < 0 ? Orientation.SOUTH : Orientation.NORTH;
  }

  constructor(latitude: number, latitudeOrientation: Orientation, longitude: number, longitudeOrientation: Orientation) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.longitudeOrientation = longitudeOrientation;
    if (latitudeOrientation == Orientation.SOUTH && latitude > 0) {
      this.latitude = -latitude;
    }
  }
}
