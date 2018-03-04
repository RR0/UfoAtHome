package org.rr0.im.business.event.circumstance;

import org.omg.CORBA.UNKNOWN;

/**
 * An interval of time. 
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 18:07:41
 */
public interface Duration
{
    double getHours ();

    double getYears();

    double getMonths();

    double getWeeks();

    double getDays();

    long getMinutes();

    long getSeconds();

    long getMilliseconds();
}
