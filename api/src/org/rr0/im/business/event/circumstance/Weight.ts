/**
 * A weigth.
 */
export interface Weight {
  /**
   * The weight value in pounds for UK and US locales, and in kilograms for others.
   * @param locale The desired locale
   * @return The weight value, according to the locale
   */
  getValue(locale: Locale): number;

  /**
   * @return The weight value, in kilograms.
   */
  toKilograms (): number;

  /**
   * @return The weight value, in pounds.
   */
  toPounds (): number;
}
