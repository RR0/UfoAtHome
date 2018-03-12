import {Locale} from "../../../../../../../../applets/src/org/rr0/util/Locale";

/**
 * A distance between two locations.
 */
export interface Length {
  /**
   * The distance length in feet for UK and US locales, and in meters for others.
   * @param locale The desired locale
   * @return The distance value, according to the locale
   */
  getValue(locale: Locale): number;

  /**
   * @return The distance value, in meters
   */
  toMeters (): number;

  /**
   * @return The distance value, in feet
   */
  toFeet (): number;
}
