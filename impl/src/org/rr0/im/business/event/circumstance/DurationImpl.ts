import {Duration} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/Duration";
import {PreciseMoment} from "../../../../../../../../api/src/org/rr0/im/business/event/circumstance/PreciseMoment";

/**
 * Duration Reference Implementation.
 */
export class DurationImpl implements Duration {
  private time: number;

  constructor(time: number) {
    this.time = time;
  }

  public getYears(): number {
    return this.getMonths() / 12;
  }

  public getMonths(): number {
    return this.getDays() / 30;
  }

  public getWeeks(): number {
    return this.getDays() / 7;
  }

  public getDays(): number {
    return this.getHours() / 24;
  }

  public getHours(): number {
    return this.getMinutes() / 60;
  }

  public getMinutes(): number {
    return this.getSeconds() / 60;
  }

  public getSeconds(): number {
    return this.time / 1000;
  }

  public getMilliseconds(): number {
    return this.time;
  }

  public static getInstance(beginMoment: PreciseMoment, endMoment: PreciseMoment): Duration {
    const duration = new DurationImpl(endMoment.getTime() - beginMoment.getTime());
    return duration;
  }
}
