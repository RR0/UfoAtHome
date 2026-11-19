/** The words of the panel that says what was around the observer (see AroundPanel, Around). */
export interface AroundMessages {
  /** The section's title. */
  title: string
  /** What the section is for, in a (?). */
  hint: string
  /** The heading of what was there at once. */
  counted: string
  cars: string
  trucks: string
  people: string
  /** How many of those people were talking. */
  talking: string
  /** The radius they were counted within. */
  within: string
  /** The heading of the roads. */
  roads: string
  /** A road's distance. */
  roadDistance: string
  vehiclesPerMinute: string
  /** Of the vehicles a minute, the trucks. */
  trucksPerMinute: string
  speed: string
  /** The unit after a count a minute. */
  perMinute: string
  addRoad: string
  removeRoad: string
  /** What it sounds like where the observer stands: `{level}` is a figure in dB(A). */
  heard: string
  /** Nothing said that makes a noise. */
  quiet: string
}
