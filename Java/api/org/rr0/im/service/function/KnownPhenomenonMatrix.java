package org.rr0.im.service.function;

import org.rr0.im.business.report.Account;

import java.util.Map;

/**
 * Account quality computation, indicating the "strength" that a report has for analysis
 * based on how it was acquired.
 *
 * @author Claude Poher (GEPAN) for specification.
 * @author Jerome Beau for implementation.
 * @version $revision$
 */
public interface KnownPhenomenonMatrix extends Function
{
    /**
     */
    Map getValues(Account someAccount);
}
