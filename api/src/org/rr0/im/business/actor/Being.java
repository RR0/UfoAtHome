package org.rr0.im.business.actor;

import org.rr0.im.service.function.classification.Classifiable;
import org.rr0.im.business.event.circumstance.Length;
import org.rr0.im.business.event.circumstance.Weight;

import java.util.Locale;

/**
 * A single physical and intelligent being.
 *
 * @author Jerome Beau
 * @version 0.3
 */
public interface Being extends Actor, Classifiable
{
    /**
     * @return The being's height
     * @associates <{org.rr0.im.business.event.circumstance.Length}>
     */
    Length getHeight(Locale locale);

    /**
     * @return The being's weight
     * @associates <{org.rr0.im.business.event.circumstance.Weight}>
     */
    Weight getWeight();
}
