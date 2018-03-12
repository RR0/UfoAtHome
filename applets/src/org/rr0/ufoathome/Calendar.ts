import {TimeZone} from "./TimeZone";

/**
 * @deprecated
 */
export class Calendar {
  static YEAR = 1;
  static MONTH = 2;
  static DATE = 5;
  static DAY_OF_MONTH = Calendar.DATE;
  static HOUR = 10;
  static HOUR_OF_DAY = 11;
  static MINUTE = 12;
  static SECOND = 13;
  static MILLISECOND = 14;

  protected time: number;

  static getInstance(timeZone?: TimeZone): Calendar {
    return null;
  }

  get(field: number) {

  }

  getTime(): Date {
    return new Date(this.time);
  }

  setTimeInMillis(time: number) {
    this.time = time;
  }

  set(field: number, value: number) {

  }

  roll(field: number, value: boolean) {

  }

  setTime(time: Date) {

  }

  add(field: number, value: number) {

  }
}