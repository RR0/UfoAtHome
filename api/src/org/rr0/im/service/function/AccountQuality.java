package org.rr0.im.service.function;

import org.rr0.im.business.report.Account;

/**
 * Account quality computation, indicating the "strength" that a report has for analysis
 * based on how it was acquired.
 *
 * @author Ballester-Guasp (MUFON Spain) for specification. Thanks to Terry Groff for publishing it.
 * @author Jerome Beau for implementation.
 * @version $revision$
 */
public interface AccountQuality extends Function
{
    /**
         * Return the quality index of a given Account
         *
         * @param someAccount The report to check quality for.
         * @return A value between zero and one (percentage).
         */
    double getValue(Account someAccount);
}
