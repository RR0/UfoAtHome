/**
 * A named location.
 */
export class Place {
  /**
   * The name of the place.
   */
  name: string;

  /**
   * The location of the place
   */
  location: Location;

  constructor(name: string, location?: Location) {
    this.name = name;
    this.location = location;
  }
}