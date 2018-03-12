import {Calendar} from "../../../../../../../../applets/src/org/rr0/ufoathome/Calendar";
import {Moment} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/Moment";
import {Duration} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/Duration";
import {GregorianCalendar} from "../../../../../../../../applets/src/org/rr0/ufoathome/GregorianCalendar";

/**
 * Precise Moment Reference Implementation.
 */
export class PreciseMoment implements Moment {
  protected calendar = new GregorianCalendar();

  constructor(someYear?: number, someMonth?: number, someDay?: number, someHours?: number, someMinutes?: number) {
    this.calendar.set(Calendar.YEAR, someYear);
    this.calendar.set(Calendar.MONTH, someMonth);
    this.calendar.set(Calendar.DAY_OF_MONTH, someDay);
    this.calendar.set(Calendar.HOUR, someHours);
    this.calendar.set(Calendar.MINUTE, someMinutes);
  }

  public PreciseMomentImpl(time: number) {
    this.calendar.setTimeInMillis(time);
  }

  /**
   * Compute a date of a being given the current year and its current age.
   */
  public static yearsAgoInstance(someCurrentYear: number, someAge: number): PreciseMoment {
    const preciseMoment = new PreciseMoment();
    const calendar = preciseMoment.getCalendar();
    calendar.set(Calendar.YEAR, someCurrentYear);
    for (let i = 0; i < someAge; i++) {
      calendar.roll(Calendar.YEAR, false);
    }
    return preciseMoment;
  }

  /**
   * Compute a date of a being given the current year and its current age.
   */
  public static yearsAgoFromNowInstance(someAge: number): PreciseMoment {
    const preciseMoment = new PreciseMoment();
    const calendar = preciseMoment.getCalendar();
    for (let i = 0; i < someAge; i++) {
      calendar.roll(Calendar.YEAR, false);
    }
    return preciseMoment;
  }

  public setTime(time: number) {
    this.calendar.setTime(new Date(time));
  }

  getTime(): number {
    return this.getCalendar().getTime().getTime();
  }

  public getCalendar():Calendar {
    return this.calendar;
  }

  public isBefore(otherMoment: Moment): boolean {
    let isBefore;

    if (otherMoment instanceof PreciseMoment) {
      isBefore = this.getTime() < (<PreciseMoment>otherMoment).getTime();
    }
    else {
      throw new Error("Not implemented");
    }
    return isBefore;
  }

  /**
   * If this moment is chronologically after an other moment
   *
   * @param otherMoment The other moment
   * @return If this moment is after the other one.
   */
  isAfter(otherMoment: Moment): boolean {
    let isAfter;
    if (otherMoment instanceof PreciseMoment) {
      isAfter = this.getTime() > (<PreciseMoment> otherMoment).getTime();
    } else {
      throw new Error("Not implemented");
    }
    return isAfter;
  }

  minus(duration: Duration): PreciseMoment {
    return new PreciseMoment(this.getTime() - duration.getMilliseconds());
  }
}