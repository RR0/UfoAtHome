//package org.rr0.im.business.event.circumstance;

/**
 * An interval of time. 
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 18:07:41
 */
export interface Duration
{
    getHour(): number;

    getYears(): number;

    getMonths(): number;

    getWeeks(): number;

    getDays(): number;

    getMinutes(): number;

    getSeconds(): number;

    getMilliseconds(): number;
}
