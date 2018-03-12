export class Orientation  {

  static NORTH = new Orientation("North");
  static NORTH_EAST = new Orientation("NorthEast");
  static EAST = new Orientation("East");
  static SOUTH_EAST = new Orientation("SouthEast");
  static SOUTH = new Orientation("South");
  static SOUTH_WEST = new Orientation("SouthWest");
  static WEST = new Orientation("West");
  static NORTH_WEST = new Orientation("NorthWest");

  constructor(public label: String) {
  }
}
