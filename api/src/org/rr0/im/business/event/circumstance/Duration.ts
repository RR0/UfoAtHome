/**
 * An interval of time.
 */
export interface Duration {
  getHours(): number;

  getYears(): number;

  getMonths(): number;

  getWeeks(): number;

  getDays(): number;

  getMinutes(): number;

  getSeconds(): number;

  getMilliseconds(): number;
}
