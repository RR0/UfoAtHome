package org.rr0.im.business.event.circumstance;

import java.util.Calendar;

public interface PreciseMoment extends Moment {
    long getTime();

    void setTime(long time);

    Calendar getCalendar();
}
