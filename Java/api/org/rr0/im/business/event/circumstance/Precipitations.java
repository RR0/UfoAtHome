package org.rr0.im.business.event.circumstance;

import org.rr0.im.service.function.classification.Classifiable;
/**
 * 
 *
 * @author Jérôme Beau
 * @version 10 mai 2003 17:04:26
 */
public interface Precipitations extends Classifiable {
    int getMilimeters ();

    /**
     * @return The expected visibility given that Precipitations
     */
    float getVisibility();

    /**
     * @return The expected humidity given that Precipitations
     */
    float getHumidity();
}
