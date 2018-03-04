package org.rr0.im.service.function;

import java.util.Hashtable;
import java.util.Vector;

/**
 * Account quality computation, indicating the "strength" that a report has for analysis
 * based on how it was acquired.
 *
 * @author Claude Poher (GEPAN) for specification.
 * @author Jerome Beau for implementation.
 * @version $revision$
 */
public interface MatrixFunction extends Function
{
    /**
     */
//    Hashtable getValues(Account someAccount);

    Hashtable getValues(Hashtable answers);

    Hashtable getMatrix();

    Vector getPhenomenons();
}
